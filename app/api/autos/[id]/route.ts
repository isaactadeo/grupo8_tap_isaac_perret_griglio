import { z } from "zod";
import { eliminarFotosSinUso } from "@/lib/marketplace/limpieza-fotos";
import { esAdmin, obtenerUsuarioAutenticado } from "@/lib/auth/usuario";
import {
  esRespuesta,
  leerJson,
  responderErrorServidor,
} from "@/lib/api/respuestas";
import {
  actualizarAuto,
  eliminarAuto,
  obtenerAuto,
} from "@/lib/marketplace/repositorio";
import { esquemaActualizarAuto } from "@/lib/marketplace/esquemas";
import {
  eliminarPublicacion,
  indexarAuto,
} from "@/lib/search/elasticsearch";

const esquemaId = z.uuid();

async function resolverId(params: Promise<{ id: string }>): Promise<
  | { id: string }
  | { respuesta: Response }
> {
  const { id } = await params;
  if (!esquemaId.safeParse(id).success) {
    return {
      respuesta: Response.json({ error: "El id del auto no es valido" }, { status: 400 }),
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

    const auto = await obtenerAuto(identificador.id);
    if (!auto) {
      return Response.json({ error: "No se encontro el auto" }, { status: 404 });
    }
    return Response.json({ item: auto });
  } catch (error) {
    return responderErrorServidor(error, "Error al obtener auto:");
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

    const resultadoJson = await leerJson(request, esquemaActualizarAuto);
    if ("respuesta" in resultadoJson) {
      return resultadoJson.respuesta;
    }

    const auto = await actualizarAuto(
      identificador.id,
      usuario.id,
      resultadoJson.datos,
      esAdmin(usuario.role),
    );
    if (!auto) {
      return Response.json({ error: "No se encontro el auto" }, { status: 404 });
    }

    try {
      await indexarAuto(auto);
    } catch (error) {
      console.error("El auto se actualizo, pero fallo su indexacion:", error);
      return Response.json(
        {
          error: "El auto se actualizo, pero la busqueda no pudo sincronizarse",
          guardado: true,
          busquedaActualizada: false,
          item: auto,
        },
        { status: 503 },
      );
    }

    return Response.json({ item: auto });
  } catch (error) {
    return responderErrorServidor(error, "Error al actualizar auto:");
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

    const fotos = await eliminarAuto(
      identificador.id,
      usuario.id,
      esAdmin(usuario.role),
    );
    if (!fotos) {
      return Response.json({ error: "No se encontro el auto" }, { status: 404 });
    }

    await eliminarFotosSinUso(fotos);

    try {
      await eliminarPublicacion("car", identificador.id);
    } catch (error) {
      console.error("El auto se elimino, pero fallo la limpieza del indice:", error);
      return Response.json(
        {
          error: "El auto se elimino, pero quedo pendiente quitarlo de busqueda",
          eliminado: true,
          busquedaActualizada: false,
        },
        { status: 503 },
      );
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    return responderErrorServidor(error, "Error al eliminar auto:");
  }
}
