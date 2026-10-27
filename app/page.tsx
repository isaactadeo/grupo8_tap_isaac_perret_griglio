import Image from "next/image";
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
import fotoInicio from "@/public/imagenes/inicio-auto.jpg";

const clasesGrilla =
  "grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4";

function EsqueletoTarjetas(): React.JSX.Element {
  return (
    <div className={clasesGrilla} aria-hidden="true">
      {Array.from({ length: 4 }, (_, indice) => (
        <div key={indice} className="space-y-3">
          <div className="aspect-[4/3] rounded-[1.125rem] bg-hueso-hondo motion-safe:animate-pulse" />
          <div className="h-4 w-3/4 rounded bg-hueso-hondo" />
          <div className="h-4 w-1/3 rounded bg-hueso-hondo" />
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
      <p role="status" className="rounded-xl border border-linea bg-papel p-6 text-gris">
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
      <div className="rounded-xl border border-dashed border-linea p-8">
        <p className="text-lg font-semibold">Todavía no hay autos publicados.</p>
        <p className="mt-1 text-gris">
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
              verificado: auto.ownerVerified,
              vendedor: auto.ownerName,
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
        <div className="mx-auto max-w-6xl px-4 pt-6 pb-20 sm:px-8 sm:pt-10 sm:pb-24">
          <section aria-labelledby="titulo-inicio">
            <div className="relative isolate aspect-[4/5] overflow-hidden rounded-2xl bg-hueso-hondo sm:aspect-[16/9] lg:aspect-[2/1]">
              <Image
                src={fotoInicio}
                alt=""
                fill
                preload
                placeholder="blur"
                sizes="(min-width: 1152px) 1088px, 100vw"
                className="foto-calida -z-10 object-cover object-[center_65%]"
              />
              <div aria-hidden="true" className="grano absolute inset-0 -z-10" />
              {/* Velo claro detrás del texto para que se lea sobre cualquier zona de la foto. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-gradient-to-b from-hueso/90 via-hueso/45 to-transparent sm:bg-gradient-to-r sm:from-hueso/90 sm:via-hueso/40"
              />
              <div className="px-6 pt-8 sm:px-12 sm:pt-14">
                <p className="entrada text-xs font-semibold tracking-[0.14em] text-gris uppercase">
                  Compra y venta · Rafaela, Santa Fe
                </p>
                <h1
                  id="titulo-inicio"
                  className="titular entrada mt-3 max-w-[13ch] text-[clamp(2.5rem,5.5vw,4.25rem)] leading-[1.02]"
                >
                  Autos en venta en Rafaela
                </h1>
                <p className="entrada mt-5 max-w-sm text-lg leading-relaxed text-carbon">
                  Encontrá tu próximo auto filtrando por marca, modelo, año y
                  presupuesto.
                </p>
              </div>
            </div>
            <div className="mt-4">
              <FormularioBusquedaAutos variante="tablero" />
            </div>
          </section>

          <nav
            aria-label="Buscar por marca"
            className="mt-6 flex flex-wrap items-center gap-2"
          >
            <span className="mr-2 text-sm text-gris">Marcas populares</span>
            {marcasFrecuentes.map((marca) => (
              <Link
                key={marca}
                href={`/autos?q=${encodeURIComponent(marca)}`}
                className="rounded-full border border-linea bg-papel px-3.5 py-1.5 text-sm font-medium text-tinta transition-colors hover:border-tinta"
              >
                {marca}
              </Link>
            ))}
          </nav>
        </div>

        {/* Cada sección del inicio queda delimitada: esta va en una franja blanca. */}
        <div className="border-y border-linea bg-papel">
          <section
            aria-labelledby="titulo-recientes"
            className="aparecer mx-auto max-w-6xl px-4 py-20 sm:px-8 sm:py-24"
          >
            <div className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <h2
                id="titulo-recientes"
                className="titular text-titulo"
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
        </div>

        <div className="aparecer mx-auto grid max-w-6xl gap-5 px-4 py-20 sm:px-8 sm:py-24 md:grid-cols-[1.35fr_1fr]">
          <section
            aria-labelledby="titulo-servicios"
            className="flex flex-col rounded-2xl border border-linea bg-papel p-6 sm:p-10"
          >
            <h2
              id="titulo-servicios"
              className="titular text-subtitulo"
            >
              Talleres y lavaderos
            </h2>
            <p className="mt-3 max-w-md text-gris">
              Encontrá talleres mecánicos y lavaderos en el mapa de Rafaela y
              filtrá por cercanía.
            </p>
            <ul className="mt-5 flex gap-6 text-sm font-semibold" aria-label="Tipos de servicio">
              <li className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-taller" aria-hidden="true" />
                Talleres
              </li>
              <li className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-lavadero" aria-hidden="true" />
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
            className="flex flex-col rounded-2xl border border-linea bg-papel p-6 sm:p-10"
          >
            <h2
              id="titulo-vender"
              className="titular text-subtitulo"
            >
              ¿Vendés tu auto?
            </h2>
            <p className="mt-3 max-w-md text-gris">
              Publicalo con marca, modelo, año, precio y fotos.
            </p>
            <Link
              href="/autos/publicar"
              className="boton boton-principal mt-7 self-start"
            >
              Publicar auto
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}
