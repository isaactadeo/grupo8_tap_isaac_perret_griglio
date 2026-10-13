"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type SubmitEvent } from "react";
import MapaServicios from "./mapa";
import { formatearPrecio } from "@/lib/marketplace/formato";
import type {
  GeoCoordinates,
  MarketplaceSearchDocument,
  ServiceType,
} from "@/src/types";

interface ResultadoBusquedaServicios {
  items: MarketplaceSearchDocument[];
  total: number;
}

const etiquetasCategoria: Record<ServiceType, string> = {
  taller: "Taller",
  lavadero: "Lavadero",
};

const coloresCategoria: Record<ServiceType, string> = {
  taller: "text-oxido",
  lavadero: "text-agua",
};

const puntosCategoria: Record<ServiceType, string> = {
  taller: "bg-oxido",
  lavadero: "bg-agua",
};

function leerMensajeError(datos: unknown, mensajeAlternativo: string): string {
  if (
    typeof datos === "object" &&
    datos !== null &&
    "error" in datos &&
    typeof datos.error === "string"
  ) {
    return datos.error;
  }
  return mensajeAlternativo;
}

export default function PanelServicios(): React.JSX.Element {
  const [termino, setTermino] = useState("");
  const [categoria, setCategoria] = useState<ServiceType | "">("");
  const [usarRadio, setUsarRadio] = useState(false);
  const [radioKm, setRadioKm] = useState(20);
  const [centroBusqueda, setCentroBusqueda] =
    useState<GeoCoordinates | null>(null);
  const [eligiendoCentro, setEligiendoCentro] = useState(false);
  const [resultado, setResultado] =
    useState<ResultadoBusquedaServicios | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);

  async function buscarServicios(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault();
    setBuscando(true);
    setErrorBusqueda(null);

    try {
      const parametros = new URLSearchParams({ kind: "service" });
      const texto = termino.trim();
      if (texto) {
        if (texto.length < 2 || texto.length > 100) {
          throw new Error("El texto debe tener entre 2 y 100 caracteres.");
        }
        parametros.set("q", texto);
      }
      if (categoria) {
        parametros.set("category", categoria);
      }
      if (usarRadio && centroBusqueda) {
        parametros.set("lat", String(centroBusqueda.lat));
        parametros.set("lng", String(centroBusqueda.lng));
        parametros.set("distance", `${radioKm}km`);
      }

      const respuesta = await fetch(`/api/search?${parametros.toString()}`);
      const datos: unknown = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(
          leerMensajeError(datos, "No se pudo completar la búsqueda."),
        );
      }
      if (
        typeof datos !== "object" ||
        datos === null ||
        !("items" in datos) ||
        !Array.isArray(datos.items) ||
        !("total" in datos) ||
        typeof datos.total !== "number"
      ) {
        throw new Error("La respuesta de búsqueda no tiene un formato válido.");
      }

      setResultado(datos as ResultadoBusquedaServicios);
    } catch (error) {
      setErrorBusqueda(
        error instanceof Error
          ? error.message
          : "No se pudo completar la búsqueda.",
      );
    } finally {
      setBuscando(false);
    }
  }

  function seleccionarUbicacion(ubicacion: GeoCoordinates) {
    if (eligiendoCentro) {
      setCentroBusqueda(ubicacion);
      setUsarRadio(true);
      setEligiendoCentro(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-10 pb-20 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <h1 className="condensada text-titulo font-extrabold text-vidrio">
            Talleres y lavaderos
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-niebla">
            Buscá por nombre o descripción, filtrá por tipo y mirá dónde quedan
            en el mapa de Rafaela.
          </p>
        </div>
        <Link href="/servicios/publicar" className="boton boton-principal">
          Publicar servicio
        </Link>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-10">
        <form
          onSubmit={buscarServicios}
          role="search"
          aria-label="Buscar servicios"
          className="grid h-fit gap-4 rounded-2xl border border-linea bg-papel p-5 sm:grid-cols-2 lg:sticky lg:top-6 lg:grid-cols-1"
        >
          <label className="sm:col-span-2 lg:col-span-1">
            <span className="etiqueta">Nombre o servicio</span>
            <input
              type="search"
              value={termino}
              onChange={(evento) => setTermino(evento.target.value)}
              maxLength={100}
              placeholder="Ej.: cambio de aceite, lavado completo"
              className="campo"
            />
          </label>
          <label>
            <span className="etiqueta">Tipo de servicio</span>
            <select
              value={categoria}
              onChange={(evento) =>
                setCategoria(evento.target.value as ServiceType | "")
              }
              className="campo"
            >
              <option value="">Todos</option>
              <option value="taller">Talleres</option>
              <option value="lavadero">Lavaderos</option>
            </select>
          </label>
          <label>
            <span className="etiqueta">Radio de búsqueda</span>
            <select
              value={radioKm}
              onChange={(evento) => setRadioKm(Number(evento.target.value))}
              disabled={!usarRadio}
              className="campo"
            >
              {[5, 10, 20, 50, 100].map((distancia) => (
                <option key={distancia} value={distancia}>
                  {distancia} km
                </option>
              ))}
            </select>
            {!usarRadio ? (
              <span className="ayuda">
                Elegí un punto en el mapa para activarlo.
              </span>
            ) : null}
          </label>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-1">
            <button
              type="button"
              onClick={() => setEligiendoCentro(true)}
              aria-pressed={eligiendoCentro}
              className="boton boton-secundario"
            >
              Elegir punto en el mapa
            </button>
            {centroBusqueda ? (
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={usarRadio}
                  onChange={(evento) => setUsarRadio(evento.target.checked)}
                  className="size-4 accent-vidrio"
                />
                Filtrar por cercanía
              </label>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={buscando}
            className="boton boton-principal sm:col-span-2 lg:col-span-1"
          >
            {buscando ? "Buscando…" : "Buscar servicios"}
          </button>
          {errorBusqueda ? (
            <p
              role="alert"
              className="text-sm font-medium text-alerta sm:col-span-2 lg:col-span-1"
            >
              {errorBusqueda}
            </p>
          ) : null}
        </form>

        <div className="min-w-0 space-y-6">
          <div>
            <MapaServicios
              items={resultado?.items ?? []}
              centroBusqueda={usarRadio ? centroBusqueda : null}
              radioKm={radioKm}
              ubicacionFormulario={null}
              modoSeleccion={eligiendoCentro ? "busqueda" : null}
              onSeleccionarUbicacion={seleccionarUbicacion}
            />
            <ul
              aria-label="Referencias del mapa"
              className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-niebla"
            >
              <li className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-oxido" aria-hidden="true" />
                Talleres
              </li>
              <li className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-agua" aria-hidden="true" />
                Lavaderos
              </li>
            </ul>
          </div>

          <section aria-live="polite" aria-label="Resultados">
            {resultado ? (
              <p className="text-lg font-semibold">
                {resultado.total}{" "}
                {resultado.total === 1
                  ? "servicio encontrado"
                  : "servicios encontrados"}
                {resultado.items.length < resultado.total ? (
                  <span className="font-normal text-niebla">
                    {" "}
                    (se muestran {resultado.items.length})
                  </span>
                ) : null}
              </p>
            ) : (
              <p className="text-niebla">
                Buscá para ver los servicios y sus ubicaciones en el mapa.
              </p>
            )}

            {resultado && resultado.items.length > 0 ? (
              <ul className="mt-4 divide-y divide-linea border-y border-linea">
                {resultado.items.map((servicio) => (
                  <li
                    key={`${servicio.kind}:${servicio.id}`}
                    className="flex gap-4 py-5"
                  >
                    {servicio.photos[0] ? (
                      <Image
                        src={servicio.photos[0]}
                        alt={`Foto de ${servicio.title}`}
                        width={112}
                        height={96}
                        unoptimized
                        className="h-24 w-28 shrink-0 rounded-xl object-cover"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <p
                        className={`flex items-center gap-2 text-sm font-semibold ${
                          servicio.category
                            ? coloresCategoria[servicio.category]
                            : "text-niebla"
                        }`}
                      >
                        <span
                          className={`size-2.5 rounded-full ${
                            servicio.category
                              ? puntosCategoria[servicio.category]
                              : "bg-niebla"
                          }`}
                          aria-hidden="true"
                        />
                        {servicio.category
                          ? etiquetasCategoria[servicio.category]
                          : "Servicio"}
                      </p>
                      <h2 className="mt-1 text-lg leading-snug font-semibold">
                        {servicio.title}
                      </h2>
                      <p className="mt-1 line-clamp-3 max-w-prose text-niebla">
                        {servicio.description}
                      </p>
                      <p className="mt-2 text-sm">
                        <span className="text-niebla">Precio de referencia </span>
                        <span className="font-bold">
                          {formatearPrecio(servicio.price)}
                        </span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}

            {resultado && resultado.items.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-linea p-6">
                <p className="font-semibold">
                  No hay servicios con esos filtros.
                </p>
                <p className="mt-1 text-niebla">
                  Probá con otras palabras, cambiá el tipo o ampliá el radio.
                </p>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
