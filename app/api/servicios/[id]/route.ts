import { z } from "zod";
import { eliminarFotosSinUso } from "@/lib/marketplace/limpieza-fotos";
import { esAdmin, obtenerUsuarioAutenticado } from "@/lib/auth/usuario";
import {
  esRespuesta,
  leerJson,
  responderErrorServidor,
} from "@/lib/api/respuestas";
import {
  actualizarServicio,
  eliminarServicio,
  obtenerServicio,
} from "@/lib/marketplace/repositorio";
import { esquemaActualizarServicio } from "@/lib/marketplace/esquemas";
import {
  eliminarPublicacion,
  indexarServicio,
} from "@/lib/search/elasticsearch";

const esquemaId = z.uuid();

async function resolverId(params: Promise<{ id: string }>): Promise<
  | { id: string }
  | { respuesta: Response }
> {
  const { id } = await params;
  if (!esquemaId.safeParse(id).success) {
    return {
      respuesta: Response.json(
        { error: "El id del servicio no es valido" },
        { status: 400 },
      ),
    };
  }
  return { id };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const identificador = await resolverId(params);
    if ("respuesta" in identificador) {
      return identificador.respuesta;
    }

    const servicio = await obtenerServicio(identificador.id);
    if (!servicio) {
      return Response.json(
        { error: "No se encontro el servicio" },
        { status: 404 },
      );
    }
    return Response.json({ item: servicio });
  } catch (error) {
    return responderErrorServidor(error, "Error al obtener servicio:");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const identificador = await resolverId(params);
    if ("respuesta" in identificador) {
      return identificador.respuesta;
    }

    const usuario = await obtenerUsuarioAutenticado();
    if (esRespuesta(usuario)) {
      return usuario;
    }

    const resultadoJson = await leerJson(request, esquemaActualizarServicio);
    if ("respuesta" in resultadoJson) {
      return resultadoJson.respuesta;
    }

    const servicio = await actualizarServicio(
      identificador.id,
      usuario.id,
      resultadoJson.datos,
      esAdmin(usuario.role),
    );
    if (!servicio) {
      return Response.json(
        { error: "No se encontro el servicio" },
        { status: 404 },
      );
    }

    try {
      await indexarServicio(servicio);
    } catch (error) {
      console.error(
        "El servicio se actualizo, pero fallo su indexacion:",
        error,
      );
      return Response.json(
        {
          error:
            "El servicio se actualizo, pero la busqueda no pudo sincronizarse",
          guardado: true,
          busquedaActualizada: false,
          item: servicio,
        },
        { status: 503 },
      );
    }

    return Response.json({ item: servicio });
  } catch (error) {
    return responderErrorServidor(error, "Error al actualizar servicio:");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const identificador = await resolverId(params);
    if ("respuesta" in identificador) {
      return identificador.respuesta;
    }

    const usuario = await obtenerUsuarioAutenticado();
    if (esRespuesta(usuario)) {
      return usuario;
    }

    const fotos = await eliminarServicio(
      identificador.id,
      usuario.id,
      esAdmin(usuario.role),
    );
    if (!fotos) {
      return Response.json(
        { error: "No se encontro el servicio" },
        { status: 404 },
      );
    }

    await eliminarFotosSinUso(fotos);

    try {
      await eliminarPublicacion("service", identificador.id);
    } catch (error) {
      console.error(
        "El servicio se elimino, pero fallo la limpieza del indice:",
        error,
      );
      return Response.json(
        {
          error:
            "El servicio se elimino, pero quedo pendiente quitarlo de busqueda",
          eliminado: true,
          busquedaActualizada: false,
        },
        { status: 503 },
      );
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    return responderErrorServidor(error, "Error al eliminar servicio:");
  }
}
