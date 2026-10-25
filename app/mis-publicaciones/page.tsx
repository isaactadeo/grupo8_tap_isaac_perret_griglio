import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import BotonEliminar from "@/app/_componentes/boton-eliminar";
import Encabezado from "@/app/_componentes/encabezado";
import { esPersonal, obtenerUsuarioActual } from "@/lib/auth/usuario";
import {
  formatearFecha,
  formatearPrecio,
  formatearUbicacion,
} from "@/lib/marketplace/formato";
import {
  listarAutosDeUsuario,
  listarServiciosDeUsuario,
} from "@/lib/marketplace/repositorio";

export const metadata: Metadata = {
  title: "Mis publicaciones",
};

function FilaPublicacion({
  foto,
  titulo,
  detalle,
  precio,
  fecha,
  enlace,
  editar,
  eliminar,
}: {
  foto?: string;
  titulo: string;
  detalle: string;
  precio: string;
  fecha: Date;
  enlace?: string;
  editar: string;
  eliminar: React.ReactNode;
}): React.JSX.Element {
  return (
    <li className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
      <div className="foto-vacia relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg border border-linea sm:w-36">
        {foto ? (
          <Image src={foto} alt="" fill unoptimized sizes="144px" className="object-cover" />
        ) : (
          <span className="absolute inset-x-3 bottom-2 text-xs">
            Sin fotos
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-lg leading-snug font-semibold">
          {enlace ? (
            <Link href={enlace} className="hover:underline">
              {titulo}
            </Link>
          ) : (
            titulo
          )}
        </h3>
        <p className="mt-0.5 text-gris">{detalle}</p>
        <p className="mt-1 text-sm text-gris">
          <span className="precio text-carbon">{precio}</span>
          <span className="ml-3">Publicado el {formatearFecha(fecha)}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-2 sm:justify-end">
        <Link href={editar} className="boton boton-secundario min-h-9 px-3 py-1.5 text-sm">
          Editar
        </Link>
        {eliminar}
      </div>
    </li>
  );
}

async function ListadoPublicaciones(): Promise<React.JSX.Element> {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) {
    return (
      <div className="mt-8 max-w-xl rounded-xl border border-linea bg-papel p-6">
        <p className="text-lg font-semibold">
          Iniciá sesión para ver tus publicaciones.
        </p>
        <p className="mt-1 text-gris">
          Si ya iniciaste sesión, todavía no publicaste nada.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/sign-in" className="boton boton-principal">
            Ingresar
          </Link>
          <Link href="/autos/publicar" className="boton boton-secundario">
            Publicar auto
          </Link>
        </div>
      </div>
    );
  }

  const [autos, servicios] = await Promise.all([
    listarAutosDeUsuario(usuario.id),
    listarServiciosDeUsuario(usuario.id),
  ]);

  return (
    <>
      {esPersonal(usuario.role) ? (
        <p className="mt-4">
          <Link href="/admin/usuarios" className="enlace">
            Administración de usuarios
          </Link>
        </p>
      ) : null}
      <section aria-labelledby="titulo-mis-autos" className="mt-10">
        <h2
          id="titulo-mis-autos"
          className="titular text-subtitulo"
        >
          Autos ({autos.length})
        </h2>
        {autos.length > 0 ? (
          <ul className="mt-3 divide-y divide-linea border-y border-linea">
            {autos.map((auto) => (
              <FilaPublicacion
                key={auto.id}
                foto={auto.photos[0]}
                titulo={auto.title}
                detalle={[
                  `${auto.year} ${auto.make} ${auto.model}`,
                  formatearUbicacion(auto.city, auto.province),
                ]
                  .filter(Boolean)
                  .join(", ")}
                precio={formatearPrecio(auto.price)}
                fecha={auto.createdAt}
                enlace={`/autos/${auto.id}`}
                editar={`/autos/${auto.id}/editar`}
                eliminar={
                  <BotonEliminar tipo="auto" id={auto.id} titulo={auto.title} />
                }
              />
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-gris">
            No publicaste autos.{" "}
            <Link href="/autos/publicar" className="enlace">
              Publicar auto
            </Link>
          </p>
        )}
      </section>

      <section aria-labelledby="titulo-mis-servicios" className="mt-12">
        <h2
          id="titulo-mis-servicios"
          className="titular text-subtitulo"
        >
          Servicios ({servicios.length})
        </h2>
        {servicios.length > 0 ? (
          <ul className="mt-3 divide-y divide-linea border-y border-linea">
            {servicios.map((servicio) => (
              <FilaPublicacion
                key={servicio.id}
                foto={servicio.photos[0]}
                titulo={servicio.title}
                detalle={servicio.category === "taller" ? "Taller" : "Lavadero"}
                precio={formatearPrecio(servicio.price)}
                fecha={servicio.createdAt}
                editar={`/servicios/${servicio.id}/editar`}
                eliminar={
                  <BotonEliminar
                    tipo="servicio"
                    id={servicio.id}
                    titulo={servicio.title}
                  />
                }
              />
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-gris">
            No publicaste servicios.{" "}
            <Link href="/servicios/publicar" className="enlace">
              Publicar un servicio
            </Link>
          </p>
        )}
      </section>
    </>
  );
}

export default function PaginaMisPublicaciones(): React.JSX.Element {
  return (
    <>
      <Encabezado seccion="cuenta" />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-10 pb-20 sm:px-8">
        <h1 className="titular text-titulo">
          Mis publicaciones
        </h1>
        <Suspense fallback={<p className="mt-8 text-gris">Cargando tus publicaciones…</p>}>
          <ListadoPublicaciones />
        </Suspense>
      </main>
    </>
  );
}
