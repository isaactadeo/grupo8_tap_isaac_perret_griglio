const formatoPrecio = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const formatoFecha = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Argentina/Cordoba",
});

export function formatearPrecio(precio: number | string): string {
  const valor = Number(precio);
  return Number.isFinite(valor) ? formatoPrecio.format(valor) : "Consultar";
}

export function formatearUbicacion(
  ciudad: string | null | undefined,
  provincia: string | null | undefined,
): string | undefined {
  const partes = [ciudad, provincia].filter(Boolean);
  return partes.length > 0 ? partes.join(", ") : undefined;
}

export function formatearFecha(fecha: Date | string): string {
  return formatoFecha.format(new Date(fecha));
}

export const marcasFrecuentes = [
  "Volkswagen",
  "Toyota",
  "Fiat",
  "Chevrolet",
  "Ford",
  "Renault",
  "Peugeot",
] as const;

const camposBusquedaAutos = [
  "q",
  "minYear",
  "maxYear",
  "minPrice",
  "maxPrice",
] as const;

/**
 * Arma los parámetros de /autos sin campos vacíos, para URLs limpias.
 * Años y precios aceptan separadores de miles ("15.000.000").
 */
export function construirParametrosBusqueda(
  datos: FormData | URLSearchParams,
): URLSearchParams {
  const parametros = new URLSearchParams();
  for (const campo of camposBusquedaAutos) {
    const valor = datos.get(campo);
    if (typeof valor !== "string") {
      continue;
    }
    const limpio =
      campo === "q" ? valor.trim() : valor.replace(/[^\d]/g, "");
    if (limpio) {
      parametros.set(campo, limpio);
    }
  }
  return parametros;
}

/** Muestra un número entero de la URL con separadores de miles. */
export function formatearMiles(valor: string | undefined): string | undefined {
  if (!valor || !/^\d+$/.test(valor)) {
    return valor;
  }
  return Number(valor).toLocaleString("es-AR");
}
