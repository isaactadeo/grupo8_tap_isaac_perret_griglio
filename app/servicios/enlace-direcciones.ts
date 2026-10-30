export function crearEnlaceComoLlegar(
  latitud: number,
  longitud: number,
): string {
  const parametros = new URLSearchParams({
    api: "1",
    destination: `${latitud},${longitud}`,
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${parametros.toString()}`;
}
