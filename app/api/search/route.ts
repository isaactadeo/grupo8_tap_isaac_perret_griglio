import type {
  ListingType,
  MarketplaceSearchFilters,
  ServiceType,
} from "@/src/types";
import { buscarPublicaciones } from "@/lib/search/elasticsearch";
import { obtenerResumenCalificacionesServicios } from "@/lib/marketplace/repositorio";

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

function distanciaEntreUbicaciones(
  primera: { lat: number; lon: number } | null,
  segunda: { lat: number; lon: number } | null,
): number {
  if (!primera || !segunda) {
    return Number.POSITIVE_INFINITY;
  }

  const radianes = Math.PI / 180;
  const diferenciaLatitud = (segunda.lat - primera.lat) * radianes;
  const diferenciaLongitud = (segunda.lon - primera.lon) * radianes;
  const a =
    Math.sin(diferenciaLatitud / 2) ** 2 +
    Math.cos(primera.lat * radianes) *
      Math.cos(segunda.lat * radianes) *
      Math.sin(diferenciaLongitud / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calidadCalificacion(
  averageRating: number,
  ratingCount: number,
): number {
  const votosMinimos = 3;
  const calificacionBase = 4;
  if (ratingCount < votosMinimos || averageRating < calificacionBase) {
    return 0;
  }

  return (
    (averageRating * ratingCount + calificacionBase * votosMinimos) /
    (ratingCount + votosMinimos)
  );
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
    const norte = leerNumeroOpcional(params, "north", {
      minimum: -90,
      maximum: 90,
    });
    const sur = leerNumeroOpcional(params, "south", {
      minimum: -90,
      maximum: 90,
    });
    const este = leerNumeroOpcional(params, "east", {
      minimum: -180,
      maximum: 180,
    });
    const oeste = leerNumeroOpcional(params, "west", {
      minimum: -180,
      maximum: 180,
    });
    const limitesMapa = [norte, sur, este, oeste];
    if (limitesMapa.some((limite) => limite !== undefined)) {
      if (
        norte === undefined ||
        sur === undefined ||
        este === undefined ||
        oeste === undefined ||
        norte <= sur
      ) {
        throw new SolicitudBusquedaInvalida(
          "Los límites del mapa no son válidos",
        );
      }
    }

    const latitudOrigen = leerNumeroOpcional(params, "originLat", {
      minimum: -90,
      maximum: 90,
    });
    const longitudOrigen = leerNumeroOpcional(params, "originLng", {
      minimum: -180,
      maximum: 180,
    });
    if ((latitudOrigen === undefined) !== (longitudOrigen === undefined)) {
      throw new SolicitudBusquedaInvalida(
        "originLat y originLng deben enviarse juntos",
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
      ...(norte !== undefined &&
      sur !== undefined &&
      este !== undefined &&
      oeste !== undefined
        ? { viewport: { north: norte, south: sur, east: este, west: oeste } }
        : {}),
    };

    const result = await buscarPublicaciones(filters);
    if (kind !== "service") {
      return Response.json(result);
    }

    const resumenes = await obtenerResumenCalificacionesServicios(
      result.items.map((item) => item.id),
    );
    const relevancia = new Map(
      result.items.map((item, indice) => [item.id, indice]),
    );
    const origen =
      latitudOrigen !== undefined && longitudOrigen !== undefined
        ? { lat: latitudOrigen, lon: longitudOrigen }
        : norte !== undefined &&
            sur !== undefined &&
            este !== undefined &&
            oeste !== undefined
          ? {
              lat: (norte + sur) / 2,
              lon: (este + oeste) / 2,
            }
          : null;
    const items = result.items.map((item) => {
      const resumen = resumenes.get(item.id);
      return {
        ...item,
        averageRating: resumen?.averageRating ?? 0,
        ratingCount: resumen?.ratingCount ?? 0,
      };
    });

    items.sort((primero, segundo) => {
      const verificado =
        Number(segundo.ownerVerified === true) -
        Number(primero.ownerVerified === true);
      if (verificado !== 0) {
        return verificado;
      }

      const calidad =
        calidadCalificacion(
          segundo.averageRating ?? 0,
          segundo.ratingCount ?? 0,
        ) -
        calidadCalificacion(
          primero.averageRating ?? 0,
          primero.ratingCount ?? 0,
        );
      if (calidad !== 0) {
        return calidad;
      }

      const votos =
        (segundo.ratingCount ?? 0) -
        (primero.ratingCount ?? 0);
      if (votos !== 0) {
        const votosConfiables =
          (segundo.ratingCount ?? 0) >= 3 &&
          (primero.ratingCount ?? 0) >= 3 &&
          (segundo.averageRating ?? 0) >= 4 &&
          (primero.averageRating ?? 0) >= 4;
        if (votosConfiables) {
          return votos;
        }
      }

      if (query) {
        const relevanciaTexto =
          (relevancia.get(primero.id) ?? 0) -
          (relevancia.get(segundo.id) ?? 0);
        if (relevanciaTexto !== 0) {
          return relevanciaTexto;
        }
      }

      const distancia =
        distanciaEntreUbicaciones(origen, primero.location) -
        distanciaEntreUbicaciones(origen, segundo.location);
      return Number.isNaN(distancia) ? 0 : distancia;
    });

    return Response.json({ ...result, items });
  } catch (error) {
    if (error instanceof SolicitudBusquedaInvalida) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("Marketplace search failed:", error);
    return Response.json(
      { error: "No se pudo completar la búsqueda" },
      { status: 503 },
    );
  }
}
