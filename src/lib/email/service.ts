// lib/email/service.ts
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/db/prisma';

interface EmailConfig {
  provider: 'smtp' | 'resend';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  apiKey?: string;
  from: string;
}

export class EmailService {
  private static instance: EmailService;
  private emailConfig: EmailConfig | null = null;

  private constructor() {}

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private async loadConfig() {
    const settings = await prisma.settings.findUnique({
      where: { id: 'email-settings' }
    });
    
    this.emailConfig = settings?.emailConfig as unknown as EmailConfig || null;
  }

  async sendEmail(to: string, subject: string, html: string) {
    await this.loadConfig();
    
    if (!this.emailConfig) {
      throw new Error('Email configuration not found');
    }

    if (this.emailConfig.provider === 'smtp') {
      const transporter = nodemailer.createTransport({
        host: this.emailConfig.host,
        port: this.emailConfig.port,
        secure: this.emailConfig.port === 465,
        auth: {
          user: this.emailConfig.username,
          pass: this.emailConfig.password,
        },
      });

      await transporter.sendMail({
        from: this.emailConfig.from,
        to,
        subject,
        html,
      });
    } else if (this.emailConfig.provider === 'resend') {
      const resend = new Resend(this.emailConfig.apiKey);
      
      await resend.emails.send({
        from: this.emailConfig.from,
        to,
        subject,
        html,
      });
    } else {
      throw new Error('Invalid email provider configuration');
    }
  }

  async sendPasswordResetEmail(to: string, resetToken: string, resetUrl: string) {
    const html = `
      <h1>Password Reset Request</h1>
      <p>You requested to reset your password. Click the link below to proceed:</p>
      <a href="${resetUrl}?token=${resetToken}">Reset Password</a>
      <p>If you didn't request this, please ignore this email.</p>
      <p>This link will expire in 1 hour.</p>
    `;

    await this.sendEmail(
      to,
      'Password Reset Request',
      html
    );
  }
}