import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Encabezado from "@/app/_componentes/encabezado";
import { esPersonal, obtenerUsuarioActual } from "@/lib/auth/usuario";
import { formatearFecha } from "@/lib/marketplace/formato";
import { listarUsuariosParaVerificar } from "@/lib/marketplace/verificacion";
import type { AdminUserSummary } from "@/src/types";
import CasillaVerificacion from "./casilla-verificacion";

export const metadata: Metadata = {
  title: "Administración",
  robots: { index: false },
};

const tamanoPagina = 50;

type ParametrosBusqueda = Promise<
  Record<string, string | string[] | undefined>
>;

function leerTexto(valor: string | string[] | undefined): string | undefined {
  const texto = typeof valor === "string" ? valor.trim() : "";
  return texto.length >= 2 && texto.length <= 100 ? texto : undefined;
}

function leerPagina(valor: string | string[] | undefined): number {
  const pagina = Number(typeof valor === "string" ? valor : "1");
  return Number.isInteger(pagina) && pagina >= 1 ? pagina : 1;
}

function enlacePagina(texto: string | undefined, pagina: number): string {
  const parametros = new URLSearchParams();
  if (texto) {
    parametros.set("q", texto);
  }
  if (pagina > 1) {
    parametros.set("page", String(pagina));
  }
  const consulta = parametros.toString();
  return consulta ? `/admin/usuarios?${consulta}` : "/admin/usuarios";
}

function FilaUsuario({
  usuario,
}: {
  usuario: AdminUserSummary;
}): React.JSX.Element {
  const nombrePublico = usuario.verifiedName ?? "Local verificado";
  return (
    <li className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-lg leading-snug font-semibold">
          {usuario.name}
        </p>
        <p className="truncate text-gris">{usuario.email}</p>
        <p className="mt-1 text-sm text-gris">
          {usuario.carCount} {usuario.carCount === 1 ? "auto" : "autos"} ·{" "}
          {usuario.serviceCount}{" "}
          {usuario.serviceCount === 1 ? "servicio" : "servicios"}
          {usuario.role !== "usuario" ? ` · ${usuario.role}` : ""}
        </p>
        {usuario.verifiedAt ? (
          <p className="mt-1 text-sm text-gris">
            Verificado el {formatearFecha(usuario.verifiedAt)}
            {nombrePublico !== usuario.name
              ? `. Se publica como “${nombrePublico}”`
              : ""}
          </p>
        ) : null}
      </div>
      <CasillaVerificacion
        usuarioId={usuario.id}
        nombre={usuario.name}
        verificadoInicial={usuario.verifiedAt !== null}
      />
    </li>
  );
}

async function PanelUsuarios({
  searchParams,
}: {
  searchParams: ParametrosBusqueda;
}): Promise<React.JSX.Element> {
  const actual = await obtenerUsuarioActual();
  if (!actual || !esPersonal(actual.role)) {
    notFound();
  }

  const parametros = await searchParams;
  const texto = leerTexto(parametros.q);
  const pagina = leerPagina(parametros.page);
  const { items, total } = await listarUsuariosParaVerificar({
    texto,
    pagina,
    tamanoPagina,
  });
  const hayMas = pagina * tamanoPagina < total;

  return (
    <>
      <h1 className="titular text-titulo">Locales verificados</h1>
      <p className="mt-3 max-w-2xl text-lg text-gris">
        Tildá a los usuarios que son locales reales. Sus publicaciones aparecen
        primero en las búsquedas, destacadas y con un tilde junto al nombre.
      </p>

      <form
        role="search"
        aria-label="Buscar usuarios"
        className="mt-8 flex flex-wrap items-end gap-3"
      >
        <label className="min-w-0 flex-1 basis-64">
          <span className="etiqueta">Nombre o correo</span>
          <input
            type="search"
            name="q"
            defaultValue={texto}
            minLength={2}
            maxLength={100}
            className="campo"
          />
        </label>
        <button type="submit" className="boton boton-principal">
          Buscar
        </button>
      </form>

      <p className="mt-6 text-sm text-gris">
        {total} {total === 1 ? "usuario" : "usuarios"}
      </p>
      {items.length > 0 ? (
        <ul className="mt-2 divide-y divide-linea border-y border-linea">
          {items.map((usuario) => (
            <FilaUsuario key={usuario.id} usuario={usuario} />
          ))}
        </ul>
      ) : (
        <div className="mt-2 rounded-xl border border-dashed border-linea p-6">
          <p className="font-semibold">No hay usuarios para mostrar.</p>
          <p className="mt-1 text-gris">
            Solo aparecen los usuarios que ya publicaron algo.
          </p>
        </div>
      )}

      {pagina > 1 || hayMas ? (
        <nav aria-label="Paginación" className="mt-6 flex gap-3">
          {pagina > 1 ? (
            <Link
              href={enlacePagina(texto, pagina - 1)}
              className="boton boton-secundario"
            >
              Anterior
            </Link>
          ) : null}
          {hayMas ? (
            <Link
              href={enlacePagina(texto, pagina + 1)}
              className="boton boton-secundario"
            >
              Siguiente
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}

export default function PaginaAdministracionUsuarios({
  searchParams,
}: {
  searchParams: ParametrosBusqueda;
}): React.JSX.Element {
  return (
    <>
      <Encabezado />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-10 pb-20 sm:px-8">
        {/*
          Con Cache Components el control de acceso corre dentro de Suspense:
          notFound() responde 200 con la pantalla de no encontrado y noindex.
          La API de verificación valida el rol por su cuenta.
        */}
        <Suspense fallback={<p className="text-gris">Cargando…</p>}>
          <PanelUsuarios searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}
