import type { Metadata } from "next";
import { Suspense } from "react";
import Encabezado from "@/app/_componentes/encabezado";
import BuscadorAutos from "./buscador";

export const metadata: Metadata = {
  title: "Autos en venta",
  description:
    "Buscá autos en venta en Rafaela por marca, modelo, año y presupuesto.",
};

export default function PaginaAutos(): React.JSX.Element {
  return (
    <>
      <Encabezado seccion="autos" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-10 pb-20 sm:px-8">
        <h1 className="condensada text-titulo font-extrabold text-vidrio">
          Autos en venta
        </h1>
        <Suspense
          fallback={
            <p className="mt-8 text-lg font-semibold">Buscando autos…</p>
          }
        >
          <BuscadorAutos />
        </Suspense>
      </main>
    </>
  );
}
