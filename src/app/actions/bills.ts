'use server';

import prisma from '@/lib/db';
import * as z from 'zod';
import type { Company } from '@prisma/client';

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

// Define a type for the data package that will be sent to the client.
// This ensures all data is serializable (e.g., no Decimal types).
export interface BillPDFData {
    bill: {
        invoiceNumber: string;
        clientName: string;
        clientAddress: string;
        clientPhone: string;
        clientPanNumber: string | null;
        billDate: Date;
        dueDate: Date;
        items: {
            description: string;
            quantity: number;
            unit: string;
            rate: number;
        }[];
    };
    company: Company;
    subtotal: number;
    discount: number;
    subtotalAfterDiscount: number;
    vat: number;
    total: number;
    appliedDiscountLabel: string;
}


export const createBill = async (values: BillFormValues): Promise<{ success?: string; error?: string; data?: BillPDFData }> => {
    const validatedFields = billFormSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: "Invalid fields!" };
    }

    const {
        items,
        discountType,
        discountPercentage,
        discountAmount,
        ...billDetails
    } = validatedFields.data;

    const userId = 1;

    // --- Server-side calculations ---
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
        finalDiscount = discountAmount || 0;
    }

    const subtotalAfterDiscount = subtotal - finalDiscount;
    const vat = subtotalAfterDiscount * 0.13;
    const total = subtotalAfterDiscount + vat;

    try {
        // Use a transaction to ensure atomicity
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
                    clientPanNumber: billDetails.panNumber,
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

            return { ...createdBill, items: billItemsData };
        });

        // Fetch company details
        const companyDetails = await prisma.company.findUnique({
            where: { userId },
        });

        const safeCompanyDetails = companyDetails || {
            id: 0, userId, name: "Your Company Name", address: "123 Business Rd, Kathmandu",
            phone: "9876543210", email: "contact@company.com", panNumber: "123456789",
            vatNumber: "987654321", createdAt: new Date(), updatedAt: new Date(),
        };

        // Assemble the final data package for the client
        const pdfData: BillPDFData = {
            bill: {
                invoiceNumber: newBill.invoiceNumber,
                clientName: billDetails.clientName,
                clientAddress: billDetails.clientAddress,
                clientPhone: billDetails.clientPhone,
                clientPanNumber: billDetails.panNumber || null,
                billDate: billDetails.billDate,
                dueDate: billDetails.dueDate,
                items: items,
            },
            company: safeCompanyDetails,
            subtotal,
            discount: finalDiscount,
            subtotalAfterDiscount,
            vat,
            total,
            appliedDiscountLabel,
        };

        return { success: "Bill created successfully!", data: pdfData };
    } catch (error) {
        console.error("Failed to create bill:", error);
        return { error: "Database Error: Failed to create bill." };
    }
}
