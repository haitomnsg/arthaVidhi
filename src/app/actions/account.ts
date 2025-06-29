'use server';

import prisma from '@/lib/db';
import * as z from 'zod';
import bcryptjs from 'bcryptjs';
import type { User, Company } from '@prisma/client';

// TODO: Replace with authenticated user ID from session
const getUserId = async () => {
    return 1;
};

export const getAccountDetails = async (): Promise<{ user: User | null; company: Company | null }> => {
    const userId = await getUserId();
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        const company = await prisma.company.findUnique({
            where: { userId },
        });

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
    
    // Check if email is being changed to one that already exists
    const existingUser = await prisma.user.findUnique({ where: { email: validatedFields.data.email } });
    if(existingUser && existingUser.id !== userId) {
        return { error: "Email is already in use by another account." };
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: validatedFields.data,
        });
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

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.password) {
        return { error: "User not found." };
    }

    const passwordsMatch = await bcryptjs.compare(values.currentPassword, user.password);
    if (!passwordsMatch) {
        return { error: "Current password does not match." };
    }

    const hashedPassword = await bcryptjs.hash(values.newPassword, 10);

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
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

    const data = {
        ...validatedFields.data,
        userId,
    };

    try {
        await prisma.company.upsert({
            where: { userId },
            update: data,
            create: data,
        });
        return { success: "Company details saved successfully!" };
    } catch (error) {
        console.error("Failed to save company details:", error);
        return { error: "Database Error: Failed to save company details." };
    }
};
