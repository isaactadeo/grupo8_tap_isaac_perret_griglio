import type { Metadata } from "next";
import { Geist, Newsreader } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import Link from "next/link";
import type { ReactNode } from "react";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  axes: ["opsz"],
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
    colorPrimary: "#111111",
    colorForeground: "#2f3437",
    fontFamily: "var(--font-geist)",
    borderRadius: "0.375rem",
  },
};

function Pie(): React.JSX.Element {
  return (
    <footer className="mt-auto border-t border-linea bg-hueso">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-gris sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>
          <span className="font-semibold text-tinta">
            Marketplace Rafaela.
          </span>{" "}
          Autos y servicios vehiculares en Rafaela, Santa Fe.
        </p>
        <nav aria-label="Pie de página" className="flex gap-5">
          <Link href="/autos" className="hover:text-tinta">
            Autos
          </Link>
          <Link href="/servicios" className="hover:text-tinta">
            Servicios
          </Link>
          <Link href="/autos/publicar" className="hover:text-tinta">
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
      className={`${geist.variable} ${newsreader.variable} h-full antialiased`}
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
