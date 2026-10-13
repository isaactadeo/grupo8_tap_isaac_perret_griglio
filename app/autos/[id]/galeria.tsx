"use client";

import Image from "next/image";
import { useState } from "react";

export default function GaleriaFotos({
  fotos,
  titulo,
}: {
  fotos: string[];
  titulo: string;
}): React.JSX.Element {
  const [indiceActivo, setIndiceActivo] = useState(0);

  if (fotos.length === 0) {
    return (
      <div className="foto-vacia relative grid aspect-[4/3] place-items-center overflow-hidden rounded-xl border border-linea">
        <p>Esta publicación no tiene fotos.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="foto-vacia relative aspect-[4/3] overflow-hidden rounded-xl border border-linea">
        <Image
          src={fotos[indiceActivo]}
          alt={`Foto ${indiceActivo + 1} de ${fotos.length}: ${titulo}`}
          fill
          unoptimized
          loading="eager"
          fetchPriority="high"
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover"
        />
      </div>
      {fotos.length > 1 ? (
        <ul className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6" aria-label="Fotos">
          {fotos.map((foto, indice) => (
            <li key={`${foto}-${indice}`}>
              <button
                type="button"
                onClick={() => setIndiceActivo(indice)}
                aria-pressed={indice === indiceActivo}
                aria-label={`Ver foto ${indice + 1} de ${fotos.length}`}
                className={`relative block aspect-square w-full overflow-hidden rounded-lg border-[3px] ${
                  indice === indiceActivo
                    ? "border-tinta"
                    : "border-transparent opacity-75 hover:opacity-100"
                }`}
              >
                <Image
                  src={foto}
                  alt=""
                  fill
                  unoptimized
                  loading="eager"
                  sizes="96px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
