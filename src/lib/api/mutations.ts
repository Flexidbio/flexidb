import { RegisterData } from "@/lib/types";
import { signIn } from "next-auth/react";

export async function registerUser(data: RegisterData) {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to register");
  }

  return response.json();
}

export async function loginUser(credentials: { email: string; password: string }) {
  const result = await signIn("credentials", {
    redirect: false,
    ...credentials,
  });

  if (result?.error) {
    throw new Error("Invalid email or password");
  }

  return result;
}