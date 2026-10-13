import type { Metadata } from "next";
import FormularioServicio from "../formulario-servicio";

export const metadata: Metadata = {
  title: "Publicar servicio",
};

export default function PaginaPublicarServicio(): React.JSX.Element {
  const clerkConfigurado = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-10 pb-20 sm:px-8">
      <h1 className="titular text-titulo">
        Publicá tu servicio
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-gris">
        Completá los datos de tu taller o lavadero y marcá dónde queda para que
        aparezca en el mapa.
      </p>

      {clerkConfigurado ? (
        <FormularioServicio
          subidaFotosHabilitada={Boolean(process.env.BLOB_READ_WRITE_TOKEN)}
        />
      ) : (
        <div
          role="alert"
          className="mt-8 max-w-2xl rounded-xl border border-[#f1e2b3] bg-destacado-suave p-5 text-destacado"
        >
          Para publicar hace falta iniciar sesión, y la autenticación todavía no
          está configurada. Configurá Clerk en <code>.env.local</code>.
        </div>
      )}
    </main>
  );
}
