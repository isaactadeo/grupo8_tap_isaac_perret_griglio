/** Reglas de las fotos, compartidas entre los formularios y POST /api/fotos. */
export const carpetasFotos = ["autos", "servicios"] as const;
export type CarpetaFotos = (typeof carpetasFotos)[number];
export const maximoFotos = 10;
export const tamanoMaximoFoto = 10 * 1024 * 1024;
export const tiposFotoPermitidos = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
