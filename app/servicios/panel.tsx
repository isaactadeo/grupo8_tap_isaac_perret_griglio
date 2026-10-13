"use client";

import Image from "next/image";
import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { useState, type SubmitEvent } from "react";
import SelectorFotos, {
  liberarVistaPrevia,
  type FotoCargada,
} from "@/app/_componentes/selector-fotos";
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

function leerUbicacion(
  latitud: string,
  longitud: string,
): GeoCoordinates | null {
  if (!latitud.trim() || !longitud.trim()) {
    return null;
  }
  return { lat: Number(latitud), lng: Number(longitud) };
}

export default function PanelServicios({
  subidaFotosHabilitada,
}: {
  subidaFotosHabilitada: boolean;
}): React.JSX.Element {
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
  const [fotos, setFotos] = useState<FotoCargada[]>([]);
  const [latitud, setLatitud] = useState("");
  const [longitud, setLongitud] = useState("");
  const [publicando, setPublicando] = useState(false);
  const [mensajePublicacion, setMensajePublicacion] = useState<string | null>(
    null,
  );
  const [errorPublicacion, setErrorPublicacion] = useState<string | null>(null);

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

  async function publicarServicio(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensajePublicacion(null);
    setErrorPublicacion(null);
    if (fotos.some((foto) => foto.estado === "subiendo")) {
      setErrorPublicacion("Esperá a que terminen de subirse las fotos.");
      return;
    }
    if (fotos.some((foto) => foto.estado === "error")) {
      setErrorPublicacion("Hay fotos que no se subieron. Reintentalas o quitalas.");
      return;
    }
    setPublicando(true);

    const ubicacion = leerUbicacion(latitud, longitud);
    const listaFotos = fotos.flatMap((foto) => (foto.url ? [foto.url] : []));

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
      fotos.forEach(liberarVistaPrevia);
      setFotos([]);
      setMensajePublicacion("Servicio publicado.");
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
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-10 pb-20 sm:px-8">
      <h1 className="condensada text-titulo font-extrabold text-vidrio">
        Talleres y lavaderos
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-niebla">
        Buscá por nombre o descripción, filtrá por tipo y mirá dónde quedan en
        el mapa de Rafaela.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
        <div className="min-w-0 space-y-6">
          <form
            onSubmit={buscarServicios}
            role="search"
            aria-label="Buscar servicios"
            className="grid gap-4 rounded-2xl border border-linea bg-papel p-5 sm:grid-cols-2"
          >
            <label className="sm:col-span-2">
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
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <button
                type="button"
                onClick={() => setModoSeleccion("busqueda")}
                aria-pressed={modoSeleccion === "busqueda"}
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
              <button
                type="submit"
                disabled={buscando}
                className="boton boton-principal w-full sm:ml-auto sm:w-auto"
              >
                {buscando ? "Buscando…" : "Buscar servicios"}
              </button>
            </div>
            {errorBusqueda ? (
              <p role="alert" className="text-sm font-medium text-alerta sm:col-span-2">
                {errorBusqueda}
              </p>
            ) : null}
          </form>

          <div>
            <MapaServicios
              items={resultado?.items ?? []}
              centroBusqueda={usarRadio ? centroBusqueda : null}
              radioKm={radioKm}
              ubicacionFormulario={leerUbicacion(latitud, longitud)}
              modoSeleccion={modoSeleccion}
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
              <li className="flex items-center gap-2">
                <span
                  className="size-3 rounded-full bg-tiza ring-2 ring-vidrio"
                  aria-hidden="true"
                />
                Ubicación de tu servicio
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

        <aside className="h-fit rounded-2xl border border-linea bg-papel p-5 sm:p-6 lg:sticky lg:top-6">
          <h2 className="condensada text-subtitulo font-extrabold text-vidrio">
            Publicar un servicio
          </h2>
          <p className="mt-2 text-sm text-niebla">
            Completá los datos y marcá la ubicación en el mapa.{" "}
            {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
              <>
                Necesitás{" "}
                <Link href="/sign-in" className="enlace">
                  iniciar sesión
                </Link>
                .
              </>
            ) : (
              "Configurá Clerk para habilitar las publicaciones."
            )}
          </p>
          <form onSubmit={publicarServicio} className="mt-5 space-y-4">
            <label className="block">
              <span className="etiqueta">Nombre</span>
              <input
                required
                minLength={3}
                maxLength={160}
                value={titulo}
                onChange={(evento) => setTitulo(evento.target.value)}
                className="campo"
              />
            </label>
            <label className="block">
              <span className="etiqueta">Tipo</span>
              <select
                value={categoriaNueva}
                onChange={(evento) =>
                  setCategoriaNueva(evento.target.value as ServiceType)
                }
                className="campo"
              >
                <option value="taller">Taller</option>
                <option value="lavadero">Lavadero</option>
              </select>
            </label>
            <label className="block">
              <span className="etiqueta">Descripción</span>
              <textarea
                required
                minLength={10}
                maxLength={10_000}
                rows={4}
                value={descripcion}
                onChange={(evento) => setDescripcion(evento.target.value)}
                className="campo"
              />
            </label>
            <label className="block">
              <span className="etiqueta">Precio de referencia</span>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={precio}
                onChange={(evento) => setPrecio(evento.target.value)}
                className="campo"
              />
            </label>
            <fieldset>
              <legend className="etiqueta">Fotos</legend>
              {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
                <Show
                  when="signed-in"
                  fallback={
                    <p className="ayuda mt-0">Iniciá sesión para subir fotos.</p>
                  }
                >
                  <SelectorFotos
                    fotos={fotos}
                    onCambio={setFotos}
                    habilitado={subidaFotosHabilitada}
                    carpeta="servicios"
                  />
                </Show>
              ) : (
                <p className="ayuda mt-0">Configurá Clerk para subir fotos.</p>
              )}
            </fieldset>
            <div>
              <button
                type="button"
                onClick={() => setModoSeleccion("publicacion")}
                aria-pressed={modoSeleccion === "publicacion"}
                className="boton boton-secundario w-full"
              >
                Marcar ubicación en el mapa
              </button>
              <p className="ayuda">
                {latitud && longitud
                  ? `Ubicación: ${latitud}, ${longitud}`
                  : "Opcional. Tocá el mapa para agregarla."}
              </p>
            </div>
            {errorPublicacion ? (
              <p role="alert" className="text-sm font-medium text-alerta">
                {errorPublicacion}
              </p>
            ) : null}
            {mensajePublicacion ? (
              <p role="status" className="text-sm font-medium text-vidrio">
                {mensajePublicacion}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={
                publicando || fotos.some((foto) => foto.estado === "subiendo")
              }
              className="boton boton-principal w-full"
            >
              {publicando ? "Publicando…" : "Publicar servicio"}
            </button>
          </form>
        </aside>
      </div>
    </main>
  );
}
