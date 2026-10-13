import Image from "next/image";
import Link from "next/link";
import { formatearPrecio } from "@/lib/marketplace/formato";

export interface DatosTarjetaAuto {
  id?: string;
  title: string;
  make?: string;
  model?: string;
  year?: number;
  price: number | string;
  foto?: string;
  ubicacion?: string;
}

/**
 * Tarjeta de un auto: la foto lleva arriba la franja polarizada con el precio
 * escrito a tiza, como en el parabrisas de una agencia.
 */
export default function TarjetaAuto({
  auto,
  encabezado: Encabezado = "h3",
  destacada = false,
}: {
  auto: DatosTarjetaAuto;
  encabezado?: "h2" | "h3";
  /** Primera fila visible: la foto se carga sin esperar al scroll. */
  destacada?: boolean;
}): React.JSX.Element {
  const marcaModelo = [auto.make, auto.model].filter(Boolean).join(" ");

  return (
    <article className="group relative flex flex-col gap-2.5 has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-vidrio rounded-[1.125rem]">
      <div className="vidrio relative aspect-[4/3] overflow-hidden rounded-[1.125rem]">
        {auto.foto ? (
          <Image
            src={auto.foto}
            alt=""
            fill
            unoptimized
            loading={destacada ? "eager" : undefined}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <p className="absolute inset-x-4 bottom-4 text-sm text-white/65">
            Sin fotos
          </p>
        )}
        <div className="franja">
          <p className="tiza text-[1.625rem]">
            <span className="sr-only">Precio: </span>
            {auto.price === "" ? "$ …" : formatearPrecio(auto.price)}
          </p>
        </div>
      </div>

      <div className="px-0.5">
        <Encabezado className="text-[1.0625rem] leading-snug font-semibold text-vidrio-hondo">
          {auto.id ? (
            <Link
              href={`/autos/${auto.id}`}
              className="outline-none after:absolute after:inset-0 after:content-[''] group-hover:underline group-hover:underline-offset-2"
            >
              {auto.title}
            </Link>
          ) : (
            auto.title || "Título de tu publicación"
          )}
        </Encabezado>
        {auto.year || marcaModelo ? (
          <p className="mt-1 flex flex-wrap gap-x-2.5 text-[0.9375rem] text-niebla">
            {auto.year ? (
              <span className="font-bold text-vidrio-hondo">{auto.year}</span>
            ) : null}
            {marcaModelo ? <span>{marcaModelo}</span> : null}
          </p>
        ) : null}
        {auto.ubicacion ? (
          <p className="mt-0.5 text-sm text-niebla">{auto.ubicacion}</p>
        ) : null}
      </div>
    </article>
  );
}
