import { indexarAuto } from "@/lib/search/elasticsearch";
import { obtenerUsuarioAutenticado } from "@/lib/auth/usuario";
import {
  esRespuesta,
  leerJson,
  leerPaginacion,
  responderErrorServidor,
} from "@/lib/api/respuestas";
import {
  crearAuto,
  listarAutos,
} from "@/lib/marketplace/repositorio";
import { esquemaCrearAuto } from "@/lib/marketplace/esquemas";

export async function GET(request: Request): Promise<Response> {
  try {
    const paginacion = leerPaginacion(request);
    if ("respuesta" in paginacion) {
      return paginacion.respuesta;
    }

    const resultado = await listarAutos(
      paginacion.pagina,
      paginacion.tamanoPagina,
    );
    return Response.json({
      ...resultado,
      pagina: paginacion.pagina,
      tamanoPagina: paginacion.tamanoPagina,
    });
  } catch (error) {
    return responderErrorServidor(error, "Error al listar autos:");
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const usuario = await obtenerUsuarioAutenticado();
    if (esRespuesta(usuario)) {
      return usuario;
    }

    const resultadoJson = await leerJson(request, esquemaCrearAuto);
    if ("respuesta" in resultadoJson) {
      return resultadoJson.respuesta;
    }

    const auto = await crearAuto(usuario.id, resultadoJson.datos);
    try {
      await indexarAuto(auto);
    } catch (error) {
      console.error("El auto se guardo, pero fallo su indexacion:", error);
      return Response.json(
        {
          error: "El auto se guardo, pero no pudo agregarse a la busqueda",
          guardado: true,
          busquedaActualizada: false,
          item: auto,
        },
        { status: 503 },
      );
    }

    return Response.json({ item: auto }, { status: 201 });
  } catch (error) {
    return responderErrorServidor(error, "Error al crear auto:");
  }
}
