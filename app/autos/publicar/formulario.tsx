"use client";

import {
  Show,
  SignInButton,
  SignUpButton,
} from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type SubmitEvent } from "react";
import TarjetaAuto from "@/app/_componentes/tarjeta-auto";
import {
  provinciasArgentinas,
  type Provincia,
} from "@/lib/marketplace/provincias";
import SelectorFotos, {
  crearFotosPublicadas,
  liberarVistaPrevia,
  type FotoCargada,
} from "@/app/_componentes/selector-fotos";
import type { Car } from "@/src/types";

export type AutoEditable = Pick<
  Car,
  | "id"
  | "title"
  | "make"
  | "model"
  | "year"
  | "description"
  | "price"
  | "photos"
  | "city"
  | "province"
>;

function esProvincia(valor: string | null): valor is Provincia {
  return (provinciasArgentinas as readonly (string | null)[]).includes(valor);
}

const provinciaInicial: Provincia = "Santa Fe";

interface RespuestaPublicacion {
  error?: string;
  guardado?: boolean;
  item?: { title?: string };
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
    "title" in datos.item &&
    typeof datos.item.title === "string"
  ) {
    resultado.item = { title: datos.item.title };
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

/** Publica un auto nuevo o, con `autoExistente`, edita uno propio. */
export default function FormularioPublicarAuto({
  subidaFotosHabilitada,
  autoExistente,
}: {
  subidaFotosHabilitada: boolean;
  autoExistente?: AutoEditable;
}): React.JSX.Element {
  const router = useRouter();
  const editando = Boolean(autoExistente);
  const [titulo, setTitulo] = useState(autoExistente?.title ?? "");
  const [marca, setMarca] = useState(autoExistente?.make ?? "");
  const [modelo, setModelo] = useState(autoExistente?.model ?? "");
  const [anio, setAnio] = useState(
    autoExistente ? String(autoExistente.year) : "",
  );
  const [descripcion, setDescripcion] = useState(
    autoExistente?.description ?? "",
  );
  const [precio, setPrecio] = useState(autoExistente?.price ?? "");
  const [fotos, setFotos] = useState<FotoCargada[]>(() =>
    crearFotosPublicadas(autoExistente?.photos ?? []),
  );
  const [ciudad, setCiudad] = useState(autoExistente?.city ?? "");
  const [provincia, setProvincia] = useState<Provincia>(
    esProvincia(autoExistente?.province ?? null)
      ? (autoExistente?.province as Provincia)
      : provinciaInicial,
  );
  const [publicando, setPublicando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const subiendoFotos = fotos.some((foto) => foto.estado === "subiendo");

  function limpiarFormulario() {
    setTitulo("");
    setMarca("");
    setModelo("");
    setAnio("");
    setDescripcion("");
    setPrecio("");
    fotos.forEach(liberarVistaPrevia);
    setFotos([]);
    setCiudad("");
    setProvincia(provinciaInicial);
  }

  async function publicarAuto(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    setMensaje(null);

    // Se calcula al enviar: leer la fecha durante el render rompe el prerender.
    const anioMaximo = new Date().getFullYear() + 1;
    if (Number(anio) > anioMaximo) {
      setError(`El año no puede ser posterior a ${anioMaximo}.`);
      return;
    }
    if (subiendoFotos) {
      setError("Esperá a que terminen de subirse las fotos.");
      return;
    }
    if (fotos.some((foto) => foto.estado === "error")) {
      setError("Hay fotos que no se subieron. Reintentalas o quitalas.");
      return;
    }

    setPublicando(true);
    try {
      const respuesta = await fetch(
        autoExistente ? `/api/autos/${autoExistente.id}` : "/api/autos",
        {
          method: autoExistente ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: titulo,
            make: marca,
            model: modelo,
            year: Number(anio),
            description: descripcion,
            price: precio,
            photos: fotos.flatMap((foto) => (foto.url ? [foto.url] : [])),
            city: ciudad,
            province: provincia,
          }),
        },
      );
      const datos = leerRespuesta(await respuesta.json());

      if (!respuesta.ok) {
        if (datos.guardado === true) {
          setMensaje(
            `${datos.error ?? "El auto se guardó, pero no pudo agregarse a la búsqueda."} La publicación está guardada y la búsqueda todavía no está sincronizada.`,
          );
          if (!autoExistente) {
            limpiarFormulario();
          }
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

      if (autoExistente) {
        router.push(`/autos/${autoExistente.id}`);
        router.refresh();
        return;
      }
      setMensaje(
        `Auto publicado${datos.item?.title ? `: ${datos.item.title}` : ""}.`,
      );
      limpiarFormulario();
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : editando
            ? "No se pudieron guardar los cambios."
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
        <section className="max-w-2xl rounded-2xl border border-linea bg-papel p-6">
          <h2 className="condensada text-subtitulo font-extrabold text-vidrio">
            Iniciá sesión para publicar
          </h2>
          <p className="mt-2 text-niebla">
            Las publicaciones quedan asociadas a una cuenta, así solo vos podés
            editarlas o eliminarlas.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <SignInButton forceRedirectUrl="/autos/publicar">
              <button type="button" className="boton boton-principal">
                Iniciar sesión
              </button>
            </SignInButton>
            <SignUpButton forceRedirectUrl="/autos/publicar">
              <button type="button" className="boton boton-secundario">
                Crear cuenta
              </button>
            </SignUpButton>
          </div>
        </section>
      }
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-12">
        <form
          onSubmit={publicarAuto}
          className="space-y-6 rounded-2xl border border-linea bg-papel p-5 sm:p-7"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="etiqueta">Título</span>
              <input
                required
                minLength={3}
                maxLength={160}
                value={titulo}
                onChange={(evento) => setTitulo(evento.target.value)}
                placeholder="Ej.: Toyota Corolla XEI, único dueño"
                className="campo"
              />
            </label>
            <label>
              <span className="etiqueta">Marca</span>
              <input
                required
                maxLength={100}
                value={marca}
                onChange={(evento) => setMarca(evento.target.value)}
                placeholder="Toyota"
                className="campo"
              />
            </label>
            <label>
              <span className="etiqueta">Modelo</span>
              <input
                required
                maxLength={100}
                value={modelo}
                onChange={(evento) => setModelo(evento.target.value)}
                placeholder="Corolla"
                className="campo"
              />
            </label>
            <label>
              <span className="etiqueta">Año</span>
              <input
                required
                type="number"
                inputMode="numeric"
                min="1886"
                step="1"
                value={anio}
                onChange={(evento) => setAnio(evento.target.value)}
                className="campo"
              />
            </label>
            <label>
              <span className="etiqueta">Precio</span>
              <input
                required
                type="number"
                inputMode="decimal"
                min="0"
                max="9999999999.99"
                step="0.01"
                value={precio}
                onChange={(evento) => setPrecio(evento.target.value)}
                placeholder="En pesos"
                className="campo"
              />
            </label>
            <label className="sm:col-span-2">
              <span className="etiqueta">Descripción</span>
              <textarea
                required
                minLength={10}
                maxLength={10_000}
                rows={5}
                value={descripcion}
                onChange={(evento) => setDescripcion(evento.target.value)}
                placeholder="Kilometraje, estado, service, papeles al día…"
                className="campo"
              />
            </label>
          </div>

          <fieldset>
            <legend className="etiqueta">Ubicación</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="ayuda mt-0 mb-1">Ciudad</span>
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="address-level2"
                  value={ciudad}
                  onChange={(evento) => setCiudad(evento.target.value)}
                  placeholder="Ej.: Rafaela"
                  className="campo"
                />
              </label>
              <label>
                <span className="ayuda mt-0 mb-1">Provincia</span>
                <select
                  required
                  autoComplete="address-level1"
                  value={provincia}
                  onChange={(evento) =>
                    setProvincia(evento.target.value as Provincia)
                  }
                  className="campo"
                >
                  {provinciasArgentinas.map((nombre) => (
                    <option key={nombre} value={nombre}>
                      {nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend className="etiqueta">Fotos</legend>
            <p className="ayuda mt-0 mb-3">
              La primera foto es la portada de la publicación.
            </p>
            <SelectorFotos
              fotos={fotos}
              onCambio={setFotos}
              habilitado={subidaFotosHabilitada}
              carpeta="autos"
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
            <Link
              href={autoExistente ? "/mis-publicaciones" : "/autos"}
              className="enlace"
            >
              {autoExistente ? "Cancelar" : "Ver autos en venta"}
            </Link>
            <button
              type="submit"
              disabled={publicando || subiendoFotos}
              className="boton boton-principal"
            >
              {publicando
                ? editando
                  ? "Guardando…"
                  : "Publicando…"
                : subiendoFotos
                  ? "Subiendo fotos…"
                  : editando
                    ? "Guardar cambios"
                    : "Publicar auto"}
            </button>
          </div>
        </form>

        <aside
          aria-labelledby="titulo-vista-previa"
          className="self-start lg:sticky lg:top-6"
        >
          <h2
            id="titulo-vista-previa"
            className="mb-4 text-[0.9375rem] font-semibold text-niebla"
          >
            Así se verá en los resultados
          </h2>
          <TarjetaAuto
            auto={{
              title: titulo.trim(),
              make: marca.trim(),
              model: modelo.trim(),
              year: Number(anio) || undefined,
              price: precio,
              foto: fotos[0]?.vistaPrevia,
              ubicacion: ciudad.trim()
                ? `${ciudad.trim()}, ${provincia}`
                : undefined,
            }}
          />
        </aside>
      </div>
    </Show>
  );
}
