"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import InteraccionesPublicacion from "@/app/componentes/interacciones-publicacion";
import MapaServicios from "./mapa";
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

function leerUbicacion(
  latitud: string,
  longitud: string,
): GeoCoordinates | null {
  if (!latitud.trim() || !longitud.trim()) {
    return null;
  }
  return { lat: Number(latitud), lng: Number(longitud) };
}

export default function PaginaServicios(): React.JSX.Element {
  const [termino, setTermino] = useState("");
  const [categoria, setCategoria] = useState<ServiceType | "">("");
  const [usarRadio, setUsarRadio] = useState(false);
  const [radioKm, setRadioKm] = useState(20);
  const [centroBusqueda, setCentroBusqueda] =
    useState<GeoCoordinates | null>(null);
  const [modoSeleccion, setModoSeleccion] = useState<
    "busqueda" | "publicacion" | null
  >(null);
  const [resultado, setResultado] =
    useState<ResultadoBusquedaServicios | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);

  const [titulo, setTitulo] = useState("");
  const [categoriaNueva, setCategoriaNueva] = useState<ServiceType>("taller");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [fotos, setFotos] = useState("");
  const [latitud, setLatitud] = useState("");
  const [longitud, setLongitud] = useState("");
  const [publicando, setPublicando] = useState(false);
  const [mensajePublicacion, setMensajePublicacion] = useState<string | null>(
    null,
  );
  const [errorPublicacion, setErrorPublicacion] = useState<string | null>(null);

  async function buscarServicios(evento: FormEvent<HTMLFormElement>) {
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

  async function publicarServicio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setPublicando(true);
    setMensajePublicacion(null);
    setErrorPublicacion(null);

    const ubicacion = leerUbicacion(latitud, longitud);
    const listaFotos = fotos
      .split(/\r?\n/)
      .map((url) => url.trim())
      .filter(Boolean);

    try {
      const respuesta = await fetch("/api/servicios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titulo,
          category: categoriaNueva,
          description: descripcion,
          price: precio,
          ...(listaFotos.length > 0 ? { photos: listaFotos } : {}),
          location: ubicacion,
        }),
      });
      const datos: unknown = await respuesta.json();
      if (!respuesta.ok) {
        const mensaje = leerMensajeError(
          datos,
          "No se pudo publicar el servicio.",
        );
        if (
          typeof datos === "object" &&
          datos !== null &&
          "guardado" in datos &&
          datos.guardado === true
        ) {
          setMensajePublicacion(
            `${mensaje}. La publicación quedó guardada, pero no aparecerá en la búsqueda hasta sincronizar el índice.`,
          );
          return;
        }
        throw new Error(mensaje);
      }

      setTitulo("");
      setDescripcion("");
      setPrecio("");
      setFotos("");
      setMensajePublicacion("Servicio publicado correctamente.");
      setResultado(null);
    } catch (error) {
      setErrorPublicacion(
        error instanceof Error
          ? error.message
          : "No se pudo publicar el servicio.",
      );
    } finally {
      setPublicando(false);
    }
  }

  function seleccionarUbicacion(ubicacion: GeoCoordinates) {
    if (modoSeleccion === "busqueda") {
      setCentroBusqueda(ubicacion);
      setUsarRadio(true);
    } else if (modoSeleccion === "publicacion") {
      setLatitud(ubicacion.lat.toFixed(6));
      setLongitud(ubicacion.lng.toFixed(6));
    }
    setModoSeleccion(null);
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold">
            Marketplace Rafaela
          </Link>
          <Link
            href="/"
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Volver a inicio
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
            Servicios vehiculares
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Talleres y lavaderos en Rafaela
          </h1>
          <p className="mt-3 max-w-2xl text-zinc-600">
            Busca por nombre o descripción, filtra por tipo y explora las
            ubicaciones en el mapa.
          </p>
        </div>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <div className="space-y-5">
            <form
              onSubmit={buscarServicios}
              className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:grid-cols-2"
            >
              <label className="sm:col-span-2">
                <span className="mb-1 block text-sm font-medium">
                  Buscar por texto
                </span>
                <input
                  value={termino}
                  onChange={(evento) => setTermino(evento.target.value)}
                  maxLength={100}
                  placeholder="Ej.: cambio de aceite, lavado..."
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium">
                  Tipo de servicio
                </span>
                <select
                  value={categoria}
                  onChange={(evento) =>
                    setCategoria(evento.target.value as ServiceType | "")
                  }
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5"
                >
                  <option value="">Todos</option>
                  <option value="taller">Taller</option>
                  <option value="lavadero">Lavadero</option>
                </select>
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium">
                  Radio de búsqueda
                </span>
                <select
                  value={radioKm}
                  onChange={(evento) => setRadioKm(Number(evento.target.value))}
                  disabled={!usarRadio}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 disabled:bg-zinc-100"
                >
                  {[5, 10, 20, 50, 100].map((distancia) => (
                    <option key={distancia} value={distancia}>
                      {distancia} km
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setModoSeleccion("busqueda")}
                  className="rounded-lg border border-teal-700 px-4 py-2.5 text-sm font-medium text-teal-800 hover:bg-teal-50"
                >
                  Elegir centro en el mapa
                </button>
                {centroBusqueda ? (
                  <label className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={usarRadio}
                      onChange={(evento) => setUsarRadio(evento.target.checked)}
                      className="accent-teal-700"
                    />
                    Filtrar por cercanía
                  </label>
                ) : null}
                <button
                  type="submit"
                  disabled={buscando}
                  className="ml-auto rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {buscando ? "Buscando…" : "Buscar servicios"}
                </button>
              </div>
              {errorBusqueda ? (
                <p
                  role="alert"
                  className="text-sm text-red-700 sm:col-span-2"
                >
                  {errorBusqueda}
                </p>
              ) : null}
            </form>

            <MapaServicios
              items={resultado?.items ?? []}
              centroBusqueda={usarRadio ? centroBusqueda : null}
              radioKm={radioKm}
              ubicacionFormulario={leerUbicacion(latitud, longitud)}
              modoSeleccion={modoSeleccion}
              onSeleccionarUbicacion={seleccionarUbicacion}
            />

            <section aria-live="polite" className="space-y-4">
              {resultado ? (
                <p className="text-sm text-zinc-600">
                  {resultado.total}{" "}
                  {resultado.total === 1
                    ? "servicio encontrado"
                    : "servicios encontrados"}
                  {resultado.items.length < resultado.total
                    ? ` · mostrando ${resultado.items.length}`
                    : ""}
                </p>
              ) : (
                <p className="text-sm text-zinc-600">
                  Inicia una búsqueda para mostrar los servicios y sus
                  ubicaciones.
                </p>
              )}
              {resultado?.items.map((servicio) => (
                <article
                  key={`${servicio.kind}:${servicio.id}`}
                  className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
                >
                  {servicio.photos[0] ? (
                    <Image
                      src={servicio.photos[0]}
                      alt={`Foto de ${servicio.title}`}
                      width={112}
                      height={96}
                      unoptimized
                      className="h-24 w-28 shrink-0 rounded-lg object-cover"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <span className="text-xs font-semibold uppercase tracking-wide text-teal-800">
                      {servicio.category
                        ? etiquetasCategoria[servicio.category]
                        : "Servicio"}
                    </span>
                    <h2 className="mt-1 text-lg font-semibold">
                      {servicio.title}
                    </h2>
                    <p className="mt-1 line-clamp-3 text-sm text-zinc-600">
                      {servicio.description}
                    </p>
                    <p className="mt-2 text-sm font-medium">
                      ${Number(servicio.price).toLocaleString("es-AR")}
                    </p>
                    <InteraccionesPublicacion
                      tipo="servicios"
                      id={servicio.id}
                    />
                  </div>
                </article>
              ))}
              {resultado && resultado.items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-600">
                  No encontramos servicios con esos filtros. Prueba con otros
                  términos o amplía el radio.
                </p>
              ) : null}
            </section>
          </div>

          <aside className="h-fit rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Publicar un servicio</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Completa los datos y marca su ubicación en el mapa.{" "}
              {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
                <Link
                  href="/sign-in"
                  className="font-medium text-teal-800 underline"
                >
                  Inicia sesión
                </Link>
              ) : (
                "Configura Clerk para habilitar las publicaciones."
              )}
            </p>
            <form onSubmit={publicarServicio} className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Nombre</span>
                <input
                  required
                  minLength={3}
                  maxLength={160}
                  value={titulo}
                  onChange={(evento) => setTitulo(evento.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Tipo</span>
                <select
                  value={categoriaNueva}
                  onChange={(evento) =>
                    setCategoriaNueva(evento.target.value as ServiceType)
                  }
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5"
                >
                  <option value="taller">Taller</option>
                  <option value="lavadero">Lavadero</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  Descripción
                </span>
                <textarea
                  required
                  minLength={10}
                  maxLength={10_000}
                  rows={4}
                  value={descripcion}
                  onChange={(evento) => setDescripcion(evento.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  Precio de referencia
                </span>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={precio}
                  onChange={(evento) => setPrecio(evento.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  Fotos: URLs HTTPS, una por línea
                </span>
                <textarea
                  value={fotos}
                  onChange={(evento) => setFotos(evento.target.value)}
                  rows={3}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5"
                />
              </label>
              <button
                type="button"
                onClick={() => setModoSeleccion("publicacion")}
                className="w-full rounded-lg border border-teal-700 px-4 py-2.5 text-sm font-medium text-teal-800 hover:bg-teal-50"
              >
                Marcar ubicación en el mapa
              </button>
              {latitud && longitud ? (
                <p className="text-xs text-zinc-500">
                  Ubicación: {latitud}, {longitud}
                </p>
              ) : (
                <p className="text-xs text-zinc-500">
                  La ubicación es opcional. Haz clic en el mapa para agregarla.
                </p>
              )}
              {errorPublicacion ? (
                <p role="alert" className="text-sm text-red-700">
                  {errorPublicacion}
                </p>
              ) : null}
              {mensajePublicacion ? (
                <p role="status" className="text-sm text-teal-800">
                  {mensajePublicacion}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={publicando}
                className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-700 disabled:cursor-wait disabled:opacity-60"
              >
                {publicando ? "Publicando…" : "Publicar servicio"}
              </button>
            </form>
          </aside>
        </section>
      </div>
    </main>
  );
}
