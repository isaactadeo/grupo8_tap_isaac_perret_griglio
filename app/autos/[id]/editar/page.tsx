import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import FormularioPublicarAuto from "@/app/autos/publicar/formulario";
import { obtenerIdUsuarioActual } from "@/lib/auth/usuario";
import { obtenerAuto } from "@/lib/marketplace/repositorio";

export const metadata: Metadata = {
  title: "Editar auto",
};

interface PropiedadesPagina {
  params: Promise<{ id: string }>;
}

async function EdicionAuto({
  params,
}: PropiedadesPagina): Promise<React.JSX.Element> {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    notFound();
  }

  const usuarioId = await obtenerIdUsuarioActual();
  if (!usuarioId) {
    return (
      <p className="mt-6 text-lg">
        <Link href="/sign-in" className="enlace">
          Iniciá sesión
        </Link>{" "}
        para editar tus publicaciones.
      </p>
    );
  }

  const auto = await obtenerAuto(id);
  // Igual que la API: un auto ajeno se trata como inexistente.
  if (!auto || auto.userId !== usuarioId) {
    notFound();
  }

  return (
    <>
      <p className="mt-3 mb-8 max-w-2xl text-lg text-niebla">
        Los cambios se ven en la publicación apenas los guardás.
      </p>
      <FormularioPublicarAuto
        subidaFotosHabilitada={Boolean(process.env.BLOB_READ_WRITE_TOKEN)}
        autoExistente={{
          id: auto.id,
          title: auto.title,
          make: auto.make,
          model: auto.model,
          year: auto.year,
          description: auto.description,
          price: auto.price,
          photos: auto.photos,
          city: auto.city,
          province: auto.province,
        }}
      />
    </>
  );
}

export default function PaginaEditarAuto({
  params,
}: PropiedadesPagina): React.JSX.Element {
  return (
    <>
      <h1 className="condensada text-titulo font-extrabold text-vidrio">
        Editar auto
      </h1>
      <Suspense fallback={<p className="mt-6 text-niebla">Cargando publicación…</p>}>
        <EdicionAuto params={params} />
      </Suspense>
    </>
  );
}
