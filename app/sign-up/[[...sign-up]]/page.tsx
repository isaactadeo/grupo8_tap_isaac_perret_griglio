import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";

export default function PaginaRegistro() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p>Configura Clerk en `.env.local` para crear una cuenta.</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Suspense fallback={<p>Cargando registro...</p>}>
        <SignUp />
      </Suspense>
    </main>
  );
}
