import { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-passord-form";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your password"
};

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Forgot your password?
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your email below to receive a password reset link
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}