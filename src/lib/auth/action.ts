'use server'

import bcrypt from "bcryptjs";
import { prisma } from "../db/prisma";

interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

export async function register(data: RegisterData) {
  // Check if this is the first user
  const userCount = await prisma.user.count();
  const isFirstUser = userCount === 0;

  // Check if signups are allowed
  if (!isFirstUser) {
    const settings = await prisma.settings.findFirst();
    if (!settings?.allowSignups) {
      throw new Error("Signups are currently disabled");
    }
  }

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email }
  });

  if (existingUser) {
    throw new Error("Email already exists");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      isAdmin: isFirstUser // First user is automatically admin
    }
  });

  return user;
}
