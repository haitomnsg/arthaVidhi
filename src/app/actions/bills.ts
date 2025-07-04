
'use server';

import prisma from '@/lib/db';
import * as z from 'zod';
import type { BillItem } from '@prisma/client';

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

// Helper function to calculate totals from plain number inputs
const calculateBillTotals = (items: { quantity: number; rate: number }[], discount: number, discountType: 'percentage' | 'amount', discountPercentage: number) => {
    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
    
    let finalDiscount = 0;
    let appliedDiscountLabel = 'Discount';

    if (discountType === 'percentage') {
        const percentage = discountPercentage || 0;
        finalDiscount = subtotal * (percentage / 100);
        if (percentage > 0) {
            appliedDiscountLabel = `Discount (${percentage}%)`;
        }
    } else {
        finalDiscount = discount || 0;
    }

    const subtotalAfterDiscount = subtotal - finalDiscount;
    const vat = subtotalAfterDiscount * 0.13;
    const total = subtotalAfterDiscount + vat;
    return { subtotal, discount: finalDiscount, subtotalAfterDiscount, vat, total, appliedDiscountLabel };
};


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

    // --- Server-side calculations from validated data ---
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
                    discount: finalDiscount, // Store the calculated final discount
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

            // Fetch the newly created bill with its items to return
            return tx.bill.findUnique({
                where: { id: createdBill.id },
                include: { items: true }
            });
        });
        
        if (!newBill) {
            return { error: "Failed to retrieve the created bill after saving." };
        }

        // Use the getBillForPdf logic to prepare data for the client
        const pdfDataResponse = await getBillForPdf(newBill.id);

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
        return 'HG-ERROR'; // Return a fallback
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


export const getBillForPdf = async (billId: number): Promise<{ success?: boolean; error?: string; data?: any; }> => {
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

        // Convert Prisma Decimal fields to numbers for client-side compatibility
        const plainItems = bill.items.map(item => ({
            ...item,
            quantity: item.quantity.toNumber(),
            rate: item.rate.toNumber(),
        }));
        
        const discount = bill.discount.toNumber();
        
        // We don't know if it was percentage or amount, so we can't reliably reconstruct the exact label.
        // We'll use a generic "Discount" label for the PDF.
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
            // When fetching an existing bill, we don't have the original discount type,
            // so we provide a generic label for the PDF.
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
