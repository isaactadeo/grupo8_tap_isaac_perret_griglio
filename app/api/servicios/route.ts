import { indexarServicio } from "@/lib/search/elasticsearch";
import { obtenerUsuarioAutenticado } from "@/lib/auth/usuario";
import {
  esRespuesta,
  leerJson,
  leerPaginacion,
  responderErrorServidor,
} from "@/lib/api/respuestas";
import {
  crearServicio,
  listarServicios,
} from "@/lib/marketplace/repositorio";
import { esquemaCrearServicio } from "@/lib/marketplace/esquemas";

export async function GET(request: Request): Promise<Response> {
  try {
    const paginacion = leerPaginacion(request);
    if ("respuesta" in paginacion) {
      return paginacion.respuesta;
    }

    const resultado = await listarServicios(
      paginacion.pagina,
      paginacion.tamanoPagina,
    );
    return Response.json({
      ...resultado,
      pagina: paginacion.pagina,
      tamanoPagina: paginacion.tamanoPagina,
    });
  } catch (error) {
    return responderErrorServidor(error, "Error al listar servicios:");
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const usuario = await obtenerUsuarioAutenticado();
    if (esRespuesta(usuario)) {
      return usuario;
    }

    const resultadoJson = await leerJson(request, esquemaCrearServicio);
    if ("respuesta" in resultadoJson) {
      return resultadoJson.respuesta;
    }

    const servicio = await crearServicio(usuario.id, resultadoJson.datos);
    try {
      await indexarServicio(servicio);
    } catch (error) {
      console.error("El servicio se guardo, pero fallo su indexacion:", error);
      return Response.json(
        {
          error: "El servicio se guardo, pero no pudo agregarse a la busqueda",
          guardado: true,
          busquedaActualizada: false,
          item: servicio,
        },
        { status: 503 },
      );
    }

    return Response.json({ item: servicio }, { status: 201 });
  } catch (error) {
    return responderErrorServidor(error, "Error al crear servicio:");
  }
}
