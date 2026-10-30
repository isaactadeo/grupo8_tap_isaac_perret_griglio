import { z } from "zod";
import { esAdmin, obtenerUsuarioAutenticado } from "@/lib/auth/usuario";
import {
  esRespuesta,
  leerJson,
  responderErrorServidor,
} from "@/lib/api/respuestas";
import { esquemaRolUsuario } from "@/lib/marketplace/esquemas";
import { cambiarRolUsuario } from "@/lib/marketplace/verificacion";

const esquemaId = z.uuid();

/** Cambia el rol de un usuario. Solo para admins. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    if (!esquemaId.safeParse(id).success) {
      return Response.json(
        { error: "El id del usuario no es valido" },
        { status: 400 },
      );
    }

    const admin = await obtenerUsuarioAutenticado();
    if (esRespuesta(admin)) {
      return admin;
    }
    if (!esAdmin(admin.role)) {
      return Response.json(
        { error: "Solo un admin puede cambiar roles" },
        { status: 403 },
      );
    }
    // Evita que el último admin se quite el acceso por error.
    if (admin.id === id) {
      return Response.json(
        { error: "No podés cambiar tu propio rol" },
        { status: 409 },
      );
    }

    const resultadoJson = await leerJson(request, esquemaRolUsuario);
    if ("respuesta" in resultadoJson) {
      return resultadoJson.respuesta;
    }

    const usuario = await cambiarRolUsuario(id, resultadoJson.datos.role);
    if (!usuario) {
      return Response.json(
        { error: "No se encontro el usuario" },
        { status: 404 },
      );
    }
    return Response.json({ item: usuario });
  } catch (error) {
    return responderErrorServidor(error, "Error al cambiar el rol:");
  }
}
