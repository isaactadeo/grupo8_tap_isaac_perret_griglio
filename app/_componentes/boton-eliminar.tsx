"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const rutasApi = { auto: "/api/autos", servicio: "/api/servicios" } as const;

/**
 * Elimina una publicación propia después de una confirmación en el lugar.
 * Sin `redirigirA`, refresca la página actual para quitarla del listado;
 * `alEliminar` sirve para listados que viven en el estado del cliente.
 */
export default function BotonEliminar({
  tipo,
  id,
  titulo,
  redirigirA,
  alEliminar,
}: {
  tipo: keyof typeof rutasApi;
  id: string;
  titulo: string;
  redirigirA?: string;
  alEliminar?: () => void;
}): React.JSX.Element {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(
    null,
  );

  function terminar() {
    alEliminar?.();
    if (redirigirA) {
      router.push(redirigirA);
    }
    router.refresh();
  }

  async function eliminar() {
    setEliminando(true);
    setMensaje(null);
    try {
      const respuesta = await fetch(`${rutasApi[tipo]}/${id}`, {
        method: "DELETE",
      });
      if (respuesta.status === 204) {
        terminar();
        return;
      }

      const datos: unknown = await respuesta.json().catch(() => null);
      const eliminado =
        typeof datos === "object" &&
        datos !== null &&
        "eliminado" in datos &&
        datos.eliminado === true;
      if (eliminado) {
        setMensaje({
          texto:
            "La publicación se eliminó, pero puede seguir apareciendo en la búsqueda un tiempo.",
          error: false,
        });
        setConfirmando(false);
        window.setTimeout(terminar, 2500);
        return;
      }
      setMensaje({
        texto:
          respuesta.status === 404
            ? "La publicación ya no existe o no es tuya."
            : "No se pudo eliminar. Probá de nuevo.",
        error: true,
      });
    } catch {
      setMensaje({ texto: "No se pudo eliminar. Probá de nuevo.", error: true });
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div>
      {confirmando ? (
        <div
          role="group"
          aria-label={`Confirmar eliminación de ${titulo}`}
          className="flex flex-wrap items-center gap-2"
        >
          <span className="text-sm font-semibold text-alerta">
            ¿Eliminar definitivamente?
          </span>
          <button
            type="button"
            onClick={() => void eliminar()}
            disabled={eliminando}
            className="boton min-h-9 bg-alerta px-3 py-1.5 text-sm text-papel hover:bg-[#7d2422]"
          >
            {eliminando ? "Eliminando…" : "Sí, eliminar"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmando(false)}
            disabled={eliminando}
            className="boton min-h-9 px-3 py-1.5 text-sm text-gris hover:text-tinta"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          aria-label={`Eliminar ${titulo}`}
          className="boton min-h-9 border border-alerta/40 px-3 py-1.5 text-sm text-alerta hover:bg-alerta/5"
        >
          Eliminar
        </button>
      )}
      {mensaje ? (
        <p
          role={mensaje.error ? "alert" : "status"}
          className={`mt-2 text-sm ${mensaje.error ? "text-alerta" : "text-gris"}`}
        >
          {mensaje.texto}
        </p>
      ) : null}
    </div>
  );
}
