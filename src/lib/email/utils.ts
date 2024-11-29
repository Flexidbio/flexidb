import { prisma } from '@/lib/db/prisma';

export async function isEmailConfigured(): Promise<boolean> {
  const settings = await prisma.settings.findFirst();
  
  if (!settings?.emailProvider || !settings?.emailFrom) {
    return false;
  }

  if (settings.emailProvider === 'SMTP' && !settings.smtpConfig) {
    return false;
  }

  if (settings.emailProvider === 'RESEND' && !settings.resendConfig) {
    return false;
  }

  return true;
}