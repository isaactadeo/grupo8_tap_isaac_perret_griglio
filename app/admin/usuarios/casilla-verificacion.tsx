"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function leerMensajeError(datos: unknown): string {
  if (
    typeof datos === "object" &&
    datos !== null &&
    "error" in datos &&
    typeof datos.error === "string"
  ) {
    return datos.error;
  }
  return "No se pudo guardar. Probá de nuevo.";
}

/**
 * Marca o desmarca a un usuario como local verificado. Si la base se guardó
 * pero la búsqueda no se sincronizó, ofrece reintentar con el mismo valor
 * sin tocar la casilla (la API es idempotente).
 */
export default function CasillaVerificacion({
  usuarioId,
  nombre,
  verificadoInicial,
}: {
  usuarioId: string;
  nombre: string;
  verificadoInicial: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const [verificado, setVerificado] = useState(verificadoInicial);
  const [enviando, setEnviando] = useState(false);
  const [sincronizacionPendiente, setSincronizacionPendiente] = useState(false);
  const [mensaje, setMensaje] = useState<{
    texto: string;
    error: boolean;
  } | null>(null);

  async function enviar(valor: boolean, valorAnterior: boolean) {
    setVerificado(valor);
    setEnviando(true);
    setMensaje(null);
    try {
      const respuesta = await fetch(`/api/admin/usuarios/${usuarioId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ verified: valor }),
      });
      const datos: unknown = await respuesta.json().catch(() => null);

      if (respuesta.ok) {
        const reindexadas =
          typeof datos === "object" &&
          datos !== null &&
          "reindexadas" in datos &&
          typeof datos.reindexadas === "number"
            ? datos.reindexadas
            : 0;
        setSincronizacionPendiente(false);
        setMensaje({
          texto:
            reindexadas === 1
              ? "Se actualizó 1 publicación."
              : `Se actualizaron ${reindexadas} publicaciones.`,
          error: false,
        });
        router.refresh();
        return;
      }

      if (respuesta.status === 503) {
        // La base quedó actualizada: la casilla muestra el valor guardado.
        setSincronizacionPendiente(true);
        setMensaje({
          texto: "Guardado, pero la búsqueda no se actualizó.",
          error: true,
        });
        router.refresh();
        return;
      }

      setVerificado(valorAnterior);
      setMensaje({ texto: leerMensajeError(datos), error: true });
    } catch {
      // La base pudo haberse actualizado antes de perder la respuesta.
      setVerificado(valorAnterior);
      setMensaje({
        texto:
          "No se pudo confirmar el cambio. Recargá la página para ver el estado guardado.",
        error: true,
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 sm:items-end">
      <label className="flex items-center gap-2 font-medium">
        <input
          type="checkbox"
          checked={verificado}
          disabled={enviando}
          onChange={(evento) =>
            void enviar(evento.target.checked, verificado)
          }
          aria-label={`Local verificado: ${nombre}`}
          className="size-5 accent-tinta"
        />
        Local verificado
      </label>
      {/* Siempre montado para que los lectores de pantalla anuncien el cambio. */}
      <p
        role="status"
        className={`max-w-64 text-sm sm:text-right ${
          mensaje?.error ? "font-medium text-alerta" : "text-gris"
        }`}
      >
        {mensaje?.texto}
      </p>
      {sincronizacionPendiente ? (
        <button
          type="button"
          disabled={enviando}
          onClick={() => void enviar(verificado, verificado)}
          className="boton boton-secundario min-h-9 px-3 py-1.5 text-sm"
        >
          {enviando ? "Reintentando…" : "Reintentar sincronización"}
        </button>
      ) : null}
    </div>
  );
}
