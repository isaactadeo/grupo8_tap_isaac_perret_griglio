"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import FormularioBusquedaAutos from "@/app/_componentes/formulario-busqueda-autos";
import TarjetaAuto from "@/app/_componentes/tarjeta-auto";
import {
  construirParametrosBusqueda,
  formatearUbicacion,
} from "@/lib/marketplace/formato";
import type { MarketplaceSearchDocument } from "@/src/types";

const tamanoPagina = 24;
// GET /api/search acepta hasta la página 200.
const paginaMaxima = 200;

interface ResultadoBusquedaAutos {
  items: MarketplaceSearchDocument[];
  total: number;
  totalRelation?: "eq" | "gte";
}

type EstadoBusqueda =
  | { clave: string; resultado: ResultadoBusquedaAutos }
  | { clave: string; error: string };

function leerMensajeError(datos: unknown): string {
  if (
    typeof datos === "object" &&
    datos !== null &&
    "error" in datos &&
    typeof datos.error === "string"
  ) {
    return datos.error;
  }
  return "No se pudo completar la búsqueda.";
}

function esResultado(datos: unknown): datos is ResultadoBusquedaAutos {
  return (
    typeof datos === "object" &&
    datos !== null &&
    "items" in datos &&
    Array.isArray(datos.items) &&
    "total" in datos &&
    typeof datos.total === "number"
  );
}

function leerPagina(valor: string | null): number {
  const pagina = Number(valor);
  return Number.isInteger(pagina) && pagina >= 1
    ? Math.min(pagina, paginaMaxima)
    : 1;
}

function Paginacion({
  filtros,
  pagina,
  totalPaginas,
}: {
  filtros: URLSearchParams;
  pagina: number;
  totalPaginas: number;
}): React.JSX.Element | null {
  if (totalPaginas <= 1) {
    return null;
  }

  function enlacePagina(destino: number): string {
    const parametros = new URLSearchParams(filtros);
    if (destino > 1) {
      parametros.set("page", String(destino));
    }
    const consulta = parametros.toString();
    return consulta ? `/autos?${consulta}` : "/autos";
  }

  const clasesEnlace = "boton boton-secundario min-w-28";
  return (
    <nav
      aria-label="Páginas de resultados"
      className="mt-12 flex items-center justify-between gap-4 border-t border-linea pt-6"
    >
      {pagina > 1 ? (
        <Link href={enlacePagina(pagina - 1)} className={clasesEnlace}>
          Anterior
        </Link>
      ) : (
        <span className="min-w-28" />
      )}
      <p className="text-sm text-niebla">
        Página {pagina} de {totalPaginas}
      </p>
      {pagina < totalPaginas ? (
        <Link href={enlacePagina(pagina + 1)} className={clasesEnlace}>
          Siguiente
        </Link>
      ) : (
        <span className="min-w-28" />
      )}
    </nav>
  );
}

export default function BuscadorAutos(): React.JSX.Element {
  const parametrosUrl = useSearchParams();
  const filtros = construirParametrosBusqueda(parametrosUrl);
  const textoFiltros = filtros.toString();
  const pagina = leerPagina(parametrosUrl.get("page"));
  const cantidadFiltros = [...filtros.keys()].length;

  const [estado, setEstado] = useState<EstadoBusqueda | null>(null);
  const [intento, setIntento] = useState(0);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  const consultaApi = new URLSearchParams(filtros);
  consultaApi.set("kind", "car");
  consultaApi.set("pageSize", String(tamanoPagina));
  if (pagina > 1) {
    consultaApi.set("page", String(pagina));
  }
  const textoConsulta = consultaApi.toString();
  const clave = `${textoConsulta}#${intento}`;

  useEffect(() => {
    const controlador = new AbortController();
    const claveSolicitud = `${textoConsulta}#${intento}`;

    fetch(`/api/search?${textoConsulta}`, { signal: controlador.signal })
      .then(async (respuesta) => {
        const datos: unknown = await respuesta.json();
        if (!respuesta.ok) {
          throw new Error(leerMensajeError(datos));
        }
        if (!esResultado(datos)) {
          throw new Error("La respuesta de búsqueda no tiene un formato válido.");
        }
        setEstado({ clave: claveSolicitud, resultado: datos });
      })
      .catch((error: unknown) => {
        if (controlador.signal.aborted) {
          return;
        }
        setEstado({
          clave: claveSolicitud,
          error:
            error instanceof Error
              ? error.message
              : "No se pudo completar la búsqueda.",
        });
      });

    return () => controlador.abort();
  }, [textoConsulta, intento]);

  const cargando = estado?.clave !== clave;
  const resultado = estado && "resultado" in estado ? estado.resultado : null;
  const termino = filtros.get("q");

  let resumen: string;
  if (cargando) {
    resumen = "Buscando autos…";
  } else if (resultado) {
    const cantidad = `${resultado.total.toLocaleString("es-AR")}${
      resultado.totalRelation === "gte" ? " o más" : ""
    }`;
    const sustantivo = resultado.total === 1 ? "auto" : "autos";
    resumen = termino
      ? `${cantidad} ${sustantivo} para “${termino}”`
      : `${cantidad} ${sustantivo} ${resultado.total === 1 ? "publicado" : "publicados"}`;
  } else {
    resumen = "No se pudo completar la búsqueda";
  }

  const totalPaginas = resultado
    ? Math.min(Math.ceil(resultado.total / tamanoPagina), paginaMaxima)
    : 0;

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12">
      <aside className="self-start lg:sticky lg:top-6">
        <button
          type="button"
          onClick={() => setFiltrosAbiertos((abiertos) => !abiertos)}
          aria-expanded={filtrosAbiertos}
          aria-controls="panel-filtros"
          className="boton boton-secundario w-full lg:hidden"
        >
          {filtrosAbiertos ? "Ocultar filtros" : "Filtrar"}
          {cantidadFiltros > 0 ? ` (${cantidadFiltros})` : ""}
        </button>
        <div
          id="panel-filtros"
          className={`${filtrosAbiertos ? "mt-3 block" : "hidden"} rounded-2xl border border-linea bg-papel p-5 lg:mt-0 lg:block`}
        >
          <FormularioBusquedaAutos
            key={textoFiltros}
            variante="lateral"
            valores={{
              q: filtros.get("q") ?? undefined,
              minYear: filtros.get("minYear") ?? undefined,
              maxYear: filtros.get("maxYear") ?? undefined,
              minPrice: filtros.get("minPrice") ?? undefined,
              maxPrice: filtros.get("maxPrice") ?? undefined,
            }}
          />
        </div>
      </aside>

      <section aria-labelledby="resumen-resultados" aria-busy={cargando}>
        <p
          id="resumen-resultados"
          role="status"
          className="mb-6 text-lg font-semibold text-vidrio-hondo"
        >
          {resumen}
        </p>

        {estado && "error" in estado && !cargando ? (
          <div role="alert" className="rounded-2xl border border-alerta/30 bg-papel p-6">
            <p className="font-semibold text-alerta">{estado.error}</p>
            <p className="mt-1 text-niebla">
              Revisá los filtros o volvé a intentar en unos segundos.
            </p>
            <button
              type="button"
              onClick={() => setIntento((valor) => valor + 1)}
              className="boton boton-secundario mt-4"
            >
              Reintentar
            </button>
          </div>
        ) : null}

        {resultado && resultado.items.length > 0 ? (
          <ul
            className={`grid gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3 ${
              cargando ? "opacity-55" : ""
            }`}
          >
            {resultado.items.map((auto, indice) => (
              <li key={auto.id}>
                <TarjetaAuto
                  encabezado="h2"
                  destacada={indice < 3}
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
        ) : null}

        {!estado && cargando ? (
          <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
            {Array.from({ length: 6 }, (_, indice) => (
              <div key={indice} className="space-y-3">
                <div className="aspect-[4/3] rounded-[1.125rem] bg-hormigon-hondo motion-safe:animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-hormigon-hondo" />
                <div className="h-4 w-1/3 rounded bg-hormigon-hondo" />
              </div>
            ))}
          </div>
        ) : null}

        {resultado && resultado.items.length === 0 && !cargando ? (
          <div className="rounded-2xl border border-dashed border-linea p-8">
            <p className="text-lg font-semibold">
              {pagina > 1
                ? "No hay más autos en esta página."
                : "No hay autos con esos filtros."}
            </p>
            <p className="mt-1 max-w-prose text-niebla">
              Probá con otra marca o modelo, ampliá el rango de años o subí el
              presupuesto.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {cantidadFiltros > 0 || pagina > 1 ? (
                <Link href="/autos" className="boton boton-principal">
                  Ver todos los autos
                </Link>
              ) : (
                <Link href="/autos/publicar" className="boton boton-principal">
                  Publicar auto
                </Link>
              )}
            </div>
          </div>
        ) : null}

        {resultado && !cargando ? (
          <Paginacion
            filtros={filtros}
            pagina={pagina}
            totalPaginas={totalPaginas}
          />
        ) : null}
      </section>
    </div>
  );
}
