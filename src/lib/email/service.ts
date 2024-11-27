// lib/email/service.ts
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/db/prisma';
import { EmailProvider } from '@prisma/client';

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
    const settings = await prisma.settings.findFirst();
    
    if (!settings?.emailProvider || !settings?.emailFrom) {
      throw new Error('Email configuration not found');
    }

    return {
      provider: settings.emailProvider,
      from: settings.emailFrom,
      smtpConfig: settings.smtpConfig as {
        host: string;
        port: number;
        username: string;
        password: string;
      },
      resendConfig: settings.resendConfig as {
        apiKey: string;
      },
    };
  }

  async sendEmail(to: string, subject: string, html: string) {
    const config = await this.loadConfig();
    
    if (config.provider === EmailProvider.SMTP) {
      if (!config.smtpConfig) {
        throw new Error('SMTP configuration not found');
      }

      const transporter = nodemailer.createTransport({
        host: config.smtpConfig.host,
        port: config.smtpConfig.port,
        secure: config.smtpConfig.port === 465,
        auth: {
          user: config.smtpConfig.username,
          pass: config.smtpConfig.password,
        },
      });

      await transporter.sendMail({
        from: config.from,
        to,
        subject,
        html,
      });
    } else if (config.provider === EmailProvider.RESEND) {
      if (!config.resendConfig?.apiKey) {
        throw new Error('Resend API key not found');
      }

      const resend = new Resend(config.resendConfig.apiKey);
      
      await resend.emails.send({
        from: config.from,
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