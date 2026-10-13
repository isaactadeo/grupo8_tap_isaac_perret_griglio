import { ZodError, type ZodType } from "zod";

export async function leerJson<T>(
  request: Request,
  esquema: ZodType<T>,
): Promise<{ datos: T } | { respuesta: Response }> {
  let cuerpo: unknown;

  try {
    cuerpo = await request.json();
  } catch {
    return {
      respuesta: Response.json(
        { error: "El cuerpo debe ser JSON valido" },
        { status: 400 },
      ),
    };
  }

  try {
    return { datos: esquema.parse(cuerpo) };
  } catch (error) {
    if (!(error instanceof ZodError)) {
      throw error;
    }

    return {
      respuesta: Response.json(
        {
          error: "Los datos enviados no son validos",
          detalles: error.issues.map((issue) => ({
            campo: issue.path.join("."),
            mensaje: issue.message,
          })),
        },
        { status: 400 },
      ),
    };
  }
}

export function leerPaginacion(request: Request):
  | { pagina: number; tamanoPagina: number }
  | { respuesta: Response } {
  const parametros = new URL(request.url).searchParams;
  const pagina = Number(parametros.get("page") ?? "1");
  const tamanoPagina = Number(parametros.get("pageSize") ?? "20");

  if (
    !Number.isInteger(pagina) ||
    pagina < 1 ||
    !Number.isInteger(tamanoPagina) ||
    tamanoPagina < 1 ||
    tamanoPagina > 50 ||
    (pagina - 1) * tamanoPagina >= 10_000
  ) {
    return {
      respuesta: Response.json(
        { error: "Los parametros de paginacion no son validos" },
        { status: 400 },
      ),
    };
  }

  return { pagina, tamanoPagina };
}

export function responderErrorServidor(
  error: unknown,
  contexto: string,
): Response {
  console.error(contexto, error);
  return Response.json(
    { error: "Ocurrio un error interno al procesar la solicitud" },
    { status: 500 },
  );
}

export function esRespuesta(
  valor: object | Response,
): valor is Response {
  return valor instanceof Response;
}
