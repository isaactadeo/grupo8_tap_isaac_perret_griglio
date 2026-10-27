"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SubmitEvent } from "react";
import {
  construirParametrosBusqueda,
  formatearMiles,
} from "@/lib/marketplace/formato";

export interface ValoresBusquedaAutos {
  q?: string;
  minYear?: string;
  maxYear?: string;
  minPrice?: string;
  maxPrice?: string;
}

/**
 * Buscador de autos. La variante "tablero" va debajo de la foto del
 * inicio; la "lateral" acompaña los resultados con todos los filtros.
 */
export default function FormularioBusquedaAutos({
  variante,
  valores = {},
}: {
  variante: "tablero" | "lateral";
  valores?: ValoresBusquedaAutos;
}): React.JSX.Element {
  const router = useRouter();
  const hayFiltros = Object.values(valores).some(Boolean);
  const tablero = variante === "tablero";
  const claseCampo = tablero
    ? "campo min-h-12 bg-hueso pl-10 focus-visible:border-marca focus-visible:bg-papel focus-visible:outline-marca/15"
    : "campo";

  /** En el tablero, cada campo lleva un ícono a la izquierda. */
  function conIcono(trazo: React.ReactNode, campo: React.JSX.Element) {
    if (!tablero) {
      return campo;
    }
    return (
      <span className="relative block">
        <svg
          viewBox="0 0 20 20"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gris"
        >
          {trazo}
        </svg>
        {campo}
      </span>
    );
  }

  function buscar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault();
    const parametros = construirParametrosBusqueda(
      new FormData(evento.currentTarget),
    );
    const consulta = parametros.toString();
    router.push(consulta ? `/autos?${consulta}` : "/autos");
  }

  const campoTexto = (
    <label className={tablero ? "sm:col-span-2 lg:col-span-1" : ""}>
      <span className="etiqueta">Marca o modelo</span>
      {conIcono(
        <path d="M3 13.5V11l1.6-4.2A2 2 0 0 1 6.5 5.5h7a2 2 0 0 1 1.9 1.3L17 11v2.5M3 13.5h14M3 13.5V15m14-1.5V15M6 10.5h.01M14 10.5h.01" />,
        <input
          name="q"
          type="search"
          defaultValue={valores.q}
          minLength={2}
          maxLength={100}
          placeholder="Ej.: Gol Trend, Hilux, 208"
          className={claseCampo}
        />,
      )}
    </label>
  );

  const campoAnioDesde = (
    <label>
      <span className="etiqueta">Año desde</span>
      {conIcono(
        <path d="M4 5.5h12v10.5H4zM4 9h12M7.5 3.5v3M12.5 3.5v3" />,
        <input
          name="minYear"
          type="number"
          inputMode="numeric"
          min={1886}
          step={1}
          defaultValue={valores.minYear}
          placeholder="Ej.: 2015"
          className={claseCampo}
        />,
      )}
    </label>
  );

  const campoPrecioHasta = (
    <label>
      <span className="etiqueta">Presupuesto máximo</span>
      {conIcono(
        <path d="M13 6.5c-.6-1-1.7-1.5-3-1.5-1.7 0-3 .9-3 2.3 0 3.2 6 1.6 6 4.9 0 1.4-1.3 2.3-3 2.3-1.4 0-2.6-.6-3.2-1.6M10 3v14" />,
        <input
          name="maxPrice"
          type="text"
          inputMode="numeric"
          pattern="[0-9.$ ]*"
          title="Ingresá solo números, por ejemplo 15.000.000"
          defaultValue={formatearMiles(valores.maxPrice)}
          placeholder="Ej.: 15.000.000"
          className={claseCampo}
        />,
      )}
    </label>
  );

  if (tablero) {
    return (
      <form
        action="/autos"
        method="get"
        role="search"
        onSubmit={buscar}
        aria-labelledby="titulo-buscador"
        className="grid gap-4 rounded-2xl border border-linea border-t-4 border-t-marca bg-papel p-5 text-carbon shadow-[0_4px_8px_rgb(15_23_42/0.05),0_24px_60px_rgb(15_23_42/0.16)] sm:grid-cols-2 sm:p-8 lg:grid-cols-[1.6fr_1fr_1.2fr_auto] lg:items-end"
      >
        <div className="col-span-full mb-1">
          <p id="titulo-buscador" className="titular text-2xl">
            Buscá tu próximo auto
          </p>
          <p className="mt-1 text-sm text-gris">
            Completá uno o más filtros y encontrá autos publicados en Rafaela.
          </p>
        </div>
        {campoTexto}
        {campoAnioDesde}
        {campoPrecioHasta}
        <button type="submit" className="boton boton-principal min-h-12 sm:col-span-2 lg:col-span-1 lg:px-7">
          <svg
            viewBox="0 0 20 20"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="m13 13 4.5 4.5" />
          </svg>
          Buscar autos
        </button>
      </form>
    );
  }

  return (
    <form
      action="/autos"
      method="get"
      role="search"
      aria-label="Filtrar autos"
      onSubmit={buscar}
      className="grid gap-4"
    >
      {campoTexto}
      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="etiqueta">Año</legend>
        <label>
          <span className="sr-only">Año desde</span>
          <input
            name="minYear"
            type="number"
            inputMode="numeric"
            min={1886}
            step={1}
            defaultValue={valores.minYear}
            placeholder="Desde"
            className="campo"
          />
        </label>
        <label>
          <span className="sr-only">Año hasta</span>
          <input
            name="maxYear"
            type="number"
            inputMode="numeric"
            min={1886}
            step={1}
            defaultValue={valores.maxYear}
            placeholder="Hasta"
            className="campo"
          />
        </label>
      </fieldset>
      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="etiqueta">Precio</legend>
        <label>
          <span className="sr-only">Precio desde</span>
          <input
            name="minPrice"
            type="text"
            inputMode="numeric"
            pattern="[0-9.$ ]*"
            title="Ingresá solo números, por ejemplo 15.000.000"
            defaultValue={formatearMiles(valores.minPrice)}
            placeholder="Desde $"
            className="campo"
          />
        </label>
        <label>
          <span className="sr-only">Precio hasta</span>
          <input
            name="maxPrice"
            type="text"
            inputMode="numeric"
            pattern="[0-9.$ ]*"
            title="Ingresá solo números, por ejemplo 15.000.000"
            defaultValue={formatearMiles(valores.maxPrice)}
            placeholder="Hasta $"
            className="campo"
          />
        </label>
      </fieldset>
      <button type="submit" className="boton boton-principal">
        Buscar autos
      </button>
      {hayFiltros ? (
        <Link href="/autos" className="enlace justify-self-start text-sm">
          Quitar filtros
        </Link>
      ) : null}
    </form>
  );
}
