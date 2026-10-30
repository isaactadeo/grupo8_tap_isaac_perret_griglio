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