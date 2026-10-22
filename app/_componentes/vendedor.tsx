/** Tilde de local verificado; acompaña el tamaño del texto que lo rodea. */
export function MarcaVerificado(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
      role="img"
      aria-label="Local verificado"
      className="shrink-0"
    >
      <title>Local verificado</title>
      <circle cx="8" cy="8" r="8" className="fill-destacado" />
      <path
        d="M4.6 8.3l2.2 2.2 4.6-4.8"
        fill="none"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-papel"
      />
    </svg>
  );
}

/** Píldora sobre la foto de una publicación destacada. */
export function InsigniaVerificado({
  className = "",
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <span
      className={`insignia gap-1 bg-destacado-suave text-destacado ${className}`}
    >
      <svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true">
        <path
          d="M3.5 8.3l3 3 6-6.3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Local verificado
    </span>
  );
}

/**
 * Nombre público del vendedor con el tilde si es un local verificado. Sin
 * nombre público (el usuario no cargó uno), un local verificado se muestra
 * como "Local verificado" y uno sin verificar no se muestra.
 */
export function NombreVendedor({
  nombre,
  verificado,
  className = "",
}: {
  nombre?: string | null;
  verificado: boolean;
  className?: string;
}): React.JSX.Element | null {
  const texto = nombre || (verificado ? "Local verificado" : null);
  if (!texto) {
    return null;
  }
  return (
    <span className={`inline-flex min-w-0 items-center gap-1 ${className}`}>
      <span className="truncate">{texto}</span>
      {verificado ? <MarcaVerificado /> : null}
    </span>
  );
}
