'use server';

import db from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

interface Company {
    id: number;
    userId: number;
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    panNumber: string | null;
    vatNumber: string | null;
}

export const getCompanyDetails = async (): Promise<Partial<Company>> => {
    // TODO: Replace with authenticated user ID from session
    const userId = 1;

    try {
        const [companyRows] = await db.query<RowDataPacket[]>('SELECT * FROM `Company` WHERE `userId` = ?', [userId]);
        const company = (companyRows[0] as Company) || null;

        // Return real data or a default object to avoid breaking the UI
        return company || {
            name: "Your Company Name",
            address: "123 Business Rd, Kathmandu",
            phone: "9876543210",
            email: "contact@company.com",
            panNumber: "123456789",
            vatNumber: "987654321",
        };
    } catch (error) {
        console.error("Failed to fetch company details:", error);
        // Return a default object on error to prevent UI crashes
        return {
            name: "Your Company Name",
            address: "123 Business Rd, Kathmandu",
            phone: "9876543210",
            email: "contact@company.com",
            panNumber: "123456789",
            vatNumber: "987654321",
        };
    }
}
