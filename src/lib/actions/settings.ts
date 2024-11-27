'use server'

import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth/auth"
import { revalidatePath } from "next/cache"
import { EmailProvider } from "@prisma/client"

export async function getSettings() {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  return await prisma.settings.findFirst()
}

export async function updateProfileSettings(data: { name: string; email: string }) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: data.name,
      email: data.email,
    },
  })

  revalidatePath('/settings')
  return { success: true }
}

export async function updateEmailSettings(data: {
  emailProvider: EmailProvider
  emailFrom: string
  smtpConfig?: {
    host: string
    port: number
    username: string
    password: string
  }
  resendConfig?: {
    apiKey: string
  }
}) {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  const settings = await prisma.settings.findFirst()
  
  await prisma.settings.upsert({
    where: { id: settings?.id || 'default' },
    create: {
      emailProvider: data.emailProvider,
      emailFrom: data.emailFrom,
      smtpConfig: data.smtpConfig,
      resendConfig: data.resendConfig,
    },
    update: {
      emailProvider: data.emailProvider,
      emailFrom: data.emailFrom,
      smtpConfig: data.smtpConfig,
      resendConfig: data.resendConfig,
    },
  })

  revalidatePath('/settings')
  return { success: true }
}

export async function updateDomainSettings(domain: string) {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  const settings = await prisma.settings.findFirst()

  await prisma.settings.upsert({
    where: { id: settings?.id || 'default' },
    create: { domain },
    update: { domain },
  })

  revalidatePath('/settings')
  return { success: true }
}