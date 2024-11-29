import { NextResponse } from 'next/server';
import { PasswordResetService } from '@/lib/auth/password-reset';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8)
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = resetPasswordSchema.parse(json);
    
    const passwordResetService = PasswordResetService.getInstance();
    const success = await passwordResetService.resetPassword(
      body.token,
      body.password
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to reset password' },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: 'Password reset successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}