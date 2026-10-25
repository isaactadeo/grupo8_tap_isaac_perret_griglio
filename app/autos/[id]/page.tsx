import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import InteraccionesPublicacion from "@/app/componentes/interacciones-publicacion";
import { obtenerAuto } from "@/lib/marketplace/repositorio";

export default function PaginaDetalleAuto({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.JSX.Element {
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold">
            Marketplace Rafaela
          </Link>
          <Link
            href="/autos/publicar"
            className="text-sm font-medium text-zinc-700 hover:text-teal-800"
          >
            Publicar auto
          </Link>
        </div>
      </header>

      <Suspense
        fallback={
          <p className="mx-auto max-w-5xl px-6 py-10 text-sm text-zinc-600">
            Cargando publicación…
          </p>
        }
      >
        <ContenidoDetalleAuto params={params} />
      </Suspense>
    </main>
  );
}

async function ContenidoDetalleAuto({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    notFound();
  }

  const auto = await obtenerAuto(id);
  if (!auto) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <Link
        href="/"
        className="text-sm font-medium text-teal-800 hover:underline"
      >
        ← Volver al inicio
      </Link>
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-800">
          {auto.make} · {auto.year}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {auto.title}
        </h1>
        <p className="mt-2 text-lg text-zinc-600">
          {auto.make} {auto.model} · {auto.year}
        </p>
        <p className="mt-4 text-2xl font-semibold">
          {Number(auto.price).toLocaleString("es-AR", {
            style: "currency",
            currency: "ARS",
            maximumFractionDigits: 0,
          })}
        </p>

        {auto.photos.length > 0 ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {auto.photos.map((foto, indice) => (
              <Image
                key={`${foto}:${indice}`}
                src={foto}
                alt={`Foto ${indice + 1} de ${auto.title}`}
                width={800}
                height={600}
                unoptimized
                className="h-64 w-full rounded-xl object-cover"
              />
            ))}
          </div>
        ) : null}

        <div className="mt-6 border-t border-zinc-200 pt-5">
          <h2 className="text-lg font-semibold">Descripción</h2>
          <p className="mt-2 whitespace-pre-wrap text-zinc-700">
            {auto.description}
          </p>
        </div>

        <InteraccionesPublicacion tipo="autos" id={auto.id} />
      </section>
    </article>
  );
}
