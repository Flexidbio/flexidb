import { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-passord-form";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your password"
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-[350px] space-y-6">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Forgot your password?
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email below to receive a password reset link
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </main>
  );
}