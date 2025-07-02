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

export const createBill = async (values: BillFormValues) => {
    const validatedFields = billFormSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: "Invalid fields!" };
    }

    const {
        clientName,
        clientAddress,
        clientPhone,
        panNumber,
        billDate,
        dueDate,
        items,
        discountType,
        discountPercentage,
        discountAmount,
    } = validatedFields.data;

    // TODO: This is a placeholder. We need to implement session management
    // to get the ID of the currently logged-in user.
    const userId = 1;
    
    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
    
    let finalDiscount = 0;
    if (discountType === 'percentage') {
        finalDiscount = subtotal * ((discountPercentage || 0) / 100);
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
                    invoiceNumber,
                    clientName,
                    clientAddress,
                    clientPhone,
                    clientPanNumber: panNumber,
                    billDate,
                    dueDate,
                    discount: finalDiscount,
                    status: 'Pending', // Default status
                    user: {
                        connect: { id: userId }
                    }
                }
            });

            const billItems = items.map(item => ({
                ...item,
                billId: createdBill.id
            }));

            await tx.billItem.createMany({
                data: billItems
            });

            return createdBill;
        });

        const serializableBill = {
            ...newBill,
            discount: newBill.discount.toNumber(),
        };


        return { success: "Bill created successfully!", bill: serializableBill };
    } catch (error) {
        console.error("Failed to create bill:", error);
        return { error: "Database Error: Failed to create bill." };
    }
}
