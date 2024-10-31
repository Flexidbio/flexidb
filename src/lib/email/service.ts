import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { prisma } from '../db/prisma';

export class EmailService {
  private static instance: EmailService;
  private resend?: Resend;
  private smtp?: nodemailer.Transporter;

  private constructor() {
    if (typeof window !== 'undefined') {
      throw new Error('EmailService cannot be instantiated on the client side');
    }
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async configure(config: { type: 'resend' | 'smtp'; options: any }) {
    if (config.type === 'resend') {
      this.resend = new Resend(config.options.apiKey);
    } else {
      this.smtp = nodemailer.createTransport(config.options);
    }

    await prisma.settings.update({
      where: { id: 'email-settings' },
      data: { emailConfig: config }
    });
  }

  async sendEmail(to: string, subject: string, html: string) {
    const settings = await prisma.settings.findUnique({
      where: { id: 'email-settings' }
    });

    if (!settings?.emailConfig) {
      throw new Error('Email not configured');
    }

    if (settings.emailConfig.type === 'resend') {
      await this.resend!.emails.send({
        from: 'noreply@flexidb.app',
        to,
        subject,
        html
      });
    } else {
      await this.smtp!.sendMail({
        from: settings.emailConfig.options.from,
        to,
        subject,
        html
      });
    }
  }
}