import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import Link from "next/link";
import type { ReactNode } from "react";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
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
    colorPrimary: "#d7261e",
    colorForeground: "#1e293b",
    fontFamily: "var(--font-geist)",
    borderRadius: "0.5rem",
  },
};

function Pie(): React.JSX.Element {
  return (
    <footer className="mt-auto bg-tinta">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>
          <span className="font-semibold text-papel">
            Marketplace Rafaela.
          </span>{" "}
          Autos y servicios vehiculares en Rafaela, Santa Fe.
        </p>
        <nav aria-label="Pie de página" className="flex gap-5">
          <Link href="/autos" className="hover:text-papel">
            Autos
          </Link>
          <Link href="/servicios" className="hover:text-papel">
            Servicios
          </Link>
          <Link href="/autos/publicar" className="hover:text-papel">
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
      className={`${geist.variable} h-full antialiased`}
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
