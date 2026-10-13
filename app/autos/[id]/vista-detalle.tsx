import Link from "next/link";
import BotonEliminar from "@/app/_componentes/boton-eliminar";
import {
  formatearFecha,
  formatearPrecio,
  formatearUbicacion,
} from "@/lib/marketplace/formato";
import type { Car } from "@/src/types";
import GaleriaFotos from "./galeria";

export default function VistaDetalleAuto({
  auto,
  esPropietario = false,
}: {
  auto: Car;
  esPropietario?: boolean;
}): React.JSX.Element {
  const marcaModelo = `${auto.make} ${auto.model}`;
  const ubicacion = formatearUbicacion(auto.city, auto.province);
  const enlaceMapa = auto.location
    ? `https://www.openstreetmap.org/?mlat=${auto.location.lat}&mlon=${auto.location.lng}#map=16/${auto.location.lat}/${auto.location.lng}`
    : null;

  return (
    <article>
      <nav aria-label="Ruta de navegación" className="text-sm text-niebla">
        <ol className="flex flex-wrap gap-2">
          <li>
            <Link href="/autos" className="hover:text-vidrio hover:underline">
              Autos
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={`/autos?q=${encodeURIComponent(auto.make)}`}
              className="hover:text-vidrio hover:underline"
            >
              {auto.make}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-vidrio-hondo">
            {auto.model}
          </li>
        </ol>
      </nav>

      <h1 className="condensada mt-4 max-w-4xl text-[clamp(2rem,4.5vw,3rem)] leading-none font-extrabold text-vidrio">
        {auto.title}
      </h1>
      <p className="mt-3 flex flex-wrap gap-x-3 text-lg text-niebla">
        <span className="font-bold text-vidrio-hondo">{auto.year}</span>
        <span>{marcaModelo}</span>
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
        <div className="lg:col-start-1 lg:row-start-1">
          <GaleriaFotos fotos={auto.photos} titulo={auto.title} />
        </div>

        <aside className="self-start lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="vidrio relative overflow-hidden rounded-[1.25rem] px-5 pt-[4.5rem] pb-7">
            <div className="franja" aria-hidden="true" />
            <p className="tiza -rotate-2 text-[clamp(2.5rem,6vw,3.25rem)]">
              <span className="sr-only">Precio: </span>
              {formatearPrecio(auto.price)}
            </p>
          </div>

          {esPropietario ? (
            <div className="mt-5 rounded-xl border border-linea bg-papel p-4">
              <p className="text-sm font-semibold">Esta publicación es tuya.</p>
              <div className="mt-3 flex flex-wrap items-start gap-2">
                <Link
                  href={`/autos/${auto.id}/editar`}
                  className="boton boton-principal min-h-9 px-3 py-1.5 text-sm"
                >
                  Editar
                </Link>
                <BotonEliminar
                  tipo="auto"
                  id={auto.id}
                  titulo={auto.title}
                  redirigirA="/mis-publicaciones"
                />
              </div>
            </div>
          ) : null}

          <dl className="mt-6 divide-y divide-linea border-y border-linea">
            {[
              ["Marca", auto.make],
              ["Modelo", auto.model],
              ["Año", String(auto.year)],
            ].map(([nombre, valor]) => (
              <div key={nombre} className="flex justify-between gap-4 py-3">
                <dt className="text-niebla">{nombre}</dt>
                <dd className="text-right font-semibold">{valor}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-niebla">Ubicación</dt>
              <dd className="text-right font-semibold">
                {ubicacion ?? (enlaceMapa ? null : "No indicada")}
                {enlaceMapa ? (
                  <a
                    href={enlaceMapa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="enlace block"
                  >
                    Ver en el mapa
                  </a>
                ) : null}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-niebla">Publicado</dt>
              <dd className="text-right font-semibold">
                {formatearFecha(auto.createdAt)}
              </dd>
            </div>
          </dl>
        </aside>

        <section
          aria-labelledby="titulo-descripcion"
          className="lg:col-start-1 lg:row-start-2"
        >
          <h2
            id="titulo-descripcion"
            className="condensada text-subtitulo font-extrabold text-vidrio"
          >
            Descripción
          </h2>
          <p className="mt-3 max-w-prose text-[1.0625rem] whitespace-pre-line">
            {auto.description}
          </p>
        </section>
      </div>
    </article>
  );
}
