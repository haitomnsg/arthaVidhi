'use server';

import prisma from '@/lib/db';
import type { Company } from '@prisma/client';

export const getCompanyDetails = async (): Promise<Partial<Company>> => {
    // TODO: Replace with authenticated user ID from session
    const userId = 1;

    try {
        const company = await prisma.company.findUnique({
            where: { userId },
        });

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
