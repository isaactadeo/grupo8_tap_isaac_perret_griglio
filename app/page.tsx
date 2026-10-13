import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import Encabezado from "./_componentes/encabezado";
import FormularioBusquedaAutos from "./_componentes/formulario-busqueda-autos";
import TarjetaAuto from "./_componentes/tarjeta-auto";
import {
  formatearUbicacion,
  marcasFrecuentes,
} from "@/lib/marketplace/formato";
import type { Car } from "@/src/types";

const clasesGrilla =
  "grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4";

function EsqueletoTarjetas(): React.JSX.Element {
  return (
    <div className={clasesGrilla} aria-hidden="true">
      {Array.from({ length: 4 }, (_, indice) => (
        <div key={indice} className="space-y-3">
          <div className="aspect-[4/3] rounded-[1.125rem] bg-hormigon-hondo motion-safe:animate-pulse" />
          <div className="h-4 w-3/4 rounded bg-hormigon-hondo" />
          <div className="h-4 w-1/3 rounded bg-hormigon-hondo" />
        </div>
      ))}
    </div>
  );
}

async function RecienPublicados(): Promise<React.JSX.Element> {
  await connection();

  let autos: Car[] | null = null;
  try {
    const { listarAutos } = await import("@/lib/marketplace/repositorio");
    autos = (await listarAutos(1, 8)).items;
  } catch (error) {
    console.error("No se pudieron cargar los autos recientes:", error);
  }

  if (!autos) {
    return (
      <p role="status" className="rounded-2xl border border-linea bg-papel p-6 text-niebla">
        No pudimos cargar los autos recientes. Probá de nuevo en unos minutos o{" "}
        <Link href="/autos" className="enlace">
          buscá entre todos los autos
        </Link>
        .
      </p>
    );
  }

  if (autos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-linea p-8">
        <p className="text-lg font-semibold">Todavía no hay autos publicados.</p>
        <p className="mt-1 text-niebla">
          Publicá el primero y aparecerá acá.
        </p>
        <Link href="/autos/publicar" className="boton boton-principal mt-5">
          Publicar auto
        </Link>
      </div>
    );
  }

  return (
    <ul className={clasesGrilla}>
      {autos.map((auto, indice) => (
        <li key={auto.id}>
          <TarjetaAuto
            destacada={indice < 4}
            auto={{
              id: auto.id,
              title: auto.title,
              make: auto.make,
              model: auto.model,
              year: auto.year,
              price: auto.price,
              foto: auto.photos[0],
              ubicacion: formatearUbicacion(auto.city, auto.province),
            }}
          />
        </li>
      ))}
    </ul>
  );
}

export default function PaginaInicio(): React.JSX.Element {
  return (
    <>
      <Encabezado />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-8 sm:pt-10">
          <section className="parabrisas" aria-labelledby="titulo-inicio">
            <div className="vidrio parabrisas-vidrio" aria-hidden="true" />
            <h1
              id="titulo-inicio"
              className="tiza tiza-escrita max-w-[13ch] text-[clamp(3rem,8.5vw,6rem)]"
            >
              Autos en venta en Rafaela
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/80">
              Filtrá por marca, modelo, año y presupuesto.
            </p>
            <div className="mt-8">
              <FormularioBusquedaAutos variante="tablero" />
            </div>
          </section>

          <nav
            aria-label="Buscar por marca"
            className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-1.5 px-1"
          >
            <span className="text-sm text-niebla">Buscar por marca:</span>
            {marcasFrecuentes.map((marca) => (
              <Link
                key={marca}
                href={`/autos?q=${encodeURIComponent(marca)}`}
                className="condensada text-lg font-bold text-vidrio hover:underline hover:underline-offset-4"
              >
                {marca}
              </Link>
            ))}
          </nav>
        </div>

        <section
          aria-labelledby="titulo-recientes"
          className="mx-auto max-w-6xl px-4 py-16 sm:px-8"
        >
          <div className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <h2
              id="titulo-recientes"
              className="condensada text-titulo font-extrabold text-vidrio"
            >
              Recién publicados
            </h2>
            <Link href="/autos" className="enlace">
              Ver todos los autos
            </Link>
          </div>
          <Suspense fallback={<EsqueletoTarjetas />}>
            <RecienPublicados />
          </Suspense>
        </section>

        <div className="mx-auto grid max-w-6xl gap-5 px-4 pb-20 sm:px-8 md:grid-cols-2">
          <section
            aria-labelledby="titulo-servicios"
            className="flex flex-col rounded-[1.25rem] bg-hormigon-hondo p-6 sm:p-8"
          >
            <h2
              id="titulo-servicios"
              className="condensada text-subtitulo font-extrabold text-vidrio"
            >
              Talleres y lavaderos
            </h2>
            <p className="mt-3 max-w-md text-niebla">
              Encontrá talleres mecánicos y lavaderos en el mapa de Rafaela y
              filtrá por cercanía.
            </p>
            <ul className="mt-5 flex gap-6 text-sm font-semibold" aria-label="Tipos de servicio">
              <li className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-oxido" aria-hidden="true" />
                Talleres
              </li>
              <li className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-agua" aria-hidden="true" />
                Lavaderos
              </li>
            </ul>
            <Link
              href="/servicios"
              className="boton boton-secundario mt-7 self-start"
            >
              Ver servicios en el mapa
            </Link>
          </section>

          <section
            aria-labelledby="titulo-vender"
            className="vidrio relative flex flex-col overflow-hidden rounded-[1.25rem] p-6 pt-20 sm:p-8 sm:pt-20"
          >
            <div className="franja" aria-hidden="true" />
            <h2
              id="titulo-vender"
              className="condensada text-subtitulo font-extrabold"
            >
              ¿Vendés tu auto?
            </h2>
            <p className="mt-3 max-w-md text-white/80">
              Publicalo con marca, modelo, año, precio y fotos. Necesitás una
              cuenta para publicar.
            </p>
            <Link
              href="/autos/publicar"
              className="boton boton-tiza mt-7 self-start"
            >
              Publicar auto
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}
