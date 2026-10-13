import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

export default function PaginaInicioSesion() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p>Configura Clerk en `.env.local` para iniciar sesion.</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Suspense fallback={<p>Cargando inicio de sesion...</p>}>
        <SignIn />
      </Suspense>
    </main>
  );
}
