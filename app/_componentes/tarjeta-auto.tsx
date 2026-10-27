import Image from "next/image";
import Link from "next/link";
import { formatearPrecio } from "@/lib/marketplace/formato";
import { InsigniaVerificado, NombreVendedor } from "./vendedor";

export interface DatosTarjetaAuto {
  id?: string;
  title: string;
  make?: string;
  model?: string;
  year?: number;
  price: number | string;
  foto?: string;
  ubicacion?: string;
  /** Publicada por un local verificado: la tarjeta va destacada. */
  verificado?: boolean;
  vendedor?: string | null;
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
 * Tarjeta de un auto: foto, debajo el nombre del auto, el precio más grande,
 * una línea con año y ciudad y otra con el vendedor. Las de locales
 * verificados van destacadas, con el tilde junto al nombre del vendedor.
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
  const verificado = auto.verificado === true;

  return (
    <article
      className={`aparecer group relative flex h-full flex-col overflow-hidden rounded-xl bg-papel transition-shadow duration-200 hover:shadow-[0_10px_30px_rgb(15_23_42/0.1)] has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-tinta ${
        verificado ? "border-2 border-destacado" : "border border-linea"
      }`}
    >
      <div className="foto-vacia tarjeta-foto relative aspect-[4/3] overflow-hidden">
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
        {verificado ? (
          <InsigniaVerificado className="absolute top-2 left-2 z-10 shadow-sm" />
        ) : null}
      </div>

      <div className="px-4 pt-3 pb-4">
        <Encabezado className="line-clamp-2 text-[0.9375rem] font-medium sm:min-h-[2.75em] leading-snug text-carbon">
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
        <NombreVendedor
          nombre={auto.vendedor}
          verificado={verificado}
          className={`mt-1 max-w-full text-[0.8125rem] ${
            verificado ? "font-semibold text-carbon" : "text-gris"
          }`}
        />
      </div>
    </article>
  );
}
