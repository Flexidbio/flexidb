import { Metadata } from "next";
import { SignUpForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create a new account"
};

export default function SignUpPage() {
  return <SignUpForm />;
}
