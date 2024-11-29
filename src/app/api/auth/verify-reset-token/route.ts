import { NextResponse } from 'next/server';
import { PasswordResetService } from '@/lib/auth/password-reset';
import { z } from 'zod';

const verifyTokenSchema = z.object({
  token: z.string()
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = verifyTokenSchema.parse(json);
    
    const passwordResetService = PasswordResetService.getInstance();
    const userId = await passwordResetService.verifyResetToken(body.token);

    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}