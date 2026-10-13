import { z } from "zod";
import { provinciasArgentinas } from "@/lib/marketplace/provincias";

const ubicacion = z
  .object({
    lat: z.number().finite().min(-90).max(90),
    lng: z.number().finite().min(-180).max(180),
  })
  .strict();

const fotos = z
  .array(
    z
      .string()
      .max(2048)
      .url()
      .refine((valor) => valor.startsWith("https://"), {
        message: "Cada foto debe usar HTTPS",
      }),
  )
  .max(10);

const precio = z
  .string()
  .regex(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/, {
    message: "El precio debe ser un decimal positivo con hasta 2 decimales",
  });

const camposAuto = {
  title: z.string().trim().min(3).max(160),
  make: z.string().trim().min(1).max(100),
  model: z.string().trim().min(1).max(100),
  year: z.number().int().min(1886).max(new Date().getFullYear() + 1),
  description: z.string().trim().min(10).max(10_000),
  price: precio,
  photos: fotos.optional(),
  city: z.string().trim().min(2).max(100),
  province: z.enum(provinciasArgentinas, {
    message: "Elegí una provincia argentina",
  }),
  location: ubicacion.nullable().optional(),
};

const camposServicio = {
  title: z.string().trim().min(3).max(160),
  category: z.enum(["taller", "lavadero"]),
  description: z.string().trim().min(10).max(10_000),
  price: precio,
  photos: fotos.optional(),
  location: ubicacion.nullable().optional(),
};

export const esquemaCrearAuto = z.object(camposAuto).strict();
export const esquemaActualizarAuto = esquemaCrearAuto
  .partial()
  .refine((valor) => Object.keys(valor).length > 0, {
    message: "Debe enviar al menos un campo para actualizar",
  });

export const esquemaCrearServicio = z.object(camposServicio).strict();
export const esquemaActualizarServicio = esquemaCrearServicio
  .partial()
  .refine((valor) => Object.keys(valor).length > 0, {
    message: "Debe enviar al menos un campo para actualizar",
  });

export type DatosNuevoAuto = z.infer<typeof esquemaCrearAuto>;
export type DatosActualizarAuto = z.infer<typeof esquemaActualizarAuto>;
export type DatosNuevoServicio = z.infer<typeof esquemaCrearServicio>;
export type DatosActualizarServicio = z.infer<
  typeof esquemaActualizarServicio
>;
