import { obtenerIdUsuarioOpcional, obtenerUsuarioAutenticado } from "@/lib/auth/usuario";
import {
  esRespuesta,
  leerJson,
  responderErrorServidor,
} from "@/lib/api/respuestas";
import {
  calificarPublicacion,
  existePublicacion,
  obtenerResumenCalificaciones,
} from "@/lib/marketplace/repositorio";
import { resolverParametrosPublicacion } from "@/lib/marketplace/parametros-publicacion";
import { esquemaCalificarPublicacion } from "@/lib/marketplace/esquemas";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tipo: string; id: string }> },
): Promise<Response> {
  try {
    const publicacion = await resolverParametrosPublicacion(params);
    if ("respuesta" in publicacion) {
      return publicacion.respuesta;
    }
    if (!(await existePublicacion(publicacion.tipo, publicacion.id))) {
      return Response.json(
        { error: "No se encontro la publicación" },
        { status: 404 },
      );
    }

    const userId = await obtenerIdUsuarioOpcional();
    const resumen = await obtenerResumenCalificaciones(
      publicacion.tipo,
      publicacion.id,
      userId,
    );
    return Response.json({ resumen });
  } catch (error) {
    return responderErrorServidor(error, "Error al obtener calificaciones:");
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tipo: string; id: string }> },
): Promise<Response> {
  try {
    const publicacion = await resolverParametrosPublicacion(params);
    if ("respuesta" in publicacion) {
      return publicacion.respuesta;
    }

    const usuario = await obtenerUsuarioAutenticado();
    if (esRespuesta(usuario)) {
      return usuario;
    }

    const resultadoJson = await leerJson(
      request,
      esquemaCalificarPublicacion,
    );
    if ("respuesta" in resultadoJson) {
      return resultadoJson.respuesta;
    }

    const resumen = await calificarPublicacion(
      publicacion.tipo,
      publicacion.id,
      usuario.id,
      resultadoJson.datos.stars,
    );
    if (!resumen) {
      return Response.json(
        { error: "No se encontro la publicación" },
        { status: 404 },
      );
    }
    return Response.json({ resumen });
  } catch (error) {
    return responderErrorServidor(error, "Error al guardar calificación:");
  }
}
