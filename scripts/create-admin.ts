// scripts/create-admin.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Read credentials from file
    const credsFile = await fs.readFile('admin-credentials.txt', 'utf-8');
    const password = credsFile.match(/Password: (.+)/)?.[1];
    
    if (!password) {
      throw new Error('Admin password not found in credentials file');
    }

    // Check if admin exists
    const existingAdmin = await prisma.user.findFirst({
      where: { email: 'admin@flexidb.local' }
    });

    if (existingAdmin) {
     //? console.log('Admin user already exists');
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email: 'admin@flexidb.local',
        name: 'FlexiDB Admin',
        password: hashedPassword,
        isAdmin: true,
      }
    });

    //? console.log('Admin user created successfully');
  } catch (error) {
    console.error('Failed to create admin user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();