import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LandingHero } from "@/components/landing/landing-hero";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main>
      <LandingHero />
    </main>
  );
}
