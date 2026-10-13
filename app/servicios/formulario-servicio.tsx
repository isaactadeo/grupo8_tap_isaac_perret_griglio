"use client";

import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type SubmitEvent } from "react";
import SelectorFotos, {
  crearFotosPublicadas,
  liberarVistaPrevia,
  type FotoCargada,
} from "@/app/_componentes/selector-fotos";
import MapaServicios from "@/app/servicios/mapa";
import type { GeoCoordinates, Service, ServiceType } from "@/src/types";

export type ServicioEditable = Pick<
  Service,
  "id" | "title" | "category" | "description" | "price" | "photos" | "location"
>;

function leerMensajeError(datos: unknown): string {
  if (
    typeof datos === "object" &&
    datos !== null &&
    "error" in datos &&
    typeof datos.error === "string"
  ) {
    return datos.error;
  }
  return "";
}

/** Publica un servicio nuevo o, con `servicioExistente`, edita uno propio. */
export default function FormularioServicio({
  servicioExistente,
  subidaFotosHabilitada,
}: {
  servicioExistente?: ServicioEditable;
  subidaFotosHabilitada: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const editando = Boolean(servicioExistente);
  const [titulo, setTitulo] = useState(servicioExistente?.title ?? "");
  const [categoria, setCategoria] = useState<ServiceType>(
    servicioExistente?.category ?? "taller",
  );
  const [descripcion, setDescripcion] = useState(
    servicioExistente?.description ?? "",
  );
  const [precio, setPrecio] = useState(servicioExistente?.price ?? "");
  const [fotos, setFotos] = useState<FotoCargada[]>(() =>
    crearFotosPublicadas(servicioExistente?.photos ?? []),
  );
  const [ubicacion, setUbicacion] = useState<GeoCoordinates | null>(
    servicioExistente?.location ?? null,
  );
  const [marcando, setMarcando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const subiendoFotos = fotos.some((foto) => foto.estado === "subiendo");
  const errorPorDefecto = editando
    ? "No se pudieron guardar los cambios."
    : "No se pudo publicar el servicio.";

  function limpiarFormulario() {
    setTitulo("");
    setCategoria("taller");
    setDescripcion("");
    setPrecio("");
    fotos.forEach(liberarVistaPrevia);
    setFotos([]);
    setUbicacion(null);
  }

  async function guardar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    setMensaje(null);
    if (subiendoFotos) {
      setError("Esperá a que terminen de subirse las fotos.");
      return;
    }
    if (fotos.some((foto) => foto.estado === "error")) {
      setError("Hay fotos que no se subieron. Reintentalas o quitalas.");
      return;
    }

    setGuardando(true);
    try {
      const respuesta = await fetch(
        servicioExistente
          ? `/api/servicios/${servicioExistente.id}`
          : "/api/servicios",
        {
          method: servicioExistente ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: titulo,
            category: categoria,
            description: descripcion,
            price: precio,
            photos: fotos.flatMap((foto) => (foto.url ? [foto.url] : [])),
            location: ubicacion,
          }),
        },
      );
      const datos: unknown = await respuesta.json();
      if (!respuesta.ok) {
        if (
          typeof datos === "object" &&
          datos !== null &&
          "guardado" in datos &&
          datos.guardado === true
        ) {
          setMensaje(
            "Se guardó, pero la búsqueda todavía no se actualizó: puede tardar en aparecer en el mapa.",
          );
          if (!servicioExistente) {
            limpiarFormulario();
          }
          return;
        }
        throw new Error(leerMensajeError(datos) || errorPorDefecto);
      }
      if (servicioExistente) {
        router.push("/mis-publicaciones");
        router.refresh();
        return;
      }
      setMensaje("Servicio publicado.");
      limpiarFormulario();
    } catch (fallo) {
      setError(
        fallo instanceof Error && fallo.message
          ? fallo.message
          : errorPorDefecto,
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Show
      when="signed-in"
      fallback={
        <section className="mt-8 max-w-2xl rounded-2xl border border-linea bg-papel p-6">
          <h2 className="condensada text-subtitulo font-extrabold text-vidrio">
            Iniciá sesión para publicar
          </h2>
          <p className="mt-2 text-niebla">
            Los servicios quedan asociados a una cuenta, así solo vos podés
            editarlos o eliminarlos.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <SignInButton forceRedirectUrl="/servicios/publicar">
              <button type="button" className="boton boton-principal">
                Iniciar sesión
              </button>
            </SignInButton>
            <SignUpButton forceRedirectUrl="/servicios/publicar">
              <button type="button" className="boton boton-secundario">
                Crear cuenta
              </button>
            </SignUpButton>
          </div>
        </section>
      }
    >
      <form
        onSubmit={guardar}
        className="mt-8 max-w-3xl space-y-6 rounded-2xl border border-linea bg-papel p-5 sm:p-7"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="etiqueta">Nombre</span>
            <input
              required
              minLength={3}
              maxLength={160}
              value={titulo}
              onChange={(evento) => setTitulo(evento.target.value)}
              className="campo"
            />
          </label>
          <label>
            <span className="etiqueta">Tipo</span>
            <select
              value={categoria}
              onChange={(evento) =>
                setCategoria(evento.target.value as ServiceType)
              }
              className="campo"
            >
              <option value="taller">Taller</option>
              <option value="lavadero">Lavadero</option>
            </select>
          </label>
          <label>
            <span className="etiqueta">Precio de referencia</span>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={precio}
              onChange={(evento) => setPrecio(evento.target.value)}
              className="campo"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="etiqueta">Descripción</span>
            <textarea
              required
              minLength={10}
              maxLength={10_000}
              rows={4}
              value={descripcion}
              onChange={(evento) => setDescripcion(evento.target.value)}
              className="campo"
            />
          </label>
        </div>

        <fieldset>
          <legend className="etiqueta">Fotos</legend>
          <SelectorFotos
            fotos={fotos}
            onCambio={setFotos}
            habilitado={subidaFotosHabilitada}
            carpeta="servicios"
          />
        </fieldset>

        <fieldset>
          <legend className="etiqueta">Ubicación</legend>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setMarcando(true)}
              aria-pressed={marcando}
              className="boton boton-secundario min-h-9 px-3 py-1.5 text-sm"
            >
              {ubicacion ? "Cambiar ubicación" : "Marcar ubicación en el mapa"}
            </button>
            {ubicacion ? (
              <button
                type="button"
                onClick={() => setUbicacion(null)}
                className="text-sm font-semibold text-niebla hover:text-alerta"
              >
                Quitar ubicación
              </button>
            ) : (
              <span className="ayuda mt-0">Opcional.</span>
            )}
          </div>
          <MapaServicios
            items={[]}
            centroBusqueda={null}
            radioKm={0}
            ubicacionFormulario={ubicacion}
            modoSeleccion={marcando ? "publicacion" : null}
            onSeleccionarUbicacion={(punto) => {
              if (marcando) {
                setUbicacion(punto);
                setMarcando(false);
              }
            }}
          />
        </fieldset>

        {error ? (
          <p role="alert" className="font-medium text-alerta">
            {error}
          </p>
        ) : null}
        {mensaje ? (
          <p role="status" className="font-medium text-vidrio">
            {mensaje}{" "}
            {!editando ? (
              <>
                <Link href="/servicios" className="enlace">
                  Ver servicios
                </Link>{" "}
                o{" "}
                <Link href="/mis-publicaciones" className="enlace">
                  ir a mis publicaciones
                </Link>
                .
              </>
            ) : null}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-linea pt-5">
          <Link
            href={editando ? "/mis-publicaciones" : "/servicios"}
            className="enlace"
          >
            {editando ? "Cancelar" : "Volver a servicios"}
          </Link>
          <button
            type="submit"
            disabled={guardando || subiendoFotos}
            className="boton boton-principal"
          >
            {guardando
              ? editando
                ? "Guardando…"
                : "Publicando…"
              : subiendoFotos
                ? "Subiendo fotos…"
                : editando
                  ? "Guardar cambios"
                  : "Publicar servicio"}
          </button>
        </div>
      </form>
    </Show>
  );
}
