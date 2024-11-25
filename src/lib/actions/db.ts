'use server'

import { prisma } from "@/lib/db/prisma"

export async function checkDatabaseConnection() {
  try {
    await prisma.$connect()
    console.log('Successfully connected to database')
    return { success: true }
  } catch (error) {
    console.error('Failed to connect to database:', error)
    return { success: false, error }
  }
}