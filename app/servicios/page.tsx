import PanelServicios from "./panel";

export default function PaginaServicios(): React.JSX.Element {
  return (
    <PanelServicios
      subidaFotosHabilitada={Boolean(process.env.BLOB_READ_WRITE_TOKEN)}
    />
  );
}
