import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { obtenerUsuarioAutenticado } from "@/lib/auth/usuario";
import { esRespuesta } from "@/lib/api/respuestas";
import {
  carpetasFotos,
  tamanoMaximoFoto,
  tiposFotoPermitidos,
} from "@/lib/marketplace/fotos";

class SubidaRechazada extends Error {
  constructor(
    mensaje: string,
    readonly estado: 400 | 401,
  ) {
    super(mensaje);
  }
}

/**
 * Emite tokens para que el navegador suba fotos directamente a Vercel Blob.
 * Las URLs resultantes se guardan con la publicación en POST /api/autos.
 */
export async function POST(request: Request): Promise<Response> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: "La subida de fotos no esta configurada en el servidor" },
      { status: 503 },
    );
  }

  let cuerpo: HandleUploadBody;
  try {
    cuerpo = (await request.json()) as HandleUploadBody;
  } catch {
    return Response.json(
      { error: "El cuerpo debe ser JSON valido" },
      { status: 400 },
    );
  }

  try {
    const resultado = await handleUpload({
      body: cuerpo,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const usuario = await obtenerUsuarioAutenticado();
        if (esRespuesta(usuario)) {
          throw new SubidaRechazada(
            "Debes iniciar sesion para subir fotos",
            401,
          );
        }
        const carpeta = pathname.split("/")[0];
        if (
          !(carpetasFotos as readonly string[]).includes(carpeta) ||
          pathname.includes("..")
        ) {
          throw new SubidaRechazada("La ruta de la foto no es valida", 400);
        }

        return {
          allowedContentTypes: [...tiposFotoPermitidos],
          maximumSizeInBytes: tamanoMaximoFoto,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ usuarioId: usuario.id }),
        };
      },
    });
    return Response.json(resultado);
  } catch (error) {
    if (error instanceof SubidaRechazada) {
      return Response.json(
        { error: error.message },
        { status: error.estado },
      );
    }
    console.error("Error al preparar la subida de fotos:", error);
    return Response.json(
      { error: "No se pudo preparar la subida de la foto" },
      { status: 400 },
    );
  }
}
