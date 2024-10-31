// app/api/auth/forgot-password/route.ts
import { NextResponse } from 'next/server';
import { PasswordResetService } from '@/lib/auth/password-reset';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = forgotPasswordSchema.parse(json);
    
    const passwordResetService = PasswordResetService.getInstance();
    const success = await passwordResetService.sendResetEmail(
      body.email,
      process.env.NEXT_PUBLIC_APP_URL!
    );

    if (!success) {
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
