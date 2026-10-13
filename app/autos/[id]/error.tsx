"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorDetalleAuto({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}): React.JSX.Element {
  useEffect(() => {
    console.error("No se pudo cargar el auto:", error);
  }, [error]);

  return (
    <div role="alert" className="max-w-xl py-10">
      <h1 className="condensada text-titulo font-extrabold text-vidrio">
        No pudimos cargar esta publicación
      </h1>
      <p className="mt-3 text-lg text-niebla">
        El servidor no respondió. Volvé a intentar en unos segundos.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="boton boton-principal"
        >
          Reintentar
        </button>
        <Link href="/autos" className="boton boton-secundario">
          Ver autos en venta
        </Link>
      </div>
    </div>
  );
}
