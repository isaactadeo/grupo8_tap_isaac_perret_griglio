import { Suspense } from "react";
import { esAdmin, obtenerUsuarioActual } from "@/lib/auth/usuario";
import PanelServicios from "./panel";

async function PanelConPermisos(): Promise<React.JSX.Element> {
  // Si falla la sesión, el listado se muestra igual, sin acciones de admin.
  const usuario = await obtenerUsuarioActual().catch(() => null);
  return (
    <PanelServicios
      puedeAdministrar={usuario !== null && esAdmin(usuario.role)}
    />
  );
}

export default function PaginaServicios(): React.JSX.Element {
  return (
    <Suspense fallback={<PanelServicios />}>
      <PanelConPermisos />
    </Suspense>
  );
}
