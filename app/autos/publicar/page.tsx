import type { Metadata } from "next";
import Encabezado from "@/app/_componentes/encabezado";
import FormularioPublicarAuto from "./formulario";

export const metadata: Metadata = {
  title: "Publicar auto",
};

export default function PaginaPublicarAuto(): React.JSX.Element {
  const clerkConfigurado = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );

  return (
    <>
      <Encabezado seccion="publicar" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-10 pb-20 sm:px-8">
        <h1 className="titular text-titulo">
          Publicá tu auto
        </h1>
        <p className="mt-3 mb-8 max-w-2xl text-lg text-gris">
          Completá los datos del vehículo. La publicación queda asociada a tu
          cuenta.
        </p>

        {clerkConfigurado ? (
          <FormularioPublicarAuto
            subidaFotosHabilitada={Boolean(process.env.BLOB_READ_WRITE_TOKEN)}
            ejemplosHabilitados={
              process.env.NODE_ENV === "development" ||
              process.env.HABILITAR_EJEMPLOS_DEMO === "true"
            }
          />
        ) : (
          <div
            role="alert"
            className="max-w-2xl rounded-xl border border-[#f1e2b3] bg-destacado-suave p-5 text-destacado"
          >
            Para publicar hace falta iniciar sesión, y la autenticación todavía
            no está configurada. Configurá Clerk en <code>.env.local</code>.
          </div>
        )}
      </main>
    </>
  );
}
