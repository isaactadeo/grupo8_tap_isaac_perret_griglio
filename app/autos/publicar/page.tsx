import Link from "next/link";
import FormularioPublicarAuto from "./formulario";

export default function PaginaPublicarAuto(): React.JSX.Element {
  const clerkConfigurado = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold">
            Marketplace Rafaela
          </Link>
          <Link
            href="/servicios"
            className="text-sm font-medium text-zinc-700 hover:text-teal-800"
          >
            Servicios
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
          Publicar
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Publica tu auto en venta
        </h1>
        <p className="mt-3 mb-7 text-zinc-600">
          Completa los datos del vehículo. Tu cuenta será la propietaria de la
          publicación.
        </p>

        {clerkConfigurado ? (
          <FormularioPublicarAuto />
        ) : (
          <div
            role="alert"
            className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950"
          >
            Configura Clerk en `.env.local` para autenticarte y publicar autos.
          </div>
        )}
      </section>
    </main>
  );
}
