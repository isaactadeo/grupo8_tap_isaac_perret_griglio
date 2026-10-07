import { customType } from "drizzle-orm/pg-core";

/**
 * Tipo geography de PostGIS.
 * Guarda coordenadas (lat/lng) con soporte para búsquedas de distancia.
 * SRID 4326 = sistema estándar GPS (WGS84).
 */
export const geography = customType<{
  data: { lng: number; lat: number };
  driverData: string;
}>({
  dataType() {
    return "geography(Point, 4326)";
  },
});

/**
 * Tipo tsvector de Postgres para búsqueda full-text.
 * Postgres lo llena solo, con las palabras "stemizadas" en español.
 * Lo leemos como string crudo desde el código.
 */
export const tsvector = customType<{
  data: string;
}>({
  dataType() {
    return "tsvector";
  },
});