
'use server';

import * as z from 'zod';
import bcryptjs from 'bcryptjs';

import db from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

interface User {
    id: number;
    name: string;
    email: string;
    phone: string;
    password?: string;
    createdAt: Date;
    updatedAt: Date;
}

const registerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  phone: z.string().min(10, { message: "Please enter a valid phone number." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." }),
});

export const registerUser = async (values: z.infer<typeof registerSchema>) => {
    const validatedFields = registerSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: "Invalid fields!" };
    }

    const { email, password, name, phone } = validatedFields.data;

    try {
        const hashedPassword = await bcryptjs.hash(password, 10);

        const [existingUsers] = await db.query<RowDataPacket[]>(
            'SELECT `id` FROM `User` WHERE `email` = ? LIMIT 1',
            [email]
        );

        if (existingUsers.length > 0) {
            return { error: "Email is already in use." };
        }

        await db.query(
            'INSERT INTO `User` (`name`, `email`, `phone`, `password`) VALUES (?, ?, ?, ?)',
            [name, email, phone, hashedPassword]
        );

        return { success: "User created successfully!" };
    } catch (error) {
        console.error("Registration failed:", error);
        return { error: "Database Error: Could not register user." };
    }
};


const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});


export const loginUser = async (values: z.infer<typeof loginSchema>) => {
    const validatedFields = loginSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: "Invalid fields!" };
    }

    const { email, password } = validatedFields.data;

    try {
        const [users] = await db.query<RowDataPacket[]>(
            'SELECT * FROM `User` WHERE `email` = ? LIMIT 1',
            [email]
        );
        
        const existingUser = users[0] as User | undefined;

        if (!existingUser || !existingUser.password) {
            return { error: "Invalid credentials!" };
        }

        const passwordsMatch = await bcryptjs.compare(
            password,
            existingUser.password
        );

        if (passwordsMatch) {
            return { success: "Login successful!" };
        }
        
        return { error: "Invalid credentials!" };
    } catch (error) {
        console.error("Login failed:", error);
        return { error: "Database Error: Could not log in." };
    }
}
