import type { GeoCoordinates } from "@/src/types";

export interface RutaVehicular {
  destino: GeoCoordinates;
  titulo: string;
  geometria: {
    type: "LineString";
    coordinates: [number, number][];
  };
  distanciaMetros: number;
  duracionSegundos: number;
}

interface RespuestaOSRM {
  code: string;
  routes: {
    distance: number;
    duration: number;
    geometry: {
      type: "LineString";
      coordinates: [number, number][];
    };
  }[];
}

function esObjeto(datos: unknown): datos is Record<string, unknown> {
  return typeof datos === "object" && datos !== null;
}

function esCoordenadaGeoJSON(datos: unknown): datos is [number, number] {
  return (
    Array.isArray(datos) &&
    datos.length >= 2 &&
    typeof datos[0] === "number" &&
    Number.isFinite(datos[0]) &&
    typeof datos[1] === "number" &&
    Number.isFinite(datos[1])
  );
}

function validarRespuestaOSRM(datos: unknown): RespuestaOSRM {
  if (!esObjeto(datos) || datos.code !== "Ok" || !Array.isArray(datos.routes)) {
    throw new Error("OSRM no pudo encontrar una ruta para esta ubicación.");
  }

  const ruta = datos.routes[0];
  const coordenadas =
    esObjeto(ruta) &&
    esObjeto(ruta.geometry) &&
    Array.isArray(ruta.geometry.coordinates)
      ? ruta.geometry.coordinates.filter(esCoordenadaGeoJSON)
      : [];

  if (
    !esObjeto(ruta) ||
    typeof ruta.distance !== "number" ||
    !Number.isFinite(ruta.distance) ||
    typeof ruta.duration !== "number" ||
    !Number.isFinite(ruta.duration) ||
    !esObjeto(ruta.geometry) ||
    ruta.geometry.type !== "LineString" ||
    !Array.isArray(ruta.geometry.coordinates) ||
    coordenadas.length < 2 ||
    coordenadas.length !== ruta.geometry.coordinates.length
  ) {
    throw new Error("La respuesta de rutas tiene un formato inválido.");
  }

  return {
    code: "Ok",
    routes: [
      {
        distance: ruta.distance,
        duration: ruta.duration,
        geometry: {
          type: "LineString",
          coordinates: coordenadas,
        },
      },
    ],
  };
}

export function obtenerUbicacionActual(): Promise<GeoCoordinates> {
  if (!navigator.geolocation) {
    return Promise.reject(
      new Error("Este navegador no permite acceder a la ubicación."),
    );
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      (error: GeolocationPositionError) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(
            new Error(
              "Permiso de ubicación denegado. Habilitalo en el navegador para calcular la ruta.",
            ),
          );
        } else if (error.code === error.TIMEOUT) {
          reject(
            new Error("Se agotó el tiempo para obtener tu ubicación. Intentá de nuevo."),
          );
        } else {
          reject(
            new Error("No se pudo determinar tu ubicación actual."),
          );
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
}

export async function obtenerRutaOSRM(
  origen: GeoCoordinates,
  destino: GeoCoordinates,
  titulo: string,
  signal?: AbortSignal,
): Promise<RutaVehicular> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${origen.lng},${origen.lat};${destino.lng},${destino.lat}` +
    "?overview=full&geometries=geojson";
  const respuesta = await fetch(url, { signal });
  if (!respuesta.ok) {
    throw new Error("No se pudo conectar con el servicio de rutas OSRM.");
  }

  const datos: unknown = await respuesta.json();
  const resultado = validarRespuestaOSRM(datos);
  const ruta = resultado.routes[0];

  return {
    destino,
    titulo,
    geometria: ruta.geometry,
    distanciaMetros: ruta.distance,
    duracionSegundos: ruta.duration,
  };
}

export function formatearDistanciaRuta(metros: number): string {
  if (metros < 1000) {
    return `${Math.round(metros)} m`;
  }

  return `${new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 1,
  }).format(metros / 1000)} km`;
}

export function formatearDuracionRuta(segundos: number): string {
  const minutos = Math.max(1, Math.round(segundos / 60));
  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;

  if (horas === 0) {
    return `${minutos} min`;
  }

  return minutosRestantes === 0
    ? `${horas} h`
    : `${horas} h ${minutosRestantes} min`;
}

export function crearEnlaceRuta(
  destino: GeoCoordinates,
  titulo: string,
): string {
  const parametros = new URLSearchParams({
    destinoLat: String(destino.lat),
    destinoLng: String(destino.lng),
    destinoNombre: titulo,
  });
  return `/servicios?${parametros.toString()}`;
}
