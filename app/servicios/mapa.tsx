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
        setErrorMapa("No se pudo cargar el mapa. Intenta recargar la página.");
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

          const marcador = L.marker([
            servicio.location.lat,
            servicio.location.lon,
          ]);
          const popup = document.createElement("div");
          popup.textContent = `${servicio.title} · ${servicio.category === "taller" ? "Taller" : "Lavadero"}`;
          marcador.bindPopup(popup).addTo(capaMarcadores);
        }

        if (centroBusqueda) {
          L.circle([centroBusqueda.lat, centroBusqueda.lng], {
            radius: radioKm * 1000,
            color: "#0f766e",
            fillColor: "#14b8a6",
            fillOpacity: 0.12,
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
        className="h-[420px] w-full rounded-xl border border-zinc-200 bg-zinc-100"
        aria-label="Mapa de servicios vehiculares en Rafaela"
      />
      {!mapa && !errorMapa ? (
        <p className="absolute inset-x-4 top-4 rounded-lg bg-white/95 p-3 text-sm text-zinc-600 shadow">
          Cargando mapa…
        </p>
      ) : null}
      {errorMapa ? (
        <p
          role="alert"
          className="absolute inset-x-4 top-4 rounded-lg bg-white/95 p-3 text-sm text-red-700 shadow"
        >
          {errorMapa}
        </p>
      ) : null}
      {modoSeleccion ? (
        <p className="pointer-events-none absolute bottom-4 left-4 rounded-lg bg-white/95 px-3 py-2 text-sm font-medium text-teal-900 shadow">
          Haz clic en el mapa para{" "}
          {modoSeleccion === "busqueda"
            ? "elegir el centro de búsqueda"
            : "marcar el servicio"}
          .
        </p>
      ) : null}
    </div>
  );
}
