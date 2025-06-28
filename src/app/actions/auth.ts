'use server';

import * as z from 'zod';
import bcryptjs from 'bcryptjs';

import prisma from '@/lib/db';

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
    const hashedPassword = await bcryptjs.hash(password, 10);

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        return { error: "Email is already in use." };
    }

    await prisma.user.create({
        data: {
            name,
            email,
            phone,
            password: hashedPassword,
        },
    });

    return { success: "User created successfully!" };
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

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

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
}
