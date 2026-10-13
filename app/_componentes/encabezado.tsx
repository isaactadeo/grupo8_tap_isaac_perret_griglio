import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Suspense } from "react";

type Seccion = "autos" | "servicios" | "publicar" | "cuenta";

function Logo(): React.JSX.Element {
  // El óvalo del autódromo de Rafaela, con la línea de largada.
  return (
    <svg viewBox="0 0 34 22" width="34" height="22" aria-hidden="true">
      <ellipse
        cx="17"
        cy="11.5"
        rx="14.5"
        ry="8.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
      />
      <path d="M17 0.5v6" stroke="#ffe44d" strokeWidth="3" />
    </svg>
  );
}

function CuentaUsuario({
  activa,
}: {
  activa: boolean;
}): React.JSX.Element {
  const clasesIngresar =
    "rounded-lg px-3 py-2 text-sm font-semibold text-vidrio hover:bg-papel";

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <Link href="/sign-in" className={clasesIngresar}>
        Ingresar
      </Link>
    );
  }

  return (
    <>
      <Show when="signed-out">
        <SignInButton>
          <button type="button" className={clasesIngresar}>
            Ingresar
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <Link
          href="/mis-publicaciones"
          aria-current={activa ? "page" : undefined}
          className={`${clasesIngresar} ${activa ? "underline underline-offset-4" : ""}`}
        >
          Mis publicaciones
        </Link>
        <UserButton />
      </Show>
    </>
  );
}

function EnlaceSeccion({
  href,
  activo,
  children,
}: {
  href: string;
  activo: boolean;
  children: string;
}): React.JSX.Element {
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={`border-b-[3px] py-1 text-[0.9375rem] font-semibold ${
        activo
          ? "border-vidrio text-vidrio"
          : "border-transparent text-niebla hover:text-vidrio"
      }`}
    >
      {children}
    </Link>
  );
}

export default function Encabezado({
  seccion,
}: {
  seccion?: Seccion;
}): React.JSX.Element {
  return (
    <header className="border-b border-linea bg-hormigon">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-vidrio"
          aria-label="Marketplace Rafaela, inicio"
        >
          <Logo />
          <span className="condensada text-[1.375rem] font-extrabold leading-none">
            Marketplace Rafaela
          </span>
        </Link>

        <nav
          aria-label="Principal"
          className="order-last flex w-full gap-6 sm:order-none sm:w-auto"
        >
          <EnlaceSeccion href="/autos" activo={seccion === "autos"}>
            Autos
          </EnlaceSeccion>
          <EnlaceSeccion href="/servicios" activo={seccion === "servicios"}>
            Servicios
          </EnlaceSeccion>
          <span className="flex sm:hidden">
            <EnlaceSeccion
              href="/autos/publicar"
              activo={seccion === "publicar"}
            >
              Publicar auto
            </EnlaceSeccion>
          </span>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/autos/publicar"
            aria-current={seccion === "publicar" ? "page" : undefined}
            className="boton boton-principal hidden sm:inline-flex"
          >
            Publicar auto
          </Link>
          <Suspense fallback={<span className="inline-block h-9 w-20" />}>
            <CuentaUsuario activa={seccion === "cuenta"} />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
