import { z } from "zod";
import type { ListingType } from "@/src/types";

const esquemaId = z.uuid();

export async function resolverParametrosPublicacion(params: Promise<{
  tipo: string;
  id: string;
}>): Promise<
  | { tipo: ListingType; id: string }
  | { respuesta: Response }
> {
  const { tipo, id } = await params;
  if (tipo !== "autos" && tipo !== "servicios") {
    return {
      respuesta: Response.json(
        { error: "El tipo de publicación no es válido" },
        { status: 404 },
      ),
    };
  }
  if (!esquemaId.safeParse(id).success) {
    return {
      respuesta: Response.json(
        { error: "El id de la publicación no es válido" },
        { status: 400 },
      ),
    };
  }
  return { tipo: tipo === "autos" ? "car" : "service", id };
}
