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
 * Buscador de autos. La variante "tablero" se apoya sobre la foto del
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

  function buscar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault();
    const parametros = construirParametrosBusqueda(
      new FormData(evento.currentTarget),
    );
    const consulta = parametros.toString();
    router.push(consulta ? `/autos?${consulta}` : "/autos");
  }

  const campoTexto = (
    <label className={variante === "tablero" ? "sm:col-span-2 lg:col-span-1" : ""}>
      <span className="etiqueta">Marca o modelo</span>
      <input
        name="q"
        type="search"
        defaultValue={valores.q}
        minLength={2}
        maxLength={100}
        placeholder="Ej.: Gol Trend, Hilux, 208"
        className="campo"
      />
    </label>
  );

  const campoAnioDesde = (
    <label>
      <span className="etiqueta">Año desde</span>
      <input
        name="minYear"
        type="number"
        inputMode="numeric"
        min={1886}
        step={1}
        defaultValue={valores.minYear}
        placeholder="Ej.: 2015"
        className="campo"
      />
    </label>
  );

  const campoPrecioHasta = (
    <label>
      <span className="etiqueta">Presupuesto máximo</span>
      <input
        name="maxPrice"
        type="text"
        inputMode="numeric"
        pattern="[0-9.$ ]*"
        title="Ingresá solo números, por ejemplo 15.000.000"
        defaultValue={formatearMiles(valores.maxPrice)}
        placeholder="Ej.: 15.000.000"
        className="campo"
      />
    </label>
  );

  if (variante === "tablero") {
    return (
      <form
        action="/autos"
        method="get"
        role="search"
        onSubmit={buscar}
        className="grid gap-4 rounded-2xl border border-linea bg-papel p-4 text-carbon shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:grid-cols-2 sm:p-6 lg:grid-cols-[1.6fr_1fr_1.2fr_auto] lg:items-end"
      >
        {campoTexto}
        {campoAnioDesde}
        {campoPrecioHasta}
        <button type="submit" className="boton boton-principal sm:col-span-2 lg:col-span-1 lg:px-6">
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
