import type {
  ListingType,
  MarketplaceSearchFilters,
  ServiceType,
} from "@/src/types";
import { buscarPublicaciones } from "@/lib/search/elasticsearch";

const serviceTypes: ReadonlySet<string> = new Set([
  "taller",
  "lavadero",
]);
const maxPage = 200;

class SolicitudBusquedaInvalida extends Error {}

function esTipoPublicacion(value: string): value is ListingType {
  return value === "car" || value === "service";
}

function esTipoServicio(value: string): value is ServiceType {
  return serviceTypes.has(value);
}

function leerTipoPublicacion(value: string | null): ListingType | undefined {
  if (value === null) {
    return undefined;
  }
  if (!esTipoPublicacion(value)) {
    throw new SolicitudBusquedaInvalida("El parámetro kind no es válido");
  }
  return value;
}

function leerTipoServicio(value: string | null): ServiceType | undefined {
  if (value === null) {
    return undefined;
  }
  if (!esTipoServicio(value)) {
    throw new SolicitudBusquedaInvalida("El parámetro category no es válido");
  }
  return value;
}

function leerNumeroOpcional(
  params: URLSearchParams,
  name: string,
  options: { integer?: boolean; minimum?: number; maximum?: number } = {},
): number | undefined {
  const value = params.get(name);
  if (value === null) {
    return undefined;
  }

  if (value.trim() === "") {
    throw new SolicitudBusquedaInvalida(`Parámetro inválido: ${name}`);
  }

  const parsed = Number(value);
  if (
    !Number.isFinite(parsed) ||
    (options.integer && !Number.isInteger(parsed)) ||
    (options.minimum !== undefined && parsed < options.minimum) ||
    (options.maximum !== undefined && parsed > options.maximum)
  ) {
    throw new SolicitudBusquedaInvalida(`Parámetro inválido: ${name}`);
  }
  return parsed;
}

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim() ?? "";

  try {
    let kind = leerTipoPublicacion(params.get("kind"));
    const category = leerTipoServicio(params.get("category"));
    if (
      query.length > 100 ||
      (query.length > 0 && query.length < 2) ||
      (query.length === 0 && !kind && !category)
    ) {
      throw new SolicitudBusquedaInvalida(
        "La búsqueda debe tener entre 2 y 100 caracteres",
      );
    }

    const minPrice = leerNumeroOpcional(params, "minPrice", { minimum: 0 });
    const maxPrice = leerNumeroOpcional(params, "maxPrice", { minimum: 0 });
    const minYear = leerNumeroOpcional(params, "minYear", {
      integer: true,
      minimum: 1886,
      maximum: new Date().getFullYear() + 1,
    });
    const maxYear = leerNumeroOpcional(params, "maxYear", {
      integer: true,
      minimum: 1886,
      maximum: new Date().getFullYear() + 1,
    });
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      throw new SolicitudBusquedaInvalida("minPrice no puede superar maxPrice");
    }
    if (minYear !== undefined && maxYear !== undefined && minYear > maxYear) {
      throw new SolicitudBusquedaInvalida("minYear no puede superar maxYear");
    }

    if (category && kind === "car") {
      throw new SolicitudBusquedaInvalida("category solo aplica a servicios");
    }
    if (
      kind === "service" &&
      (minYear !== undefined || maxYear !== undefined)
    ) {
      throw new SolicitudBusquedaInvalida(
        "Los filtros de año solo aplican a autos",
      );
    }
    if (category) {
      kind = "service";
    } else if ((minYear !== undefined || maxYear !== undefined) && !kind) {
      kind = "car";
    }

    const page =
      leerNumeroOpcional(params, "page", {
        integer: true,
        minimum: 1,
        maximum: maxPage,
      }) ?? 1;
    const pageSize =
      leerNumeroOpcional(params, "pageSize", {
        integer: true,
        minimum: 1,
        maximum: 50,
      }) ?? 20;

    const lat = leerNumeroOpcional(params, "lat", {
      minimum: -90,
      maximum: 90,
    });
    const lon = leerNumeroOpcional(params, "lng", {
      minimum: -180,
      maximum: 180,
    });
    const distance = params.get("distance") ?? "20km";
    if ((lat === undefined) !== (lon === undefined)) {
      throw new SolicitudBusquedaInvalida("lat y lng deben enviarse juntos");
    }
    if (
      !/^\d+(?:\.\d+)?km$/.test(distance) ||
      Number.parseFloat(distance) <= 0 ||
      Number.parseFloat(distance) > 100
    ) {
      throw new SolicitudBusquedaInvalida(
        "distance debe expresarse en kilómetros y no superar 100km",
      );
    }

    const filters: MarketplaceSearchFilters = {
      query,
      page,
      pageSize,
      ...(kind ? { kind } : {}),
      ...(category ? { category } : {}),
      ...(minPrice !== undefined ? { minPrice } : {}),
      ...(maxPrice !== undefined ? { maxPrice } : {}),
      ...(minYear !== undefined ? { minYear } : {}),
      ...(maxYear !== undefined ? { maxYear } : {}),
      ...(lat !== undefined && lon !== undefined
        ? { location: { lat, lon, distance } }
        : {}),
    };

    const result = await buscarPublicaciones(filters);
    return Response.json(result);
  } catch (error) {
    if (error instanceof SolicitudBusquedaInvalida) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("Elasticsearch marketplace search failed:", error);
    return Response.json(
      { error: "No se pudo completar la búsqueda" },
      { status: 503 },
    );
  }
}
