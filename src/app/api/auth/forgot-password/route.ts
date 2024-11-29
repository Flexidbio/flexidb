// app/api/auth/forgot-password/route.ts
import { NextResponse } from 'next/server';
import { PasswordResetService } from '@/lib/auth/password-reset';
import { z } from 'zod';
import { isEmailConfigured } from '@/lib/email/utils';

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = forgotPasswordSchema.parse(json);
    
    // Check if email is configured
    const emailConfigured = await isEmailConfigured();
    if (!emailConfigured) {
      return NextResponse.json(
        { requiresConfig: true, error: 'Email service not configured' },
        { status: 400 }
      );
    }

    const passwordResetService = PasswordResetService.getInstance();
    const result = await passwordResetService.sendResetEmail(
      body.email,
      process.env.NEXT_PUBLIC_APP_URL!
    );

    if (!result.success) {
      if (result.requiresConfig) {
        return NextResponse.json(
          { requiresConfig: true, error: 'Email service not configured properly' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to send reset email' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'If an account exists with this email, a password reset link will be sent.'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
