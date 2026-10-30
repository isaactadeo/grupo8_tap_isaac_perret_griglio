import { z } from "zod";
import { esPersonal, obtenerUsuarioAutenticado } from "@/lib/auth/usuario";
import { esRespuesta, responderErrorServidor } from "@/lib/api/respuestas";
import { eliminarComentarioPublicacion } from "@/lib/marketplace/repositorio";
import { resolverParametrosPublicacion } from "@/lib/marketplace/parametros-publicacion";

const esquemaId = z.uuid();

/** Moderadores y admins pueden eliminar cualquier comentario. */
export async function DELETE(
  _request: Request,
  {
    params,
  }: { params: Promise<{ tipo: string; id: string; comentarioId: string }> },
): Promise<Response> {
  try {
    const publicacion = await resolverParametrosPublicacion(params);
    if ("respuesta" in publicacion) {
      return publicacion.respuesta;
    }
    const { comentarioId } = await params;
    if (!esquemaId.safeParse(comentarioId).success) {
      return Response.json(
        { error: "El id del comentario no es valido" },
        { status: 400 },
      );
    }

    const usuario = await obtenerUsuarioAutenticado();
    if (esRespuesta(usuario)) {
      return usuario;
    }
    if (!esPersonal(usuario.role)) {
      return Response.json(
        { error: "No tenés permisos para eliminar comentarios" },
        { status: 403 },
      );
    }

    const eliminado = await eliminarComentarioPublicacion(
      publicacion.tipo,
      publicacion.id,
      comentarioId,
    );
    if (!eliminado) {
      return Response.json(
        { error: "No se encontro el comentario" },
        { status: 404 },
      );
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    return responderErrorServidor(error, "Error al eliminar comentario:");
  }
}
