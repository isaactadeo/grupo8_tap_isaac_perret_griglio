import type { ReactNode } from "react";
import Encabezado from "@/app/_componentes/encabezado";

export default function DisenoDetalleAuto({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <>
      <Encabezado seccion="autos" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-20 sm:px-8">
        {children}
      </main>
    </>
  );
}
