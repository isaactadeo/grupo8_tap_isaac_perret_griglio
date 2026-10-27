import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { esAdmin, obtenerUsuarioActual } from "@/lib/auth/usuario";
import { obtenerServicio } from "@/lib/marketplace/repositorio";
import FormularioServicio from "@/app/servicios/formulario-servicio";

export const metadata: Metadata = {
  title: "Editar servicio",
};

interface PropiedadesPagina {
  params: Promise<{ id: string }>;
}

async function EdicionServicio({
  params,
}: PropiedadesPagina): Promise<React.JSX.Element> {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    notFound();
  }

  const usuario = await obtenerUsuarioActual();
  if (!usuario) {
    return (
      <p className="mt-6 text-lg">
        <Link href="/sign-in" className="enlace">
          Iniciá sesión
        </Link>{" "}
        para editar tus publicaciones.
      </p>
    );
  }

  const servicio = await obtenerServicio(id);
  // Igual que la API: un servicio ajeno se trata como inexistente, salvo para admins.
  if (!servicio || (servicio.userId !== usuario.id && !esAdmin(usuario.role))) {
    notFound();
  }

  return (
    <FormularioServicio
      subidaFotosHabilitada={Boolean(process.env.BLOB_READ_WRITE_TOKEN)}
      servicioExistente={{
        id: servicio.id,
        title: servicio.title,
        category: servicio.category,
        description: servicio.description,
        price: servicio.price,
        photos: servicio.photos,
        location: servicio.location,
      }}
    />
  );
}

export default function PaginaEditarServicio({
  params,
}: PropiedadesPagina): React.JSX.Element {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-10 pb-20 sm:px-8">
      <h1 className="titular text-titulo">
        Editar servicio
      </h1>
      <Suspense fallback={<p className="mt-6 text-gris">Cargando publicación…</p>}>
        <EdicionServicio params={params} />
      </Suspense>
    </main>
  );
}
