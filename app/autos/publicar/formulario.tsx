"use client";

import {
  Show,
  SignInButton,
  SignUpButton,
} from "@clerk/nextjs";
import Link from "next/link";
import { useState, type FormEvent } from "react";

interface RespuestaPublicacion {
  error?: string;
  guardado?: boolean;
  item?: { id?: string; title?: string };
  detalles?: { campo: string; mensaje: string }[];
}

function leerRespuesta(datos: unknown): RespuestaPublicacion {
  if (typeof datos !== "object" || datos === null) {
    return {};
  }

  const resultado: RespuestaPublicacion = {};
  if ("error" in datos && typeof datos.error === "string") {
    resultado.error = datos.error;
  }
  if ("guardado" in datos && typeof datos.guardado === "boolean") {
    resultado.guardado = datos.guardado;
  }
  if (
    "item" in datos &&
    typeof datos.item === "object" &&
    datos.item !== null &&
    (("title" in datos.item && typeof datos.item.title === "string") ||
      ("id" in datos.item && typeof datos.item.id === "string"))
  ) {
    resultado.item = {
      ...("id" in datos.item && typeof datos.item.id === "string"
        ? { id: datos.item.id }
        : {}),
      ...("title" in datos.item && typeof datos.item.title === "string"
        ? { title: datos.item.title }
        : {}),
    };
  }
  if ("detalles" in datos && Array.isArray(datos.detalles)) {
    resultado.detalles = datos.detalles.flatMap((detalle) => {
      if (
        typeof detalle === "object" &&
        detalle !== null &&
        "campo" in detalle &&
        typeof detalle.campo === "string" &&
        "mensaje" in detalle &&
        typeof detalle.mensaje === "string"
      ) {
        return [{ campo: detalle.campo, mensaje: detalle.mensaje }];
      }
      return [];
    });
  }
  return resultado;
}

export default function FormularioPublicarAuto(): React.JSX.Element {
  const [titulo, setTitulo] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [anio, setAnio] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [fotos, setFotos] = useState("");
  const [latitud, setLatitud] = useState("");
  const [longitud, setLongitud] = useState("");
  const [publicando, setPublicando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [urlPublicacion, setUrlPublicacion] = useState<string | null>(null);

  function limpiarFormulario() {
    setTitulo("");
    setMarca("");
    setModelo("");
    setAnio("");
    setDescripcion("");
    setPrecio("");
    setFotos("");
    setLatitud("");
    setLongitud("");
  }

  async function publicarAuto(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setPublicando(true);
    setError(null);
    setMensaje(null);
    setUrlPublicacion(null);

    const fotosAuto = fotos
      .split(/\r?\n/)
      .map((url) => url.trim())
      .filter(Boolean);
    const tieneLatitud = latitud.trim() !== "";
    const tieneLongitud = longitud.trim() !== "";

    if (tieneLatitud !== tieneLongitud) {
      setError("Completa ambas coordenadas o deja las dos vacías.");
      setPublicando(false);
      return;
    }

    if (fotosAuto.length > 10) {
      setError("Puedes agregar un máximo de 10 fotos.");
      setPublicando(false);
      return;
    }
    if (
      fotosAuto.some((url) => {
        try {
          return new URL(url).protocol !== "https:" || url.length > 2048;
        } catch {
          return true;
        }
      })
    ) {
      setError("Cada foto debe ser una URL válida con HTTPS (máximo 2048 caracteres).");
      setPublicando(false);
      return;
    }

    const ubicacion =
      tieneLatitud && tieneLongitud
        ? { lat: Number(latitud), lng: Number(longitud) }
        : null;
    if (
      ubicacion &&
      (!Number.isFinite(ubicacion.lat) ||
        ubicacion.lat < -90 ||
        ubicacion.lat > 90 ||
        !Number.isFinite(ubicacion.lng) ||
        ubicacion.lng < -180 ||
        ubicacion.lng > 180)
    ) {
      setError("Ingresa coordenadas válidas: latitud entre -90 y 90, longitud entre -180 y 180.");
      setPublicando(false);
      return;
    }

    try {
      const respuesta = await fetch("/api/autos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titulo,
          make: marca,
          model: modelo,
          year: Number(anio),
          description: descripcion,
          price: precio,
          photos: fotosAuto,
          location: ubicacion,
        }),
      });
      const datos = leerRespuesta(await respuesta.json());

      if (!respuesta.ok) {
        if (datos.guardado === true) {
          if (datos.item?.id) {
            setUrlPublicacion(`/autos/${datos.item.id}`);
          }
          setMensaje(
            `${datos.error ?? "El auto se guardó, pero no pudo agregarse a la búsqueda."} La publicación está guardada y la búsqueda todavía no está sincronizada.`,
          );
          limpiarFormulario();
          return;
        }
        const detalleValidacion = datos.detalles
          ?.map((detalle) =>
            detalle.campo
              ? `${detalle.campo}: ${detalle.mensaje}`
              : detalle.mensaje,
          )
          .join(" ");
        throw new Error(
          [datos.error ?? "No se pudo publicar el auto.", detalleValidacion]
            .filter(Boolean)
            .join(" "),
        );
      }

      setMensaje(
        `Publicación creada${datos.item?.title ? `: ${datos.item.title}` : ""}.`,
      );
      if (datos.item?.id) {
        setUrlPublicacion(`/autos/${datos.item.id}`);
      }
      limpiarFormulario();
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : "No se pudo publicar el auto.",
      );
    } finally {
      setPublicando(false);
    }
  }

  return (
    <Show
      when="signed-in"
      fallback={
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Inicia sesión para publicar</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Solo usuarios autenticados pueden crear publicaciones.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <SignInButton forceRedirectUrl="/autos/publicar">
              <button className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700">
                Iniciar sesión
              </button>
            </SignInButton>
            <SignUpButton forceRedirectUrl="/autos/publicar">
              <button className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50">
                Crear cuenta
              </button>
            </SignUpButton>
          </div>
        </section>
      }
    >
      <form
        onSubmit={publicarAuto}
        className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1 block text-sm font-medium">Título</span>
            <input
              required
              minLength={3}
              maxLength={160}
              value={titulo}
              onChange={(evento) => setTitulo(evento.target.value)}
              placeholder="Ej.: Toyota Corolla XEI en excelente estado"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Marca</span>
            <input
              required
              maxLength={100}
              value={marca}
              onChange={(evento) => setMarca(evento.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5"
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Modelo</span>
            <input
              required
              maxLength={100}
              value={modelo}
              onChange={(evento) => setModelo(evento.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5"
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Año</span>
            <input
              required
              type="number"
              min="1886"
              max={new Date().getFullYear() + 1}
              step="1"
              value={anio}
              onChange={(evento) => setAnio(evento.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5"
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Precio</span>
            <input
              required
              type="number"
              min="0"
              max="9999999999.99"
              step="0.01"
              value={precio}
              onChange={(evento) => setPrecio(evento.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-sm font-medium">Descripción</span>
            <textarea
              required
              minLength={10}
              maxLength={10_000}
              rows={5}
              value={descripcion}
              onChange={(evento) => setDescripcion(evento.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-sm font-medium">
              Fotos: URLs HTTPS, una por línea (máximo 10)
            </span>
            <textarea
              value={fotos}
              onChange={(evento) => setFotos(evento.target.value)}
              rows={4}
              placeholder={"https://ejemplo.com/foto-1.jpg\nhttps://ejemplo.com/foto-2.jpg"}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5"
            />
            <span className="mt-1 block text-xs text-zinc-500">
              La subida de archivos desde tu dispositivo todavía no está
              disponible.
            </span>
          </label>
        </div>

        <fieldset className="space-y-3 rounded-xl border border-zinc-200 p-4">
          <legend className="px-1 text-sm font-medium">
            Ubicación (opcional)
          </legend>
          <p className="text-xs text-zinc-500">
            Ingresa las coordenadas del vehículo o deja ambos campos vacíos.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-sm font-medium">Latitud</span>
              <input
                type="number"
                min="-90"
                max="90"
                step="any"
                value={latitud}
                onChange={(evento) => setLatitud(evento.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5"
              />
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">Longitud</span>
              <input
                type="number"
                min="-180"
                max="180"
                step="any"
                value={longitud}
                onChange={(evento) => setLongitud(evento.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5"
              />
            </label>
          </div>
        </fieldset>

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
        {urlPublicacion ? (
          <Link
            href={urlPublicacion}
            className="inline-flex rounded-lg border border-teal-800 px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50"
          >
            Ver publicación y sus comentarios
          </Link>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-950"
          >
            Volver al inicio
          </Link>
          <button
            type="submit"
            disabled={publicando}
            className="rounded-lg bg-teal-800 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-wait disabled:opacity-60"
          >
            {publicando ? "Publicando…" : "Publicar auto"}
          </button>
        </div>
      </form>
    </Show>
  );
}
