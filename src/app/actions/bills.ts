
'use server';

import db from '@/lib/db';
import * as z from 'zod';
import { revalidatePath } from 'next/cache';
import type { RowDataPacket, OkPacket } from 'mysql2';

interface Bill {
    id: number;
    userId: number;
    invoiceNumber: string;
    clientName: string;
    clientAddress: string;
    clientPhone: string;
    clientPanNumber: string | null;
    billDate: Date;
    dueDate: Date;
    discount: number;
    status: string; // e.g., 'Pending', 'Paid'
    createdAt: Date;
    updatedAt: Date;
    items?: BillItem[];
}

interface BillItem {
    id: number;
    billId: number;
    description: string;
    quantity: number;
    unit: string;
    rate: number;
    createdAt: Date;
    updatedAt: Date;
}


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

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [lastBillRows] = await connection.query<RowDataPacket[]>(
            'SELECT `invoiceNumber` FROM `Bill` ORDER BY `id` DESC LIMIT 1'
        );

        let invoiceNumber: string;
        if (lastBillRows.length > 0 && lastBillRows[0].invoiceNumber.startsWith('HG')) {
            const lastNum = parseInt(lastBillRows[0].invoiceNumber.substring(2), 10);
            invoiceNumber = `HG${String(lastNum + 1).padStart(4, '0')}`;
        } else {
            invoiceNumber = 'HG0100';
        }

        const [billResult] = await connection.query<OkPacket>(
            'INSERT INTO `Bill` (`clientName`, `clientAddress`, `clientPhone`, `clientPanNumber`, `billDate`, `dueDate`, `discount`, `status`, `userId`, `invoiceNumber`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [billDetails.clientName, billDetails.clientAddress, billDetails.clientPhone, panNumber, billDetails.billDate, billDetails.dueDate, finalDiscount, 'Pending', userId, invoiceNumber]
        );
        const newBillId = billResult.insertId;

        if (!newBillId) {
            throw new Error("Failed to create bill.");
        }

        const billItemsData = items.map(item => [
            newBillId,
            item.description,
            item.quantity,
            item.unit,
            item.rate
        ]);

        await connection.query(
            'INSERT INTO `BillItem` (`billId`, `description`, `quantity`, `unit`, `rate`) VALUES ?',
            [billItemsData]
        );

        await connection.commit();
        
        revalidatePath('/dashboard/bills');
        revalidatePath('/dashboard');

        const pdfDataResponse = await getBillDetails(newBillId);

        if (pdfDataResponse.error) {
             return { error: pdfDataResponse.error };
        }
        
        return { 
            success: "Bill saved successfully!",
            data: pdfDataResponse.data
        };
    } catch (error) {
        await connection.rollback();
        console.error("Failed to create bill:", error);
        return { error: "Database Error: Failed to create bill." };
    } finally {
        connection.release();
    }
}

const updateBillFormSchema = billFormSchema.extend({
  billId: z.number(),
});

export type UpdateBillFormValues = z.infer<typeof updateBillFormSchema>;

export const updateBill = async (values: UpdateBillFormValues): Promise<{ success?: string; error?: string; }> => {
    const validatedFields = updateBillFormSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: "Invalid fields!" };
    }

    const {
        billId,
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

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [updateResult] = await connection.query<OkPacket>(
            'UPDATE `Bill` SET `clientName` = ?, `clientAddress` = ?, `clientPhone` = ?, `clientPanNumber` = ?, `billDate` = ?, `dueDate` = ?, `discount` = ? WHERE `id` = ? AND `userId` = ?',
            [billDetails.clientName, billDetails.clientAddress, billDetails.clientPhone, panNumber, billDetails.billDate, billDetails.dueDate, finalDiscount, billId, userId]
        );

        if (updateResult.affectedRows === 0) {
            throw new Error("Bill not found or user not authorized to update.");
        }
        
        await connection.query('DELETE FROM `BillItem` WHERE `billId` = ?', [billId]);

        if (items.length > 0) {
            const billItemsData = items.map(item => [
                billId,
                item.description,
                item.quantity,
                item.unit,
                item.rate
            ]);
            await connection.query(
                'INSERT INTO `BillItem` (`billId`, `description`, `quantity`, `unit`, `rate`) VALUES ?',
                [billItemsData]
            );
        }

        await connection.commit();
        
        revalidatePath(`/dashboard/bills/${billId}`);
        revalidatePath('/dashboard/bills');
        revalidatePath('/dashboard');
        
        return { success: "Bill updated successfully!" };

    } catch (error) {
        await connection.rollback();
        console.error("Failed to update bill:", error);
        return { error: "Database Error: Failed to update bill." };
    } finally {
        connection.release();
    }
}


export const getNextInvoiceNumber = async (): Promise<string> => {
    try {
        const [lastBillRows] = await db.query<RowDataPacket[]>(
            'SELECT `invoiceNumber` FROM `Bill` ORDER BY `id` DESC LIMIT 1'
        );

        if (lastBillRows.length > 0 && lastBillRows[0].invoiceNumber.startsWith('HG')) {
            const lastNum = parseInt(lastBillRows[0].invoiceNumber.substring(2), 10);
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
        const [bills] = await db.query<RowDataPacket[]>('SELECT * FROM `Bill` ORDER BY `createdAt` DESC');
        const billsData = bills as Bill[];

        if (billsData.length === 0) {
            return { success: true, data: [] };
        }

        const billIds = billsData.map(b => b.id);
        const [items] = await db.query<RowDataPacket[]>('SELECT * FROM `BillItem` WHERE `billId` IN (?)', [billIds]);
        const itemsData = items as BillItem[];

        const itemsByBillId = itemsData.reduce((acc, item) => {
            (acc[item.billId] = acc[item.billId] || []).push(item);
            return acc;
        }, {} as Record<number, BillItem[]>);

        const billsWithTotals = billsData.map(bill => {
            const billItems = itemsByBillId[bill.id] || [];
            const subtotal = billItems.reduce((acc, item) => acc + item.quantity * item.rate, 0);
            const subtotalAfterDiscount = subtotal - bill.discount;
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
        const [billRows] = await db.query<RowDataPacket[]>('SELECT * FROM `Bill` WHERE `id` = ?', [billId]);
        
        if (billRows.length === 0) {
            return { error: "Bill not found." };
        }
        
        const bill = billRows[0] as Bill;

        const [itemRows] = await db.query<RowDataPacket[]>('SELECT * FROM `BillItem` WHERE `billId` = ?', [billId]);
        bill.items = itemRows as BillItem[];

        const [companyRows] = await db.query<RowDataPacket[]>('SELECT * FROM `Company` WHERE `userId` = ?', [bill.userId]);
        const company = companyRows[0] || {};

        const subtotal = bill.items.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
        const subtotalAfterDiscount = subtotal - bill.discount;
        const vat = subtotalAfterDiscount * 0.13;
        const total = subtotalAfterDiscount + vat;

        const totals = { 
            subtotal, 
            discount: bill.discount, 
            subtotalAfterDiscount, 
            vat, 
            total,
            appliedDiscountLabel: 'Discount' 
        };

        return { 
            success: true,
            data: { bill, company, totals } 
        };

    } catch (error) {
        console.error(`Failed to get bill data for PDF (ID: ${billId}):`, error);
        return { error: "Database Error: Failed to retrieve bill data." };
    }
}

export const getDashboardData = async () => {
    try {
        const [allBills] = await db.query<RowDataPacket[]>(`
            SELECT b.*,
                   (SELECT SUM(bi.quantity * bi.rate) FROM BillItem bi WHERE bi.billId = b.id) as subtotal
            FROM Bill b
            ORDER BY b.createdAt DESC
        `);
        
        const bills = allBills as (Bill & { subtotal: number | null })[];

        let totalRevenue = 0;
        
        const processedBills = bills.map(bill => {
            const subtotal = bill.subtotal || 0;
            const subtotalAfterDiscount = subtotal - bill.discount;
            const vat = subtotalAfterDiscount * 0.13;
            const total = subtotalAfterDiscount + vat;
            totalRevenue += total;

            return { ...bill, amount: total };
        });

        const totalBills = processedBills.length;
        const paidBills = processedBills.filter(b => b.status === 'Paid').length;
        const dueBills = totalBills - paidBills;

        const recentBills = processedBills.slice(0, 5);
        
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
        await db.query('UPDATE `Bill` SET `status` = ? WHERE `id` = ?', [status, billId]);
        
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
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query('DELETE FROM `BillItem` WHERE `billId` = ?', [billId]);
        await connection.query('DELETE FROM `Bill` WHERE `id` = ?', [billId]);
        await connection.commit();

        revalidatePath('/dashboard/bills');
        revalidatePath('/dashboard');
        
        return { success: "Bill deleted successfully." };
    } catch (error) {
        await connection.rollback();
        console.error(`Failed to delete bill ${billId}:`, error);
        return { error: "Database Error: Failed to delete bill." };
    } finally {
        connection.release();
    }
};
