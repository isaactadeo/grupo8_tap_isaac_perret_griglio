import { del } from "@vercel/blob";
import { carpetasFotos } from "@/lib/marketplace/fotos";
import { filtrarFotosSinUso } from "@/lib/marketplace/repositorio";

/** Solo se borran fotos subidas por la app: de Vercel Blob y en sus carpetas. */
function esFotoSubida(url: string): boolean {
  try {
    const direccion = new URL(url);
    return (
      direccion.protocol === "https:" &&
      direccion.hostname.endsWith(".public.blob.vercel-storage.com") &&
      carpetasFotos.some((carpeta) =>
        direccion.pathname.startsWith(`/${carpeta}/`),
      )
    );
  } catch {
    return false;
  }
}

/**
 * Borra de Vercel Blob las fotos de una publicación ya eliminada en
 * PostgreSQL, salvo las que siga usando otra publicación. Nunca lanza: si la
 * limpieza falla, la publicación igual quedó eliminada y solo se registra.
 */
export async function eliminarFotosSinUso(urls: string[]): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return;
  }

  try {
    const sinUso = await filtrarFotosSinUso(urls.filter(esFotoSubida));
    if (sinUso.length > 0) {
      await del(sinUso);
    }
  } catch (error) {
    console.error("No se pudieron borrar las fotos de Vercel Blob:", error);
  }
}
