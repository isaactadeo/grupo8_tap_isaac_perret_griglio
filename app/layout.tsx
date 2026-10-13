import type { Metadata } from "next";
import { Archivo, Mansalva } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import Link from "next/link";
import type { ReactNode } from "react";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const mansalva = Mansalva({
  variable: "--font-mansalva",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    default: "Marketplace Rafaela",
    template: "%s | Marketplace Rafaela",
  },
  description: "Compra y venta de autos y servicios vehiculares en Rafaela.",
};

const aparienciaClerk = {
  variables: {
    colorPrimary: "#0f3b37",
    colorForeground: "#0a2926",
    fontFamily: "var(--font-archivo)",
    borderRadius: "0.625rem",
  },
};

function Pie(): React.JSX.Element {
  return (
    <footer className="mt-auto border-t border-linea bg-hormigon-hondo">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-niebla sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>
          <span className="condensada font-extrabold text-vidrio">
            Marketplace Rafaela.
          </span>{" "}
          Autos y servicios vehiculares en Rafaela, Santa Fe.
        </p>
        <nav aria-label="Pie de página" className="flex gap-5">
          <Link href="/autos" className="hover:text-vidrio">
            Autos
          </Link>
          <Link href="/servicios" className="hover:text-vidrio">
            Servicios
          </Link>
          <Link href="/autos/publicar" className="hover:text-vidrio">
            Publicar auto
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export default function DisenoRaiz({
  children,
}: {
  children: ReactNode;
}) {
  const contenido = (
    <>
      {children}
      <Pie />
    </>
  );

  return (
    <html
      lang="es"
      className={`${archivo.variable} ${mansalva.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
          <ClerkProvider
            appearance={aparienciaClerk}
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
          >
            {contenido}
          </ClerkProvider>
        ) : (
          contenido
        )}
      </body>
    </html>
  );
}
