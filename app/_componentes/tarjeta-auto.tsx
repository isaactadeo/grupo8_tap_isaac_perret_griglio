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
 * Nombre del auto para la tarjeta: el título del vendedor, con marca y
 * modelo adelante si el título no menciona el modelo.
 */
function nombreDelAuto(auto: DatosTarjetaAuto): string {
  const titulo = auto.title.trim();
  const marcaModelo = [auto.make, auto.model].filter(Boolean).join(" ").trim();
  if (!marcaModelo) {
    return titulo;
  }
  if (!titulo) {
    return marcaModelo;
  }
  const mencionaModelo =
    !auto.model || titulo.toLowerCase().includes(auto.model.toLowerCase());
  return mencionaModelo ? titulo : `${marcaModelo} ${titulo}`;
}

/**
 * Tarjeta de un auto: foto, debajo el nombre del auto, el precio más grande
 * y una línea con año y ciudad.
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
  const nombre = nombreDelAuto(auto) || "Título de tu publicación";
  const datos = [auto.year ? String(auto.year) : null, auto.ubicacion].filter(
    Boolean,
  );

  return (
    <article className="aparecer group relative flex flex-col gap-3 has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-tinta rounded-[10px]">
      <div className="foto-vacia tarjeta-foto relative aspect-[4/3] overflow-hidden rounded-[10px] border border-linea">
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
          <p className="absolute inset-x-4 bottom-4 text-sm text-gris">
            Sin fotos
          </p>
        )}
      </div>

      <div className="px-0.5">
        <Encabezado className="line-clamp-2 text-[0.9375rem] sm:min-h-[2.75em] leading-snug text-carbon">
          {auto.id ? (
            <Link
              href={`/autos/${auto.id}`}
              className="outline-none after:absolute after:inset-0 after:content-[''] group-hover:underline group-hover:underline-offset-2"
            >
              {nombre}
            </Link>
          ) : (
            nombre
          )}
        </Encabezado>
        <p className="precio mt-1.5 text-[1.5rem] leading-tight text-tinta">
          <span className="sr-only">Precio: </span>
          {auto.price === "" ? "$ …" : formatearPrecio(auto.price)}
        </p>
        {datos.length > 0 ? (
          <p className="mt-1.5 text-[0.8125rem] text-gris">
            {datos.join(" | ")}
          </p>
        ) : null}
      </div>
    </article>
  );
}
