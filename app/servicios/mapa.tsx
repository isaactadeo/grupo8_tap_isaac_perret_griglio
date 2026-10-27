"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import type {
  GeoCoordinates,
  MarketplaceSearchDocument,
} from "@/src/types";
import type { RutaVehicular } from "./rutas";
import { crearEnlaceComoLlegar } from "./enlace-direcciones";

interface MapaServiciosProps {
  items: MarketplaceSearchDocument[];
  centroBusqueda: GeoCoordinates | null;
  radioKm: number;
  ubicacionFormulario: GeoCoordinates | null;
  modoSeleccion: "busqueda" | "publicacion" | null;
  onSeleccionarUbicacion: (ubicacion: GeoCoordinates) => void;
  ruta?: RutaVehicular | null;
  onSolicitarRuta?: (destino: GeoCoordinates, titulo: string) => void;
}

const centroRafaela: GeoCoordinates = { lat: -31.2503, lng: -61.4867 };

export default function MapaServicios({
  items,
  centroBusqueda,
  radioKm,
  ubicacionFormulario,
  modoSeleccion,
  onSeleccionarUbicacion,
  ruta = null,
  onSolicitarRuta,
}: MapaServiciosProps): React.JSX.Element {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const manejadorSeleccionRef = useRef(onSeleccionarUbicacion);
  const manejadorRutaRef = useRef(onSolicitarRuta);
  const [mapa, setMapa] = useState<LeafletMap | null>(null);
  const [errorMapa, setErrorMapa] = useState<string | null>(null);

  useEffect(() => {
    manejadorSeleccionRef.current = onSeleccionarUbicacion;
  }, [onSeleccionarUbicacion]);

  useEffect(() => {
    manejadorRutaRef.current = onSolicitarRuta;
  }, [onSolicitarRuta]);

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
      // Next oculta la página al navegar y vuelve a montar los efectos al
      // regresar: sin esto, los marcadores se dibujarían sobre el mapa destruido.
      setMapa(null);
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

          const ubicacion = servicio.location;
          const categoria = servicio.category ?? "taller";
          // Los locales verificados van más grandes y por encima del resto.
          const verificado = servicio.ownerVerified === true;
          const tamano = verificado ? 36 : 30;
          const marcador = L.marker(
            [servicio.location.lat, servicio.location.lon],
            {
              icon: L.divIcon({
                className: "",
                html: `<span class="marcador-servicio marcador-servicio--${categoria}${
                  verificado ? " marcador-servicio--verificado" : ""
                }"></span>`,
                iconSize: [tamano, tamano],
                iconAnchor: [tamano / 2, tamano + 5],
                popupAnchor: [0, -(tamano + 2)],
              }),
              title: servicio.title,
              zIndexOffset: verificado ? 1000 : 0,
            },
          );
          const popup = document.createElement("div");
          const nombre = document.createElement("strong");
          nombre.textContent = servicio.title;
          const tipo = document.createElement("div");
          tipo.textContent = categoria === "taller" ? "Taller" : "Lavadero";
          popup.append(nombre, tipo);
          if (manejadorRutaRef.current) {
            const botonRuta = document.createElement("button");
            botonRuta.type = "button";
            botonRuta.className = "boton boton-ruta";
            botonRuta.style.width = "100%";
            botonRuta.setAttribute(
              "aria-label",
              `Cómo llegar a ${servicio.title}`,
            );
            const iconoRuta = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "svg",
            );
            iconoRuta.setAttribute("viewBox", "0 0 24 24");
            iconoRuta.setAttribute("width", "20");
            iconoRuta.setAttribute("height", "20");
            iconoRuta.setAttribute("fill", "none");
            iconoRuta.setAttribute("stroke", "currentColor");
            iconoRuta.setAttribute("stroke-width", "1.8");
            iconoRuta.setAttribute("stroke-linecap", "round");
            iconoRuta.setAttribute("stroke-linejoin", "round");
            iconoRuta.setAttribute("aria-hidden", "true");
            const trazoRuta = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "path",
            );
            trazoRuta.setAttribute("d", "M6 4v5a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3v5");
            const inicioRuta = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "circle",
            );
            inicioRuta.setAttribute("cx", "6");
            inicioRuta.setAttribute("cy", "4");
            inicioRuta.setAttribute("r", "2");
            const finRuta = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "circle",
            );
            finRuta.setAttribute("cx", "18");
            finRuta.setAttribute("cy", "20");
            finRuta.setAttribute("r", "2");
            iconoRuta.append(trazoRuta, inicioRuta, finRuta);
            botonRuta.append(iconoRuta, document.createTextNode("Cómo llegar"));
            botonRuta.addEventListener("click", (evento) => {
              L.DomEvent.stopPropagation(evento);
              manejadorRutaRef.current?.(
                {
                  lat: ubicacion.lat,
                  lng: ubicacion.lon,
                },
                servicio.title,
              );
            });
            popup.append(botonRuta);
          }
          const enlaceComoLlegar = document.createElement("a");
          enlaceComoLlegar.href = crearEnlaceComoLlegar(
            servicio.location.lat,
            servicio.location.lon,
          );
          enlaceComoLlegar.target = "_blank";
          enlaceComoLlegar.rel = "noopener noreferrer";
          enlaceComoLlegar.className = "enlace mt-2 inline-flex text-sm";
          enlaceComoLlegar.textContent = "Abrir en Google Maps";
          popup.append(enlaceComoLlegar);
          const vendedor =
            servicio.ownerName ?? (verificado ? "Local verificado" : null);
          if (vendedor) {
            const lineaVendedor = document.createElement("div");
            lineaVendedor.className = "popup-vendedor";
            const nombreVendedor = document.createElement("span");
            nombreVendedor.textContent = vendedor;
            lineaVendedor.append(nombreVendedor);
            if (verificado) {
              const marca = document.createElement("span");
              marca.className = "marca-verificado";
              marca.textContent = "✓";
              marca.title = "Local verificado";
              marca.setAttribute("role", "img");
              marca.setAttribute("aria-label", "Local verificado");
              lineaVendedor.append(marca);
            }
            popup.append(lineaVendedor);
          }
          marcador.bindPopup(popup).addTo(capaMarcadores);
        }

        let circulo: import("leaflet").Circle | undefined;
        if (centroBusqueda) {
          circulo = L.circle([centroBusqueda.lat, centroBusqueda.lng], {
            radius: radioKm * 1000,
            color: "#111111",
            weight: 1.5,
            fillColor: "#111111",
            fillOpacity: 0.05,
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

        if (circulo) {
          // Encuadra el radio completo para que se vea hasta dónde busca.
          mapa.fitBounds(circulo.getBounds(), { padding: [16, 16] });
        } else if (ubicacionFormulario) {
          mapa.setView([ubicacionFormulario.lat, ubicacionFormulario.lng], 13);
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

  useEffect(() => {
    if (!mapa || !ruta) {
      return;
    }

    let cancelado = false;
    let capaRuta: import("leaflet").LayerGroup | undefined;

    void import("leaflet")
      .then((L) => {
        if (cancelado) {
          return;
        }

        capaRuta = L.layerGroup().addTo(mapa);
        const linea = L.polyline(
          ruta.geometria.coordinates.map(([lng, lat]) => [lat, lng]),
          { color: "#2563eb", weight: 5, opacity: 0.9 },
        ).addTo(capaRuta);
        L.circleMarker([ruta.geometria.coordinates[0][1], ruta.geometria.coordinates[0][0]], {
          radius: 6,
          color: "#ffffff",
          weight: 2,
          fillColor: "#2563eb",
          fillOpacity: 1,
        }).addTo(capaRuta);
        const ultimaCoordenada =
          ruta.geometria.coordinates[ruta.geometria.coordinates.length - 1];
        L.circleMarker([ultimaCoordenada[1], ultimaCoordenada[0]], {
          radius: 6,
          color: "#2563eb",
          weight: 2,
          fillColor: "#ffffff",
          fillOpacity: 1,
        })
          .bindTooltip(ruta.titulo, { direction: "top" })
          .addTo(capaRuta);
        mapa.fitBounds(linea.getBounds(), { padding: [24, 24] });
      })
      .catch((error: unknown) => {
        console.error("No se pudo dibujar la ruta en el mapa:", error);
        setErrorMapa("No se pudo mostrar la ruta en el mapa.");
      });

    return () => {
      cancelado = true;
      capaRuta?.remove();
    };
  }, [mapa, ruta]);

  return (
    <div
      className={`relative rounded-xl ${
        modoSeleccion ? "mapa-eligiendo ring-2 ring-tinta" : ""
      }`}
    >
      {/*
        Leaflet agrega sus propias clases a este div: su className no debe
        cambiar entre renders, o React las borra y el mapa se desarma.
      */}
      <div
        ref={contenedorRef}
        className="h-[26rem] w-full overflow-hidden rounded-xl border border-linea bg-hueso-hondo"
        aria-label="Mapa de servicios vehiculares en Rafaela"
      />
      {!mapa && !errorMapa ? (
        <p className="absolute inset-x-4 top-4 rounded-xl bg-papel/95 p-3 text-sm text-gris shadow">
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
          className="pointer-events-none absolute bottom-4 left-4 z-[1000] rounded-xl bg-tinta px-3.5 py-2 text-sm font-semibold text-papel shadow-lg"
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
