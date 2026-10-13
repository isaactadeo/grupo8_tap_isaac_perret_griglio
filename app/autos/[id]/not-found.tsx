import Link from "next/link";

export default function AutoNoEncontrado(): React.JSX.Element {
  return (
    <div className="max-w-xl py-10">
      <h1 className="titular text-titulo">
        No encontramos ese auto
      </h1>
      <p className="mt-3 text-lg text-gris">
        El enlace puede estar mal escrito o la publicación ya fue eliminada.
      </p>
      <Link href="/autos" className="boton boton-principal mt-7">
        Ver autos en venta
      </Link>
    </div>
  );
}
