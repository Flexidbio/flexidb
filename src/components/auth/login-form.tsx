"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { signIn } from "next-auth/react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const { mutate: login, isPending } = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const result = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (result?.error) {
        throw new Error("Invalid email or password");
      }

      return result;
    },
    onSuccess: () => {
      router.push(callbackUrl);
      router.refresh();
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    login({
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Sign in</h1>
        <p className="text-muted-foreground">
          Enter your email below to sign in to your account
        </p>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="m@example.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
          />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={isPending}
        >
          {isPending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <div className="text-center text-sm">
        Don't have an account?{" "}
        <Link href="/auth/signup" className="underline">
          Sign up
        </Link>
      </div>
    </div>
  );
}