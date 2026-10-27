"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SubmitEvent,
} from "react";
import InteraccionesPublicacion from "@/app/componentes/interacciones-publicacion";
import MapaServicios from "./mapa";
import { crearEnlaceComoLlegar } from "./enlace-direcciones";
import {
  InsigniaVerificado,
  MarcaVerificado,
  NombreVendedor,
} from "@/app/_componentes/vendedor";
import {
  formatearDistanciaRuta,
  formatearDuracionRuta,
  obtenerRutaOSRM,
  obtenerUbicacionActual,
  type RutaVehicular,
} from "./rutas";
import { formatearPrecio } from "@/lib/marketplace/formato";
import type {
  GeoCoordinates,
  MapViewport,
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

const insigniasCategoria: Record<ServiceType, string> = {
  taller: "bg-taller-suave text-taller",
  lavadero: "bg-lavadero-suave text-lavadero",
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
  const [vistaActual, setVistaActual] = useState<MapViewport | null>(null);
  const vistaActualRef = useRef<MapViewport | null>(null);
  const ubicacionDisponibleRef = useRef<GeoCoordinates | null>(null);
  const buscarCercaPendienteRef = useRef(false);
  const [ubicacionDisponible, setUbicacionDisponible] =
    useState<GeoCoordinates | null>(null);
  const [solicitudCentrar, setSolicitudCentrar] =
    useState<GeoCoordinates | null>(null);
  const [obteniendoUbicacion, setObteniendoUbicacion] = useState(false);
  const [errorUbicacion, setErrorUbicacion] = useState<string | null>(null);
  const [resultado, setResultado] =
    useState<ResultadoBusquedaServicios | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [ruta, setRuta] = useState<RutaVehicular | null>(null);
  const [cargandoRuta, setCargandoRuta] = useState(false);
  const [errorRuta, setErrorRuta] = useState<string | null>(null);
  const solicitudRutaRef = useRef(0);
  const controladorRutaRef = useRef<AbortController | null>(null);

  const solicitarRuta = useCallback(
    async (destino: GeoCoordinates, titulo: string) => {
      controladorRutaRef.current?.abort();
      const controlador = new AbortController();
      controladorRutaRef.current = controlador;
      const solicitud = ++solicitudRutaRef.current;
      setCargandoRuta(true);
      setErrorRuta(null);
      setRuta(null);

      try {
        const origen = await obtenerUbicacionActual();
        if (controlador.signal.aborted) {
          return;
        }
        const nuevaRuta = await obtenerRutaOSRM(
          origen,
          destino,
          titulo,
          controlador.signal,
        );
        if (solicitudRutaRef.current === solicitud) {
          setRuta(nuevaRuta);
        }
      } catch (error) {
        if (!controlador.signal.aborted && solicitudRutaRef.current === solicitud) {
          setErrorRuta(
            error instanceof Error
              ? error.message
              : "No se pudo calcular la ruta.",
          );
        }
      } finally {
        if (solicitudRutaRef.current === solicitud) {
          setCargandoRuta(false);
        }
      }
    },
    [],
  );

  function limpiarRuta() {
    solicitudRutaRef.current += 1;
    controladorRutaRef.current?.abort();
    controladorRutaRef.current = null;
    setCargandoRuta(false);
    setRuta(null);
    setErrorRuta(null);

    const parametros = new URLSearchParams(window.location.search);
    parametros.delete("destinoLat");
    parametros.delete("destinoLng");
    parametros.delete("destinoNombre");
    const consulta = parametros.toString();
    const url = `${window.location.pathname}${
      consulta ? `?${consulta}` : ""
    }${window.location.hash}`;
    window.history.replaceState(null, "", url);
  }

  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);
    const lat = Number(parametros.get("destinoLat"));
    const lng = Number(parametros.get("destinoLng"));
    let temporizador: number | undefined;
    if (
      parametros.has("destinoLat") &&
      parametros.has("destinoLng") &&
      Number.isFinite(lat) &&
      lat >= -90 &&
      lat <= 90 &&
      Number.isFinite(lng) &&
      lng >= -180 &&
      lng <= 180
    ) {
      temporizador = window.setTimeout(() => {
        void solicitarRuta(
          { lat, lng },
          parametros.get("destinoNombre") || "el servicio seleccionado",
        );
      }, 0);
    }

    return () => {
      if (temporizador !== undefined) {
        window.clearTimeout(temporizador);
      }
      solicitudRutaRef.current += 1;
      controladorRutaRef.current?.abort();
    };
  }, [solicitarRuta]);

  function cambiarVista(vista: MapViewport) {
    vistaActualRef.current = vista;
    setVistaActual(vista);
    if (buscarCercaPendienteRef.current) {
      buscarCercaPendienteRef.current = false;
      void ejecutarBusqueda({
        vistaMapa: vista,
        origen: ubicacionDisponibleRef.current,
      });
    }
  }

  async function ejecutarBusqueda(opciones?: {
    vistaMapa?: MapViewport;
    origen?: GeoCoordinates | null;
  }) {
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
      const vista = opciones?.vistaMapa ?? vistaActualRef.current;
      if (vista) {
        parametros.set("north", String(vista.north));
        parametros.set("south", String(vista.south));
        parametros.set("east", String(vista.east));
        parametros.set("west", String(vista.west));
      }
      const origen =
        opciones?.origen ??
        ubicacionDisponibleRef.current ??
        (vista
          ? {
              lat: (vista.north + vista.south) / 2,
              lng: (vista.east + vista.west) / 2,
            }
          : null);
      if (origen) {
        parametros.set("originLat", String(origen.lat));
        parametros.set("originLng", String(origen.lng));
      }
      parametros.set("pageSize", "50");

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

  function buscarServicios(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault();
    const vista = vistaActualRef.current;
    if (!vista) {
      setErrorBusqueda("El mapa todavía se está cargando.");
      return;
    }
    void ejecutarBusqueda({
      vistaMapa: vista,
      origen: ubicacionDisponibleRef.current,
    });
  }

  async function usarUbicacionActual() {
    setObteniendoUbicacion(true);
    setErrorUbicacion(null);

    try {
      const ubicacion = await obtenerUbicacionActual();
      ubicacionDisponibleRef.current = ubicacion;
      setUbicacionDisponible(ubicacion);
      setSolicitudCentrar(ubicacion);
      buscarCercaPendienteRef.current = true;
    } catch (error) {
      setErrorUbicacion(
        error instanceof Error
          ? error.message
          : "No se pudo determinar tu ubicación actual.",
      );
    } finally {
      setObteniendoUbicacion(false);
    }
  }

  function centrarUbicacion() {
    const ubicacion = ubicacionDisponibleRef.current;
    if (ubicacion) {
      buscarCercaPendienteRef.current = true;
      setSolicitudCentrar({ ...ubicacion });
    }
  }

  function obtenerOCentrarUbicacion() {
    if (ubicacionDisponibleRef.current) {
      centrarUbicacion();
      return;
    }
    void usarUbicacionActual();
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-10 pb-20 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <h1 className="titular text-titulo">
            Talleres y lavaderos
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-gris">
            Buscá por nombre o descripción, filtrá por tipo y explorá los
            servicios que aparecen en la zona visible del mapa.
          </p>
        </div>
        <Link href="/servicios/publicar" className="boton boton-principal">
          Publicar servicio
        </Link>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-10">
        <div className="flex h-fit flex-col gap-4 lg:sticky lg:top-6">
          <form
            onSubmit={buscarServicios}
            role="search"
            aria-label="Buscar servicios"
            className="grid gap-4 rounded-xl border border-linea bg-papel p-5"
          >
            <label>
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
            <button
              type="submit"
              disabled={buscando || obteniendoUbicacion || !vistaActual}
              className="boton boton-principal w-full"
            >
              {buscando ? "Buscando…" : "Buscar servicios"}
            </button>
            {errorBusqueda ? (
              <p role="alert" className="text-sm font-medium text-alerta">
              {errorBusqueda}
              </p>
            ) : null}
          </form>

          <section
            aria-label="Ubicación"
            className="grid gap-4 rounded-xl border border-linea bg-papel p-5"
          >
            <h2 className="text-base font-semibold text-tinta">Ubicación</h2>
            <button
              type="button"
              onClick={obtenerOCentrarUbicacion}
              disabled={obteniendoUbicacion || buscando}
              className="boton boton-principal w-full"
            >
              {obteniendoUbicacion
                ? "Obteniendo ubicación…"
                : ubicacionDisponible
                  ? "Centrar ubicación"
                  : "Obtener ubicación"}
            </button>
            {errorUbicacion ? (
              <p role="alert" className="text-sm font-medium text-alerta">
                {errorUbicacion}
              </p>
            ) : null}
          </section>
        </div>

        <div className="min-w-0 space-y-6">
          <div className="relative">
            <MapaServicios
              items={resultado?.items ?? []}
              ubicacionFormulario={null}
              ubicacionUsuario={ubicacionDisponible}
              centrarEnUbicacion={solicitudCentrar}
              modoSeleccion={null}
              onCambiarVista={cambiarVista}
              ruta={ruta}
              onSolicitarRuta={solicitarRuta}
            />
            {cargandoRuta || ruta || errorRuta ? (
              <section
                className="tarjeta-ruta mt-3 p-4 text-sm"
                aria-live="polite"
                aria-label="Resumen de ruta"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ruta-suave text-ruta">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="size-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 4v5a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3v5" />
                      <circle cx="6" cy="4" r="2" />
                      <circle cx="18" cy="20" r="2" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gris">
                      {cargandoRuta
                        ? "Preparando recorrido"
                        : errorRuta
                          ? "No se pudo calcular"
                          : "Ruta estimada"}
                    </p>
                    <p className="mt-0.5 font-semibold leading-snug text-tinta">
                      {cargandoRuta
                        ? "Buscando tu ubicación…"
                        : ruta?.titulo ?? "Intentá de nuevo en un momento."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={limpiarRuta}
                    aria-label="Quitar ruta"
                    title="Quitar ruta"
                    className="grid size-9 shrink-0 place-items-center rounded-full text-gris transition hover:bg-hueso-hondo hover:text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ruta"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="size-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    >
                      <path d="m6 6 12 12M18 6 6 18" />
                    </svg>
                  </button>
                </div>
                {ruta ? (
                  <>
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-md">
                      <div className="rounded-xl bg-hueso p-3">
                        <p className="text-xs font-medium text-gris">
                          Distancia
                        </p>
                        <p className="mt-0.5 text-lg font-semibold text-tinta">
                          {formatearDistanciaRuta(ruta.distanciaMetros)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-hueso p-3">
                        <p className="text-xs font-medium text-gris">
                          Tiempo estimado
                        </p>
                        <p className="mt-0.5 text-lg font-semibold text-tinta">
                          {formatearDuracionRuta(ruta.duracionSegundos)}
                        </p>
                      </div>
                    </div>
                    <a
                      href={crearEnlaceComoLlegar(
                        ruta.destino.lat,
                        ruta.destino.lng,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="boton boton-secundario mt-3 w-full rounded-xl sm:w-auto"
                    >
                      Abrir en Google Maps
                    </a>
                  </>
                ) : null}
                {cargandoRuta ? (
                  <p role="status" className="mt-3 text-gris">
                    Obteniendo tu ubicación y calculando el trayecto.
                  </p>
                ) : null}
                {errorRuta ? (
                  <p role="alert" className="mt-3 font-medium text-alerta">
                    {errorRuta}
                  </p>
                ) : null}
              </section>
            ) : null}
            <ul
              aria-label="Referencias del mapa"
              className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gris"
            >
              <li className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-taller" aria-hidden="true" />
                Talleres
              </li>
              <li className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-lavadero" aria-hidden="true" />
                Lavaderos
              </li>
              <li className="flex items-center gap-2">
                <MarcaVerificado />
                Local verificado (marcador más grande, con borde dorado)
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
                  <span className="font-normal text-gris">
                    {" "}
                    (se muestran {resultado.items.length})
                  </span>
                ) : null}
              </p>
            ) : (
              <p className="text-gris">
                Buscá para ver los servicios y sus ubicaciones en el mapa.
              </p>
            )}

            {resultado && resultado.items.length > 0 ? (
              <ul className="mt-4 divide-y divide-linea border-y border-linea">
                {resultado.items.map((servicio) => {
                  const ubicacion = servicio.location;
                  const verificado = servicio.ownerVerified === true;
                  return (
                    <li
                      key={`${servicio.kind}:${servicio.id}`}
                      className={`flex gap-4 py-5 ${
                        verificado
                          ? "my-2 rounded-xl border-2 border-destacado bg-destacado-suave px-4"
                          : ""
                      }`}
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
                        <p className="flex flex-wrap gap-1.5">
                          <span
                            className={`insignia ${
                              servicio.category
                                ? insigniasCategoria[servicio.category]
                                : "bg-hueso-hondo text-gris"
                            }`}
                          >
                            {servicio.category
                              ? etiquetasCategoria[servicio.category]
                              : "Servicio"}
                          </span>
                          {verificado ? <InsigniaVerificado /> : null}
                        </p>
                        <h2 className="mt-1 text-lg leading-snug font-semibold">
                          {servicio.title}
                        </h2>
                        <NombreVendedor
                          nombre={servicio.ownerName}
                          verificado={servicio.ownerVerified === true}
                          className="max-w-full text-sm text-gris"
                        />
                        <p className="mt-1 line-clamp-3 max-w-prose text-gris">
                          {servicio.description}
                        </p>
                        <p className="mt-2 text-sm">
                          <span className="text-gris">Precio de referencia </span>
                          <span className="font-bold">
                            {formatearPrecio(servicio.price)}
                          </span>
                        </p>
                        {servicio.ratingCount ? (
                          <p className="mt-1 text-sm font-medium text-tinta">
                            <span className="text-amber-500" aria-hidden="true">
                              ★
                            </span>{" "}
                            {servicio.averageRating?.toLocaleString("es-AR", {
                              maximumFractionDigits: 1,
                            })}{" "}
                            <span className="font-normal text-gris">
                              ({servicio.ratingCount}{" "}
                              {servicio.ratingCount === 1
                                ? "calificación"
                                : "calificaciones"}
                              )
                            </span>
                          </p>
                        ) : null}
                        {ubicacion ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                void solicitarRuta(
                                  { lat: ubicacion.lat, lng: ubicacion.lon },
                                  servicio.title,
                                )
                              }
                              className="boton boton-ruta"
                            >
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                className="size-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M6 4v5a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3v5" />
                                <circle cx="6" cy="4" r="2" />
                                <circle cx="18" cy="20" r="2" />
                              </svg>
                              Cómo llegar
                            </button>
                            <a
                              href={crearEnlaceComoLlegar(
                                ubicacion.lat,
                                ubicacion.lon,
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="boton boton-secundario min-h-9 px-3 py-1.5 text-sm"
                            >
                              Abrir en Google Maps
                            </a>
                          </div>
                        ) : null}
                        <InteraccionesPublicacion
                          tipo="servicios"
                          id={servicio.id}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {resultado && resultado.items.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-linea p-6">
                <p className="font-semibold">
                  No hay servicios con esos filtros.
                </p>
                <p className="mt-1 text-gris">
                  Probá moviendo el mapa o ajustando los filtros.
                </p>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
