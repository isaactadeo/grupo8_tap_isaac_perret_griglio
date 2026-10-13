"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import type {
  GeoCoordinates,
  MarketplaceSearchDocument,
} from "@/src/types";

interface MapaServiciosProps {
  items: MarketplaceSearchDocument[];
  centroBusqueda: GeoCoordinates | null;
  radioKm: number;
  ubicacionFormulario: GeoCoordinates | null;
  modoSeleccion: "busqueda" | "publicacion" | null;
  onSeleccionarUbicacion: (ubicacion: GeoCoordinates) => void;
}

const centroRafaela: GeoCoordinates = { lat: -31.2503, lng: -61.4867 };

export default function MapaServicios({
  items,
  centroBusqueda,
  radioKm,
  ubicacionFormulario,
  modoSeleccion,
  onSeleccionarUbicacion,
}: MapaServiciosProps): React.JSX.Element {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const manejadorSeleccionRef = useRef(onSeleccionarUbicacion);
  const [mapa, setMapa] = useState<LeafletMap | null>(null);
  const [errorMapa, setErrorMapa] = useState<string | null>(null);

  useEffect(() => {
    manejadorSeleccionRef.current = onSeleccionarUbicacion;
  }, [onSeleccionarUbicacion]);

  useEffect(() => {
    let cancelado = false;
    let mapaCreado: LeafletMap | undefined;

    void import("leaflet")
      .then((L) => {
        if (cancelado || !contenedorRef.current) {
          return;
        }

        mapaCreado = L.map(contenedorRef.current).setView(
          [centroRafaela.lat, centroRafaela.lng],
          13,
        );
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(mapaCreado);
        mapaCreado.on("click", (evento) => {
          manejadorSeleccionRef.current({
            lat: evento.latlng.lat,
            lng: evento.latlng.lng,
          });
        });
        setMapa(mapaCreado);
      })
      .catch((error: unknown) => {
        console.error("No se pudo cargar el mapa de servicios:", error);
        setErrorMapa("No se pudo cargar el mapa. Recargá la página para intentar de nuevo.");
      });

    return () => {
      cancelado = true;
      mapaCreado?.remove();
    };
  }, []);

  useEffect(() => {
    if (!mapa) {
      return;
    }

    let cancelado = false;
    let capaMarcadores: import("leaflet").LayerGroup | undefined;

    void import("leaflet")
      .then((L) => {
        if (cancelado) {
          return;
        }

        capaMarcadores = L.layerGroup().addTo(mapa);
        for (const servicio of items) {
          if (!servicio.location) {
            continue;
          }

          const categoria = servicio.category ?? "taller";
          const marcador = L.marker(
            [servicio.location.lat, servicio.location.lon],
            {
              icon: L.divIcon({
                className: "",
                html: `<span class="marcador-servicio marcador-servicio--${categoria}"></span>`,
                iconSize: [30, 30],
                iconAnchor: [15, 35],
                popupAnchor: [0, -32],
              }),
              title: servicio.title,
            },
          );
          const popup = document.createElement("div");
          const nombre = document.createElement("strong");
          nombre.textContent = servicio.title;
          const tipo = document.createElement("div");
          tipo.textContent = categoria === "taller" ? "Taller" : "Lavadero";
          popup.append(nombre, tipo);
          marcador.bindPopup(popup).addTo(capaMarcadores);
        }

        if (centroBusqueda) {
          L.circle([centroBusqueda.lat, centroBusqueda.lng], {
            radius: radioKm * 1000,
            color: "#0f3b37",
            weight: 2,
            fillColor: "#ffe44d",
            fillOpacity: 0.18,
          }).addTo(capaMarcadores);
        }

        if (ubicacionFormulario) {
          L.marker([ubicacionFormulario.lat, ubicacionFormulario.lng], {
            icon: L.divIcon({
              className: "marcador-publicacion",
              html: '<span class="marcador-publicacion-punto"></span>',
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            }),
          })
            .bindPopup("Ubicación de tu servicio")
            .addTo(capaMarcadores);
        }

        const ubicacionVista = centroBusqueda ?? ubicacionFormulario;
        if (ubicacionVista) {
          mapa.setView([ubicacionVista.lat, ubicacionVista.lng], 13);
        }
      })
      .catch((error: unknown) => {
        console.error("No se pudieron actualizar los marcadores:", error);
        setErrorMapa("No se pudieron mostrar las ubicaciones en el mapa.");
      });

    return () => {
      cancelado = true;
      capaMarcadores?.remove();
    };
  }, [centroBusqueda, items, mapa, radioKm, ubicacionFormulario]);

  return (
    <div className="relative">
      <div
        ref={contenedorRef}
        className={`h-[26rem] w-full overflow-hidden rounded-2xl border border-linea bg-hormigon-hondo ${
          modoSeleccion ? "cursor-crosshair ring-3 ring-tiza" : ""
        }`}
        aria-label="Mapa de servicios vehiculares en Rafaela"
      />
      {!mapa && !errorMapa ? (
        <p className="absolute inset-x-4 top-4 rounded-xl bg-papel/95 p-3 text-sm text-niebla shadow">
          Cargando mapa…
        </p>
      ) : null}
      {errorMapa ? (
        <p
          role="alert"
          className="absolute inset-x-4 top-4 rounded-xl bg-papel/95 p-3 text-sm font-medium text-alerta shadow"
        >
          {errorMapa}
        </p>
      ) : null}
      {modoSeleccion ? (
        <p
          role="status"
          className="pointer-events-none absolute bottom-4 left-4 z-[1000] rounded-xl bg-vidrio px-3.5 py-2 text-sm font-semibold text-papel shadow-lg"
        >
          Tocá el mapa para{" "}
          {modoSeleccion === "busqueda"
            ? "elegir el centro de la búsqueda"
            : "marcar tu servicio"}
          .
        </p>
      ) : null}
    </div>
  );
}
