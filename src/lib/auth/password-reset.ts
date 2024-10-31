// lib/auth/password-reset.ts
import { randomBytes, createHash } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { EmailService } from '@/lib/email/service';

export class PasswordResetService {
  private static instance: PasswordResetService;
  private emailService: EmailService;

  private constructor() {
    this.emailService = EmailService.getInstance();
  }

  public static getInstance(): PasswordResetService {
    if (!PasswordResetService.instance) {
      PasswordResetService.instance = new PasswordResetService();
    }
    return PasswordResetService.instance;
  }

  private generateResetToken(): string {
    return randomBytes(32).toString('hex');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async createResetToken(email: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return null;
    }

    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id }
    });

    const resetToken = this.generateResetToken();
    const hashedToken = this.hashToken(resetToken);

    // Create new reset token
    await prisma.passwordResetToken.create({
      data: {
        token: hashedToken,
        expires: new Date(Date.now() + 3600000), // 1 hour
        userId: user.id
      }
    });

    return resetToken;
  }

  async sendResetEmail(email: string, appUrl: string): Promise<boolean> {
    const resetToken = await this.createResetToken(email);
    
    if (!resetToken) {
      return false;
    }

    const resetUrl = `${appUrl}/auth/reset-password`;

    try {
      await this.emailService.sendPasswordResetEmail(
        email,
        resetToken,
        resetUrl
      );
      return true;
    } catch (error) {
      console.error('Error sending reset email:', error);
      // Clean up the token if email fails
      await this.deleteResetToken(resetToken);
      return false;
    }
  }

  async verifyResetToken(token: string): Promise<string | null> {
    const hashedToken = this.hashToken(token);
    
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token: hashedToken,
        expires: { gt: new Date() }
      },
      include: { user: true }
    });

    if (!resetToken) {
      return null;
    }

    return resetToken.userId;
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const userId = await this.verifyResetToken(token);

    if (!userId) {
      return false;
    }

    const hashedPassword = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(newPassword));

    try {
      await prisma.$transaction([
        // Update password
        prisma.user.update({
          where: { id: userId },
          data: { password: Buffer.from(hashedPassword).toString('hex') }
        }),
        // Delete reset token
        prisma.passwordResetToken.deleteMany({
          where: { userId }
        })
      ]);

      return true;
    } catch (error) {
      console.error('Error resetting password:', error);
      return false;
    }
  }

  private async deleteResetToken(token: string): Promise<void> {
    const hashedToken = this.hashToken(token);
    await prisma.passwordResetToken.deleteMany({
      where: { token: hashedToken }
    });
  }
}