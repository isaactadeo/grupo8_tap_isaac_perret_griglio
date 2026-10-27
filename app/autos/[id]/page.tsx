import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { z } from "zod";
import { formatearPrecio } from "@/lib/marketplace/formato";
import { esAdmin, obtenerUsuarioActual } from "@/lib/auth/usuario";
import type { Car } from "@/src/types";
import VistaDetalleAuto from "./vista-detalle";

interface PropiedadesPagina {
  params: Promise<{ id: string }>;
}

const esquemaId = z.uuid();

// Compartido entre generateMetadata y la página dentro de la misma solicitud.
const cargarAuto = cache(async (id: string): Promise<Car | null> => {
  if (!esquemaId.safeParse(id).success) {
    return null;
  }
  const { obtenerAuto } = await import("@/lib/marketplace/repositorio");
  return obtenerAuto(id);
});

export async function generateMetadata({
  params,
}: PropiedadesPagina): Promise<Metadata> {
  const { id } = await params;
  let auto: Car | null;
  try {
    auto = await cargarAuto(id);
  } catch {
    return { title: "Auto en venta" };
  }
  if (!auto) {
    return { title: "Auto no encontrado" };
  }
  return {
    title: `${auto.title} (${auto.year})`,
    description: `${auto.make} ${auto.model} ${auto.year} en venta en Rafaela por ${formatearPrecio(auto.price)}.`,
  };
}

function EsqueletoDetalle(): React.JSX.Element {
  return (
    <div aria-hidden="true" className="space-y-6">
      <div className="h-4 w-40 rounded bg-hueso-hondo" />
      <div className="h-10 w-2/3 rounded bg-hueso-hondo" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
        <div className="aspect-[4/3] rounded-xl bg-hueso-hondo motion-safe:animate-pulse" />
        <div className="h-64 rounded-xl bg-hueso-hondo" />
      </div>
    </div>
  );
}

async function DetalleAuto({
  params,
}: PropiedadesPagina): Promise<React.JSX.Element> {
  const { id } = await params;
  const auto = await cargarAuto(id);
  if (!auto) {
    notFound();
  }

  // Si falla la sesión, la publicación se muestra igual, sin acciones de edición.
  const usuario = await obtenerUsuarioActual().catch(() => null);
  const esPropietario = usuario?.id === auto.userId;
  return (
    <VistaDetalleAuto
      auto={auto}
      esPropietario={esPropietario}
      puedeAdministrar={
        esPropietario || (usuario !== null && esAdmin(usuario.role))
      }
    />
  );
}

export default function PaginaDetalleAuto({
  params,
}: PropiedadesPagina): React.JSX.Element {
  return (
    <Suspense fallback={<EsqueletoDetalle />}>
      <DetalleAuto params={params} />
    </Suspense>
  );
}
