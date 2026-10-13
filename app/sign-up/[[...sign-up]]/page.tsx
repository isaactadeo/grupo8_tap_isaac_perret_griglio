import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";
import Encabezado from "@/app/_componentes/encabezado";

export default function PaginaRegistro() {
  return (
    <>
      <Encabezado />
      <main className="flex flex-1 items-start justify-center px-4 py-12 sm:py-16">
        {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
          <Suspense fallback={<p className="text-niebla">Cargando registro…</p>}>
            <SignUp />
          </Suspense>
        ) : (
          <p className="max-w-md rounded-2xl border border-linea bg-papel p-6 text-niebla">
            El registro todavía no está configurado. Configurá Clerk en{" "}
            <code>.env.local</code>.
          </p>
        )}
      </main>
    </>
  );
}
