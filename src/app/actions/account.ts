'use server';

import db from '@/lib/db';
import * as z from 'zod';
import bcryptjs from 'bcryptjs';
import type { RowDataPacket, OkPacket } from 'mysql2';

interface User {
    id: number;
    name: string;
    email: string;
    phone: string;
    password?: string; // It's hashed, but let's make it optional for returns
    createdAt: Date;
    updatedAt: Date;
}

interface Company {
    id: number;
    userId: number;
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    panNumber: string | null;
    vatNumber: string | null;
    createdAt: Date;
    updatedAt: Date;
}


// TODO: Replace with authenticated user ID from session
const getUserId = async () => {
    return 1;
};

export const getAccountDetails = async (): Promise<{ user: User | null; company: Company | null }> => {
    const userId = await getUserId();
    try {
        const [userRows] = await db.query<RowDataPacket[]>('SELECT * FROM `User` WHERE `id` = ?', [userId]);
        const user = (userRows[0] as User) || null;

        const [companyRows] = await db.query<RowDataPacket[]>('SELECT * FROM `Company` WHERE `userId` = ?', [userId]);
        const company = (companyRows[0] as Company) || null;

        return { user, company };
    } catch (error) {
        console.error("Failed to fetch account details:", error);
        return { user: null, company: null };
    }
};

const profileFormSchema = z.object({
  name: z.string().min(2, "Name is too short."),
  email: z.string().email(),
  phone: z.string().min(10, "Invalid phone number."),
});

export const updateUserProfile = async (values: z.infer<typeof profileFormSchema>) => {
    const userId = await getUserId();
    const validatedFields = profileFormSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: "Invalid fields!" };
    }
    
    const { name, email, phone } = validatedFields.data;

    try {
        const [existingUsers] = await db.query<RowDataPacket[]>(
            'SELECT `id` FROM `User` WHERE `email` = ? AND `id` != ?',
            [email, userId]
        );
        if (existingUsers.length > 0) {
            return { error: "Email is already in use by another account." };
        }

        await db.query(
            'UPDATE `User` SET `name` = ?, `email` = ?, `phone` = ? WHERE `id` = ?',
            [name, email, phone, userId]
        );
        return { success: "Profile updated successfully!" };
    } catch (error) {
        console.error("Failed to update profile:", error);
        return { error: "Database Error: Failed to update profile." };
    }
};

const passwordFormSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(8, "New password must be at least 8 characters."),
})

export const updatePassword = async (values: z.infer<typeof passwordFormSchema>) => {
    const userId = await getUserId();
    const validatedFields = passwordFormSchema.safeParse(values);
    if (!validatedFields.success) {
        return { error: "Invalid fields!" };
    }

    const { currentPassword, newPassword } = values;

    try {
        const [userRows] = await db.query<RowDataPacket[]>('SELECT `password` FROM `User` WHERE `id` = ?', [userId]);
        const user = userRows[0] as User | undefined;

        if (!user || !user.password) {
            return { error: "User not found." };
        }

        const passwordsMatch = await bcryptjs.compare(currentPassword, user.password);
        if (!passwordsMatch) {
            return { error: "Current password does not match." };
        }

        const hashedPassword = await bcryptjs.hash(newPassword, 10);

        await db.query(
            'UPDATE `User` SET `password` = ? WHERE `id` = ?',
            [hashedPassword, userId]
        );
        return { success: "Password updated successfully!" };
    } catch (error) {
        console.error("Failed to update password:", error);
        return { error: "Database Error: Failed to update password." };
    }
};

const companyFormSchema = z.object({
  name: z.string().min(2, "Company name is required."),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  panNumber: z.string().optional(),
  vatNumber: z.string().optional(),
});

export const upsertCompany = async (values: z.infer<typeof companyFormSchema>) => {
    const userId = await getUserId();
    const validatedFields = companyFormSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: "Invalid company details!" };
    }

    const data = validatedFields.data;

    try {
        const [companyRows] = await db.query<RowDataPacket[]>('SELECT `id` FROM `Company` WHERE `userId` = ?', [userId]);
        
        if (companyRows.length > 0) {
            // Update
            await db.query(
                'UPDATE `Company` SET `name` = ?, `address` = ?, `phone` = ?, `email` = ?, `panNumber` = ?, `vatNumber` = ? WHERE `userId` = ?',
                [data.name, data.address, data.phone, data.email, data.panNumber, data.vatNumber, userId]
            );
        } else {
            // Insert
            await db.query(
                'INSERT INTO `Company` (`name`, `address`, `phone`, `email`, `panNumber`, `vatNumber`, `userId`) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [data.name, data.address, data.phone, data.email, data.panNumber, data.vatNumber, userId]
            );
        }
        
        return { success: "Company details saved successfully!" };
    } catch (error) {
        console.error("Failed to save company details:", error);
        return { error: "Database Error: Failed to save company details." };
    }
};
