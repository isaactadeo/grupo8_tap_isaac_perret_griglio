import {
  esPersonal,
  obtenerUsuarioActual,
  obtenerUsuarioAutenticado,
} from "@/lib/auth/usuario";
import {
  esRespuesta,
  leerJson,
  responderErrorServidor,
} from "@/lib/api/respuestas";
import {
  crearComentarioPublicacion,
  existePublicacion,
  obtenerComentariosPublicacion,
} from "@/lib/marketplace/repositorio";
import { resolverParametrosPublicacion } from "@/lib/marketplace/parametros-publicacion";
import { esquemaCrearComentario } from "@/lib/marketplace/esquemas";

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

    const [items, usuario] = await Promise.all([
      obtenerComentariosPublicacion(publicacion.tipo, publicacion.id),
      obtenerUsuarioActual(),
    ]);
    return Response.json({
      items,
      puedeModerar: usuario !== null && esPersonal(usuario.role),
    });
  } catch (error) {
    return responderErrorServidor(error, "Error al listar comentarios:");
  }
}

export async function POST(
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

    const resultadoJson = await leerJson(request, esquemaCrearComentario);
    if ("respuesta" in resultadoJson) {
      return resultadoJson.respuesta;
    }

    const comentario = await crearComentarioPublicacion(
      publicacion.tipo,
      publicacion.id,
      usuario.id,
      resultadoJson.datos.content,
    );
    if (!comentario) {
      return Response.json(
        { error: "No se encontro la publicación" },
        { status: 404 },
      );
    }
    return Response.json({ item: comentario }, { status: 201 });
  } catch (error) {
    return responderErrorServidor(error, "Error al crear comentario:");
  }
}
