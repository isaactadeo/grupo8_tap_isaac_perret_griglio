"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type SubmitEvent } from "react";
import SelectorFotos, {
  crearFotosPublicadas,
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
  return "No se pudieron guardar los cambios.";
}

export default function FormularioEditarServicio({
  servicio,
  subidaFotosHabilitada,
}: {
  servicio: ServicioEditable;
  subidaFotosHabilitada: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const [titulo, setTitulo] = useState(servicio.title);
  const [categoria, setCategoria] = useState<ServiceType>(servicio.category);
  const [descripcion, setDescripcion] = useState(servicio.description);
  const [precio, setPrecio] = useState(servicio.price);
  const [fotos, setFotos] = useState<FotoCargada[]>(() =>
    crearFotosPublicadas(servicio.photos),
  );
  const [ubicacion, setUbicacion] = useState<GeoCoordinates | null>(
    servicio.location,
  );
  const [marcando, setMarcando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const subiendoFotos = fotos.some((foto) => foto.estado === "subiendo");

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
      const respuesta = await fetch(`/api/servicios/${servicio.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titulo,
          category: categoria,
          description: descripcion,
          price: precio,
          photos: fotos.flatMap((foto) => (foto.url ? [foto.url] : [])),
          location: ubicacion,
        }),
      });
      const datos: unknown = await respuesta.json();
      if (!respuesta.ok) {
        if (
          typeof datos === "object" &&
          datos !== null &&
          "guardado" in datos &&
          datos.guardado === true
        ) {
          setMensaje(
            "Los cambios se guardaron, pero la búsqueda todavía no se actualizó.",
          );
          return;
        }
        throw new Error(leerMensajeError(datos));
      }
      router.push("/mis-publicaciones");
      router.refresh();
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : "No se pudieron guardar los cambios.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
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
          {mensaje}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-linea pt-5">
        <Link href="/mis-publicaciones" className="enlace">
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={guardando || subiendoFotos}
          className="boton boton-principal"
        >
          {guardando
            ? "Guardando…"
            : subiendoFotos
              ? "Subiendo fotos…"
              : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
