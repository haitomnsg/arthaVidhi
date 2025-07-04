
'use server';

import prisma from '@/lib/db';
import * as z from 'zod';
import type { BillItem } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const billItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unit: z.string().min(1, "Unit is required."),
  rate: z.coerce.number().min(0, "Rate must be a positive number"),
});

const billFormSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  clientAddress: z.string().min(1, "Client address is required"),
  clientPhone: z.string().min(1, "Client phone is required"),
  panNumber: z.string().optional(),
  billDate: z.date(),
  dueDate: z.date(),
  items: z.array(billItemSchema).min(1, "At least one item is required"),
  discountType: z.enum(['percentage', 'amount']),
  discountPercentage: z.coerce.number().min(0).max(100).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
});

type BillFormValues = z.infer<typeof billFormSchema>;

export const createBill = async (values: BillFormValues): Promise<{ success?: string; error?: string; data?: any; }> => {
    const validatedFields = billFormSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: "Invalid fields!" };
    }

    const {
        items,
        discountType,
        discountPercentage,
        discountAmount,
        panNumber,
        ...billDetails
    } = validatedFields.data;

    const userId = 1;

    const subtotalForDiscount = items.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
    let finalDiscount = 0;
    if (discountType === 'percentage') {
        finalDiscount = subtotalForDiscount * ((discountPercentage || 0) / 100);
    } else {
        finalDiscount = discountAmount || 0;
    }

    try {
        const newBill = await prisma.$transaction(async (tx) => {
            const lastBill = await tx.bill.findFirst({
                orderBy: { id: 'desc' }
            });

            let invoiceNumber: string;
            if (lastBill && lastBill.invoiceNumber.startsWith('HG')) {
                const lastNum = parseInt(lastBill.invoiceNumber.substring(2), 10);
                invoiceNumber = `HG${String(lastNum + 1).padStart(4, '0')}`;
            } else {
                invoiceNumber = 'HG0100';
            }

            const createdBill = await tx.bill.create({
                data: {
                    ...billDetails,
                    clientPanNumber: panNumber,
                    invoiceNumber,
                    discount: finalDiscount,
                    status: 'Pending',
                    userId: userId,
                }
            });

            const billItemsData = items.map(item => ({
                ...item,
                billId: createdBill.id
            }));

            await tx.billItem.createMany({
                data: billItemsData
            });

            return createdBill.id;
        });
        
        if (!newBill) {
            return { error: "Failed to retrieve the created bill after saving." };
        }
        
        revalidatePath('/dashboard/bills');
        revalidatePath('/dashboard');

        const pdfDataResponse = await getBillDetails(newBill);

        if (pdfDataResponse.error) {
             return { error: pdfDataResponse.error };
        }
        
        return { 
            success: "Bill saved successfully!",
            data: pdfDataResponse.data
        };
    } catch (error) {
        console.error("Failed to create bill:", error);
        return { error: "Database Error: Failed to create bill." };
    }
}

export const getNextInvoiceNumber = async (): Promise<string> => {
    try {
        const lastBill = await prisma.bill.findFirst({
            orderBy: { id: 'desc' },
            select: { invoiceNumber: true }
        });

        if (lastBill && lastBill.invoiceNumber.startsWith('HG')) {
            const lastNum = parseInt(lastBill.invoiceNumber.substring(2), 10);
            return `HG${String(lastNum + 1).padStart(4, '0')}`;
        } else {
            return 'HG0100';
        }
    } catch (error) {
        console.error("Failed to fetch next invoice number:", error);
        return 'HG-ERROR';
    }
};

export const getAllBills = async () => {
    try {
        const bills = await prisma.bill.findMany({
            include: {
                items: {
                    select: {
                        quantity: true,
                        rate: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        const billsWithTotals = bills.map(bill => {
            const plainItems = bill.items.map(i => ({
                quantity: i.quantity.toNumber(),
                rate: i.rate.toNumber(),
            }));
            const discount = bill.discount.toNumber();
            
            const subtotal = plainItems.reduce((acc, item) => acc + item.quantity * item.rate, 0);
            const subtotalAfterDiscount = subtotal - discount;
            const vat = subtotalAfterDiscount * 0.13;
            const total = subtotalAfterDiscount + vat;

            return {
                id: bill.id,
                invoiceNumber: bill.invoiceNumber,
                clientName: bill.clientName,
                clientPhone: bill.clientPhone,
                billDate: bill.billDate,
                status: bill.status,
                amount: total,
            };
        });

        return { success: true, data: billsWithTotals };
    } catch (error) {
        console.error("Failed to fetch bills:", error);
        return { success: false, error: "Database Error: Failed to fetch bills." };
    }
};


export const getBillDetails = async (billId: number): Promise<{ success?: boolean; error?: string; data?: any; }> => {
    try {
        const bill = await prisma.bill.findUnique({
            where: { id: billId },
            include: { items: true },
        });

        if (!bill) {
            return { error: "Bill not found." };
        }

        const company = await prisma.company.findUnique({
            where: { userId: bill.userId },
        });

        const plainItems = bill.items.map(item => ({
            ...item,
            quantity: item.quantity.toNumber(),
            rate: item.rate.toNumber(),
            id: item.id,
            billId: item.billId,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt
        }));
        
        const discount = bill.discount.toNumber();
        
        const subtotal = plainItems.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
        const subtotalAfterDiscount = subtotal - discount;
        const vat = subtotalAfterDiscount * 0.13;
        const total = subtotalAfterDiscount + vat;

        const totals = { 
            subtotal, 
            discount, 
            subtotalAfterDiscount, 
            vat, 
            total,
            appliedDiscountLabel: 'Discount' 
        };

        const plainBill = {
            ...bill,
            discount: discount,
            items: plainItems,
        };

        return { 
            success: true,
            data: { bill: plainBill, company: company || {}, totals } 
        };

    } catch (error) {
        console.error(`Failed to get bill data for PDF (ID: ${billId}):`, error);
        return { error: "Database Error: Failed to retrieve bill data." };
    }
}

export const getDashboardData = async () => {
    try {
        const billsFromDb = await prisma.bill.findMany({
            include: {
                items: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        let totalRevenue = 0;
        
        const plainBills = billsFromDb.map(bill => {
            const plainItems = bill.items.map(item => ({
                ...item,
                quantity: item.quantity.toNumber(),
                rate: item.rate.toNumber(),
            }));

            const subtotal = plainItems.reduce((acc, item) => acc + item.quantity * item.rate, 0);
            const discount = bill.discount.toNumber();
            const subtotalAfterDiscount = subtotal - discount;
            const vat = subtotalAfterDiscount * 0.13;
            const total = subtotalAfterDiscount + vat;
            totalRevenue += total;

            return {
                ...bill,
                id: bill.id,
                invoiceNumber: bill.invoiceNumber,
                clientName: bill.clientName,
                clientPhone: bill.clientPhone,
                billDate: bill.billDate,
                status: bill.status,
                items: plainItems,
                discount: discount,
                amount: total,
            };
        });

        const totalBills = plainBills.length;
        const paidBills = plainBills.filter(b => b.status === 'Paid').length;
        const dueBills = totalBills - paidBills;

        const recentBills = plainBills.slice(0, 5);
        
        const stats = {
            totalRevenue,
            totalBills,
            paidBills,
            dueBills
        };
        
        return { success: true, stats, recentBills };

    } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        return { 
            success: false, 
            error: "Database Error: Failed to fetch dashboard data.",
            stats: { totalRevenue: 0, totalBills: 0, paidBills: 0, dueBills: 0 },
            recentBills: []
        };
    }
};


export const updateBillStatus = async (billId: number, status: string): Promise<{ success?: string; error?: string; }> => {
    const validStatuses = ['Pending', 'Paid', 'Overdue'];
    if (!validStatuses.includes(status)) {
        return { error: "Invalid status provided." };
    }

    try {
        await prisma.bill.update({
            where: { id: billId },
            data: { status: status }
        });

        revalidatePath(`/dashboard/bills/${billId}`);
        revalidatePath('/dashboard/bills');
        revalidatePath('/dashboard');

        return { success: "Bill status updated successfully." };
    } catch (error) {
        console.error(`Failed to update status for bill ${billId}:`, error);
        return { error: "Database Error: Failed to update bill status." };
    }
};

export const deleteBill = async (billId: number): Promise<{ success?: string; error?: string; }> => {
    try {
        await prisma.$transaction(async (tx) => {
            await tx.billItem.deleteMany({
                where: { billId: billId }
            });
            await tx.bill.delete({
                where: { id: billId }
            });
        });

        revalidatePath('/dashboard/bills');
        revalidatePath('/dashboard');
        
        return { success: "Bill deleted successfully." };
    } catch (error) {
        console.error(`Failed to delete bill ${billId}:`, error);
        return { error: "Database Error: Failed to delete bill." };
    }
};
