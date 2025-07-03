'use server';

import prisma from '@/lib/db';
import * as z from 'zod';

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

export const createBill = async (values: BillFormValues): Promise<{ success?: string; error?: string; }> => {
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

    // --- Server-side calculations ---
    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
    
    let finalDiscount = 0;
    if (discountType === 'percentage') {
        const percentage = discountPercentage || 0;
        finalDiscount = subtotal * (percentage / 100);
    } else {
        finalDiscount = discountAmount || 0;
    }

    try {
        await prisma.$transaction(async (tx) => {
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
        });

        return { success: "Bill saved successfully!" };
    } catch (error) {
        console.error("Failed to create bill:", error);
        return { error: "Database Error: Failed to create bill." };
    }
}
