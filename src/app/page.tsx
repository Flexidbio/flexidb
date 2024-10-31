
// app/page.tsx
import { auth } from "@/lib/auth/auth";

export default async function HomePage() {
  const session = await auth();
  
  return (
    <div>
      <h1>Welcome {session?.user?.name}</h1>
      <pre>{JSON.stringify(session, null, 2)}</pre>
    </div>
  );
}
