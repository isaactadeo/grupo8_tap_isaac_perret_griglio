import type { Metadata } from "next";
import type { ReactNode } from "react";
import Encabezado from "@/app/_componentes/encabezado";

export const metadata: Metadata = {
  title: "Talleres y lavaderos",
  description:
    "Talleres mecánicos y lavaderos de autos en el mapa de Rafaela.",
};

export default function DisenoServicios({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <>
      <Encabezado seccion="servicios" />
      {children}
    </>
  );
}
