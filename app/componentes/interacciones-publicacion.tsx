"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { PublicationComment, RatingSummary } from "@/src/types";

interface InteraccionesPublicacionProps {
  tipo: "autos" | "servicios";
  id: string;
}

function leerMensajeError(datos: unknown, alternativo: string): string {
  if (
    typeof datos === "object" &&
    datos !== null &&
    "error" in datos &&
    typeof datos.error === "string"
  ) {
    return datos.error;
  }
  return alternativo;
}

function esComentario(valor: unknown): valor is PublicationComment {
  return (
    typeof valor === "object" &&
    valor !== null &&
    "id" in valor &&
    typeof valor.id === "string" &&
    "content" in valor &&
    typeof valor.content === "string" &&
    "authorName" in valor &&
    typeof valor.authorName === "string" &&
    "createdAt" in valor &&
    typeof valor.createdAt === "string"
  );
}

function esResumenCalificaciones(valor: unknown): valor is RatingSummary {
  return (
    typeof valor === "object" &&
    valor !== null &&
    "averageRating" in valor &&
    typeof valor.averageRating === "number" &&
    "ratingCount" in valor &&
    typeof valor.ratingCount === "number" &&
    "userRating" in valor &&
    (typeof valor.userRating === "number" || valor.userRating === null)
  );
}

export default function InteraccionesPublicacion({
  tipo,
  id,
}: InteraccionesPublicacionProps): React.JSX.Element {
  const [cargando, setCargando] = useState(true);
  const [comentarios, setComentarios] = useState<PublicationComment[]>([]);
  const [resumen, setResumen] = useState<RatingSummary | null>(null);
  const [comentario, setComentario] = useState("");
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [enviandoCalificacion, setEnviandoCalificacion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [requiereSesion, setRequiereSesion] = useState(false);

  useEffect(() => {
    let cancelado = false;
    async function cargarInteracciones() {
      const ruta = `/api/publicaciones/${tipo}/${id}`;

      try {
        const [respuestaComentarios, respuestaCalificacion] = await Promise.all([
          fetch(`${ruta}/comentarios`),
          fetch(`${ruta}/calificacion`),
        ]);
        const [datosComentarios, datosCalificacion]: [unknown, unknown] =
          await Promise.all([
            respuestaComentarios.json(),
            respuestaCalificacion.json(),
          ]);

        if (!respuestaComentarios.ok) {
          throw new Error(
            leerMensajeError(datosComentarios, "No se pudieron cargar los comentarios."),
          );
        }
        if (!respuestaCalificacion.ok) {
          throw new Error(
            leerMensajeError(datosCalificacion, "No se pudo cargar la calificación."),
          );
        }
        if (
          typeof datosComentarios !== "object" ||
          datosComentarios === null ||
          !("items" in datosComentarios) ||
          !Array.isArray(datosComentarios.items) ||
          !datosComentarios.items.every(esComentario) ||
          typeof datosCalificacion !== "object" ||
          datosCalificacion === null ||
          !("resumen" in datosCalificacion) ||
          !esResumenCalificaciones(datosCalificacion.resumen)
        ) {
          throw new Error("La respuesta de comentarios o calificaciones no es válida.");
        }

        if (cancelado) return;
        setComentarios(datosComentarios.items);
        setResumen(datosCalificacion.resumen);
      } catch (fallo) {
        if (cancelado) return;
        setError(
          fallo instanceof Error
            ? fallo.message
            : "No se pudieron cargar los comentarios y calificaciones.",
        );
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    void cargarInteracciones();
    return () => {
      cancelado = true;
    };
  }, [tipo, id]);

  async function enviarComentario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviandoComentario(true);
    setError(null);
    setMensaje(null);
    setRequiereSesion(false);

    try {
      const respuesta = await fetch(
        `/api/publicaciones/${tipo}/${id}/comentarios`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: comentario }),
        },
      );
      const datos: unknown = await respuesta.json();
      if (!respuesta.ok) {
        if (respuesta.status === 401) {
          setRequiereSesion(true);
        }
        throw new Error(leerMensajeError(datos, "No se pudo publicar el comentario."));
      }
      const nuevoComentario =
        typeof datos === "object" && datos !== null && "item" in datos
          ? datos.item
          : null;
      if (!esComentario(nuevoComentario)) {
        throw new Error("La respuesta del comentario no es válida.");
      }

      setComentarios((actuales) =>
        [nuevoComentario, ...actuales].slice(0, 50),
      );
      setComentario("");
      setMensaje("Comentario publicado.");
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : "No se pudo publicar el comentario.",
      );
    } finally {
      setEnviandoComentario(false);
    }
  }

  async function guardarCalificacion(stars: number) {
    setEnviandoCalificacion(true);
    setError(null);
    setMensaje(null);
    setRequiereSesion(false);

    try {
      const respuesta = await fetch(
        `/api/publicaciones/${tipo}/${id}/calificacion`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stars }),
        },
      );
      const datos: unknown = await respuesta.json();
      if (!respuesta.ok) {
        if (respuesta.status === 401) {
          setRequiereSesion(true);
        }
        throw new Error(leerMensajeError(datos, "No se pudo guardar la calificación."));
      }
      if (
        typeof datos !== "object" ||
        datos === null ||
        !("resumen" in datos) ||
        !esResumenCalificaciones(datos.resumen)
      ) {
        throw new Error("La respuesta de calificación no es válida.");
      }

      setResumen(datos.resumen);
      setMensaje("Calificación guardada. Puedes cambiarla cuando quieras.");
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : "No se pudo guardar la calificación.",
      );
    } finally {
      setEnviandoCalificacion(false);
    }
  }

  return (
    <section className="mt-4 border-t border-zinc-200 pt-3">
      <h3 className="text-sm font-semibold text-teal-800">
        Comentarios y calificación
      </h3>
      {cargando ? (
        <p className="mt-2 text-sm text-zinc-500">Cargando comentarios…</p>
      ) : null}

      <div className="mt-4 space-y-4">
          {resumen ? (
            <div>
              <p className="text-sm font-medium text-zinc-800">
                {resumen.ratingCount > 0
                  ? `${resumen.averageRating.toLocaleString("es-AR", { maximumFractionDigits: 1 })} de 5 · ${resumen.ratingCount} ${
                      resumen.ratingCount === 1 ? "calificación" : "calificaciones"
                    }`
                  : "Todavía no hay calificaciones"}
              </p>
              <div
                role="radiogroup"
                aria-label="Calificar publicación con estrellas"
                className="mt-1 flex"
              >
                {[1, 2, 3, 4, 5].map((stars) => (
                  <button
                    key={stars}
                    type="button"
                    role="radio"
                    aria-checked={resumen.userRating === stars}
                    aria-label={`${stars} ${stars === 1 ? "estrella" : "estrellas"}`}
                    title={`Calificar con ${stars} ${stars === 1 ? "estrella" : "estrellas"}`}
                    disabled={enviandoCalificacion}
                    onClick={() => void guardarCalificacion(stars)}
                    className={`px-0.5 text-2xl leading-none disabled:cursor-wait ${
                      stars <= (resumen.userRating ?? 0)
                        ? "text-amber-500"
                        : "text-zinc-300"
                    }`}
                  >
                    {stars <= (resumen.userRating ?? 0) ? "★" : "☆"}
                  </button>
                ))}
              </div>
              {resumen.userRating ? (
                <p className="text-xs text-zinc-500">
                  Tu calificación: {resumen.userRating} de 5. Selecciona otra
                  cantidad para actualizarla.
                </p>
              ) : (
                <p className="text-xs text-zinc-500">
                  Selecciona de 1 a 5 estrellas para calificar.
                </p>
              )}
            </div>
          ) : null}

          <form onSubmit={enviarComentario} className="space-y-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">
                Deja un comentario
              </span>
              <textarea
                required
                minLength={1}
                maxLength={1000}
                rows={3}
                value={comentario}
                onChange={(evento) => setComentario(evento.target.value)}
                placeholder="Escribe un comentario (máximo 1000 caracteres)"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={enviandoComentario || !comentario.trim()}
              className="rounded-lg bg-teal-800 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enviandoComentario ? "Publicando…" : "Publicar comentario"}
            </button>
          </form>

          {requiereSesion ? (
            <p className="text-sm text-zinc-700">
              Para comentar o calificar,{" "}
              <Link href="/sign-in" className="font-semibold text-teal-800 underline">
                inicia sesión
              </Link>
              .
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {mensaje ? (
            <p role="status" className="text-sm text-teal-800">
              {mensaje}
            </p>
          ) : null}

          <div className="space-y-3">
            {comentarios.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Todavía no hay comentarios.
              </p>
            ) : (
              comentarios.map((item) => (
                <article
                  key={item.id}
                  className="rounded-lg bg-zinc-50 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="font-semibold text-zinc-800">
                      {item.authorName}
                    </p>
                    <time
                      dateTime={item.createdAt}
                      className="text-xs text-zinc-500"
                    >
                      {new Date(item.createdAt).toLocaleDateString("es-AR", {
                        dateStyle: "medium",
                      })}
                    </time>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-zinc-700">
                    {item.content}
                  </p>
                </article>
              ))
            )}
            {comentarios.length === 50 ? (
              <p className="text-xs text-zinc-500">
                Se muestran los 50 comentarios más recientes.
              </p>
            ) : null}
          </div>
      </div>
    </section>
  );
}
