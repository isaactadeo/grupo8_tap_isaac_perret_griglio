// Sin "use client": solo se usa desde componentes cliente (formularios de publicación).
import { upload } from "@vercel/blob/client";
import Image from "next/image";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
  maximoFotos,
  type CarpetaFotos,
  tamanoMaximoFoto,
  tiposFotoPermitidos,
} from "@/lib/marketplace/fotos";

export interface FotoCargada {
  id: number;
  nombre: string;
  /** Solo en fotos nuevas; las ya publicadas no tienen archivo local. */
  archivo?: File;
  /** URL local (blob:) mientras se sube, o la URL pública si ya estaba publicada. */
  vistaPrevia: string;
  estado: "subiendo" | "lista" | "error";
  progreso: number;
  /** URL pública en Vercel Blob, disponible cuando la subida termina. */
  url?: string;
}

type ActualizarFotos = (cambio: (fotos: FotoCargada[]) => FotoCargada[]) => void;

const megasMaximos = tamanoMaximoFoto / (1024 * 1024);

function esTipoPermitido(tipo: string): boolean {
  return (tiposFotoPermitidos as readonly string[]).includes(tipo);
}

/** Nombre de archivo sin acentos ni espacios; Blob agrega un sufijo aleatorio. */
function nombreSeguro(nombre: string): string {
  const limpio = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-80);
  return limpio || "foto.jpg";
}

export function liberarVistaPrevia(foto: FotoCargada): void {
  if (foto.vistaPrevia.startsWith("blob:")) {
    URL.revokeObjectURL(foto.vistaPrevia);
  }
}

/** Convierte las URLs de una publicación existente en fotos ya subidas. */
export function crearFotosPublicadas(urls: string[]): FotoCargada[] {
  return urls.map((url, indice) => ({
    // Ids negativos para no chocar con los de las fotos nuevas.
    id: -(indice + 1),
    nombre: `foto ${indice + 1}`,
    vistaPrevia: url,
    estado: "lista",
    progreso: 100,
    url,
  }));
}

export default function SelectorFotos({
  fotos,
  onCambio,
  habilitado,
  carpeta,
}: {
  carpeta: CarpetaFotos;
  fotos: FotoCargada[];
  onCambio: ActualizarFotos;
  habilitado: boolean;
}): React.JSX.Element {
  const siguienteId = useRef(0);
  const [aviso, setAviso] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);

  function actualizarFoto(id: number, cambios: Partial<FotoCargada>) {
    onCambio((actuales) =>
      actuales.map((foto) => (foto.id === id ? { ...foto, ...cambios } : foto)),
    );
  }

  async function subir(id: number, archivo: File) {
    actualizarFoto(id, { estado: "subiendo", progreso: 0 });
    try {
      const resultado = await upload(
        `${carpeta}/${nombreSeguro(archivo.name)}`,
        archivo,
        {
          access: "public",
          handleUploadUrl: "/api/fotos",
          contentType: archivo.type,
          onUploadProgress: ({ percentage }) =>
            actualizarFoto(id, { progreso: Math.round(percentage) }),
        },
      );
      actualizarFoto(id, { estado: "lista", progreso: 100, url: resultado.url });
    } catch (error) {
      console.error("No se pudo subir la foto:", error);
      actualizarFoto(id, { estado: "error" });
    }
  }

  function agregarArchivos(lista: FileList | null) {
    if (!lista || lista.length === 0) {
      return;
    }

    const problemas: string[] = [];
    const lugares = maximoFotos - fotos.length;
    const aceptados: File[] = [];
    for (const archivo of Array.from(lista)) {
      if (!esTipoPermitido(archivo.type)) {
        problemas.push(`${archivo.name}: usá fotos JPG, PNG o WebP.`);
      } else if (archivo.size > tamanoMaximoFoto) {
        problemas.push(`${archivo.name}: supera los ${megasMaximos} MB.`);
      } else if (aceptados.length >= lugares) {
        problemas.push(
          `${archivo.name}: ya llegaste al máximo de ${maximoFotos} fotos.`,
        );
      } else {
        aceptados.push(archivo);
      }
    }
    setAviso(problemas.length > 0 ? problemas.join(" ") : null);

    const nuevas = aceptados.map(
      (archivo): FotoCargada => ({
        id: ++siguienteId.current,
        nombre: archivo.name,
        archivo,
        vistaPrevia: URL.createObjectURL(archivo),
        estado: "subiendo",
        progreso: 0,
      }),
    );
    onCambio((actuales) => [...actuales, ...nuevas]);
    for (const foto of nuevas) {
      void subir(foto.id, archivoDe(foto));
    }
  }

  function alElegir(evento: ChangeEvent<HTMLInputElement>) {
    agregarArchivos(evento.target.files);
    // Permite volver a elegir el mismo archivo después de quitarlo.
    evento.target.value = "";
  }

  function alSoltar(evento: DragEvent<HTMLDivElement>) {
    evento.preventDefault();
    setArrastrando(false);
    if (habilitado) {
      agregarArchivos(evento.dataTransfer.files);
    }
  }

  function quitar(foto: FotoCargada) {
    liberarVistaPrevia(foto);
    onCambio((actuales) => actuales.filter((actual) => actual.id !== foto.id));
  }

  function usarDePortada(foto: FotoCargada) {
    onCambio((actuales) => [
      foto,
      ...actuales.filter((actual) => actual.id !== foto.id),
    ]);
  }

  const lleno = fotos.length >= maximoFotos;

  function archivoDe(foto: FotoCargada): File {
    // Solo las fotos nuevas pueden quedar en error o subirse.
    return foto.archivo as File;
  }

  return (
    <div className="@container">
      <div
        onDragOver={(evento) => {
          evento.preventDefault();
          if (habilitado && !lleno) {
            setArrastrando(true);
          }
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={alSoltar}
        className={`flex flex-col items-start gap-3 rounded-xl border-2 border-dashed p-5 @md:flex-row @md:items-center ${
          arrastrando ? "border-tinta bg-hueso" : "border-linea"
        }`}
      >
        <label
          className={`boton boton-secundario has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-tinta ${
            !habilitado || lleno ? "pointer-events-none opacity-50" : ""
          }`}
        >
          Elegir fotos
          <input
            type="file"
            accept={tiposFotoPermitidos.join(",")}
            multiple
            disabled={!habilitado || lleno}
            onChange={alElegir}
            className="sr-only"
          />
        </label>
        <p className="text-sm text-gris">
          {habilitado
            ? lleno
              ? `Llegaste al máximo de ${maximoFotos} fotos.`
              : `O arrastralas acá. JPG, PNG o WebP, hasta ${megasMaximos} MB cada una y ${maximoFotos} en total.`
            : "La subida de fotos no está configurada en este servidor. Podés publicar el auto sin fotos."}
        </p>
      </div>

      {aviso ? (
        <p role="status" className="mt-2 text-sm font-medium text-alerta">
          {aviso}
        </p>
      ) : null}

      {fotos.length > 0 ? (
        <ul className="mt-4 grid grid-cols-2 gap-4 @lg:grid-cols-3" aria-label="Fotos elegidas">
          {fotos.map((foto, indice) => (
            <li key={foto.id}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-hueso-hondo">
                <Image
                  src={foto.vistaPrevia}
                  alt={`Foto ${indice + 1}: ${foto.nombre}`}
                  fill
                  unoptimized
                  className="object-cover"
                />
                {indice === 0 ? (
                  <span className="insignia absolute top-2 left-2 z-10 bg-destacado-suave text-destacado">
                    Portada
                  </span>
                ) : null}
                {foto.estado === "subiendo" ? (
                  <div className="absolute inset-x-0 bottom-0 bg-carbon/80 px-3 py-2 text-xs font-semibold text-papel">
                    <span role="status">Subiendo {foto.progreso}%</span>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/25">
                      <div
                        className="h-full bg-papel"
                        style={{ width: `${foto.progreso}%` }}
                      />
                    </div>
                  </div>
                ) : null}
                {foto.estado === "error" ? (
                  <div className="absolute inset-0 grid place-content-center gap-2 bg-carbon/70 p-3 text-center text-sm font-semibold text-papel">
                    <span role="alert">No se pudo subir</span>
                    <button
                      type="button"
                      onClick={() => void subir(foto.id, archivoDe(foto))}
                      className="rounded-lg bg-papel px-3 py-1 text-alerta"
                    >
                      Reintentar
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 text-sm">
                <button
                  type="button"
                  onClick={() => quitar(foto)}
                  aria-label={`Quitar ${foto.nombre}`}
                  className="font-semibold text-gris hover:text-alerta"
                >
                  Quitar
                </button>
                {indice > 0 ? (
                  <button
                    type="button"
                    onClick={() => usarDePortada(foto)}
                    aria-label={`Usar ${foto.nombre} como portada`}
                    className="font-semibold text-gris hover:text-tinta"
                  >
                    Usar de portada
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
