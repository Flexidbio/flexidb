import { auth } from "@/lib/auth/auth";

export async function GET() {
  const session = await auth();
  return Response.json({ 
    authenticated: !!session,
    session 
  });
}