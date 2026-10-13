import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import { Suspense } from "react";

export default function PaginaInicio(): React.JSX.Element {
  return (
    <main className="flex min-h-screen flex-col bg-zinc-50 text-zinc-950">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <Link href="/" className="text-lg font-semibold">
          Marketplace Rafaela
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/autos/publicar"
            className="text-sm font-medium text-zinc-700 hover:text-teal-800"
          >
            Publicar auto
          </Link>
          <Link
            href="/servicios"
            className="text-sm font-medium text-zinc-700 hover:text-teal-800"
          >
            Servicios
          </Link>
          <Suspense fallback={<p className="text-sm text-zinc-600">Cargando cuenta...</p>}>
            {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
              <>
                <Show when="signed-out">
                  <div className="flex items-center gap-3">
                    <SignInButton>
                      <button className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-zinc-100">
                        Iniciar sesion
                      </button>
                    </SignInButton>
                    <SignUpButton>
                      <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">
                        Crear cuenta
                      </button>
                    </SignUpButton>
                  </div>
                </Show>
                <Show when="signed-in">
                  <UserButton />
                </Show>
              </>
            ) : (
              <p className="text-sm text-zinc-600">
                Configura Clerk en .env.local para iniciar sesion.
              </p>
            )}
          </Suspense>
        </nav>
      </header>
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-20">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Autos y servicios vehiculares
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Compra y vende autos en Rafaela.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-600">
          Publica tu auto o encuentra servicios vehiculares en Rafaela.
        </p>
        <Link
          href="/autos/publicar"
          className="mt-8 w-fit rounded-lg bg-teal-800 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Publicar un auto
        </Link>
        <Link
          href="/servicios"
          className="mt-3 w-fit rounded-lg border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-800 hover:bg-white"
        >
          Explorar servicios
        </Link>
      </section>
    </main>
  );
}
