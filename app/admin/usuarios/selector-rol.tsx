"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UserRole } from "@/src/types";

const etiquetasRol: Record<UserRole, string> = {
  usuario: "Usuario",
  moderador: "Moderador",
  admin: "Admin",
};

/** Cambia el rol de un usuario. Solo se muestra a los admins. */
export default function SelectorRol({
  usuarioId,
  nombre,
  rolInicial,
}: {
  usuarioId: string;
  nombre: string;
  rolInicial: UserRole;
}): React.JSX.Element {
  const router = useRouter();
  const [rol, setRol] = useState(rolInicial);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cambiar(nuevoRol: UserRole) {
    const rolAnterior = rol;
    setRol(nuevoRol);
    setEnviando(true);
    setError(null);
    try {
      const respuesta = await fetch(`/api/admin/usuarios/${usuarioId}/rol`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: nuevoRol }),
      });
      if (respuesta.ok) {
        router.refresh();
        return;
      }
      const datos: unknown = await respuesta.json().catch(() => null);
      setRol(rolAnterior);
      setError(
        typeof datos === "object" &&
          datos !== null &&
          "error" in datos &&
          typeof datos.error === "string"
          ? datos.error
          : "No se pudo cambiar el rol.",
      );
    } catch {
      setRol(rolAnterior);
      setError("No se pudo conectar. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 sm:items-end">
      <label className="flex items-center gap-2 text-sm font-medium">
        Rol
        <select
          value={rol}
          disabled={enviando}
          onChange={(evento) => void cambiar(evento.target.value as UserRole)}
          aria-label={`Rol de ${nombre}`}
          className="campo min-h-9 w-auto py-1"
        >
          {(Object.keys(etiquetasRol) as UserRole[]).map((valor) => (
            <option key={valor} value={valor}>
              {etiquetasRol[valor]}
            </option>
          ))}
        </select>
      </label>
      <p role="status" className="max-w-64 text-sm font-medium text-alerta sm:text-right">
        {error}
      </p>
    </div>
  );
}
