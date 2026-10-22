import { z } from "zod";
import { esPersonal, obtenerUsuarioAutenticado } from "@/lib/auth/usuario";
import {
  esRespuesta,
  leerJson,
  responderErrorServidor,
} from "@/lib/api/respuestas";
import { esquemaVerificacionUsuario } from "@/lib/marketplace/esquemas";
import {
  cambiarVerificacionUsuario,
  reindexarPublicacionesDeUsuario,
} from "@/lib/marketplace/verificacion";

const esquemaId = z.uuid();

/**
 * Marca o desmarca a un usuario como local verificado y reindexa todas sus
 * publicaciones. Es idempotente: repetir el mismo valor reintenta la
 * reindexación.
 */
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

    const moderador = await obtenerUsuarioAutenticado();
    if (esRespuesta(moderador)) {
      return moderador;
    }
    if (!esPersonal(moderador.role)) {
      return Response.json(
        { error: "No tenés permisos para administrar usuarios" },
        { status: 403 },
      );
    }

    const resultadoJson = await leerJson(request, esquemaVerificacionUsuario);
    if ("respuesta" in resultadoJson) {
      return resultadoJson.respuesta;
    }

    const usuario = await cambiarVerificacionUsuario(
      id,
      resultadoJson.datos.verified,
      moderador.id,
    );
    if (!usuario) {
      return Response.json(
        { error: "No se encontro el usuario" },
        { status: 404 },
      );
    }

    let reindexadas: number;
    try {
      reindexadas = await reindexarPublicacionesDeUsuario(id);
    } catch (error) {
      console.error(
        "La verificacion se guardo, pero fallo la reindexacion:",
        error,
      );
      return Response.json(
        {
          error:
            "La verificacion se guardo, pero la busqueda no pudo sincronizarse",
          guardado: true,
          busquedaActualizada: false,
          item: usuario,
        },
        { status: 503 },
      );
    }

    return Response.json({ item: usuario, reindexadas });
  } catch (error) {
    return responderErrorServidor(error, "Error al verificar usuario:");
  }
}
