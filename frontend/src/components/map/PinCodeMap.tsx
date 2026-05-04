import maplibregl, { type LngLatLike, type Map as MapLibreMap, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import type { PinCodeSummary } from "../../lib/api";

interface PinCodeMapProps {
  data: PinCodeSummary[];
  selectedPinCode: string;
  onSelect: (summary: PinCodeSummary) => void;
}

const karnatakaCenter: LngLatLike = [77.62, 12.96];

function markerTone(summary: PinCodeSummary) {
  if (summary.high_risk_count > 0) return "risk";
  if (summary.pending_review_count > 0) return "review";
  if (summary.closed_count > 0) return "closed";
  return "active";
}

function markerSize(summary: PinCodeSummary) {
  const total = summary.active_count + summary.dormant_count + summary.closed_count + summary.pending_review_count;
  return Math.max(34, Math.min(58, 32 + total * 7));
}

function PinCodeMap({ data, selectedPinCode, onSelect }: PinCodeMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRefs = useRef<Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      center: karnatakaCenter,
      zoom: 10,
      minZoom: 8,
      maxZoom: 13,
      attributionControl: false,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "setu-background",
            type: "background",
            paint: {
              "background-color": "#EEF3F8",
            },
          },
        ],
      },
    });

    mapRef.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];

    data.forEach((summary) => {
      const size = markerSize(summary);
      const element = document.createElement("button");
      element.type = "button";
      element.className = `pincode-marker marker-${markerTone(summary)} ${summary.pin_code === selectedPinCode ? "selected" : ""}`;
      element.style.width = `${size}px`;
      element.style.height = `${size}px`;
      element.innerHTML = `<span>${summary.pin_code}</span><strong>${summary.high_risk_count}</strong>`;
      element.addEventListener("click", () => onSelect(summary));

      const marker = new maplibregl.Marker({ element })
        .setLngLat([summary.longitude, summary.latitude])
        .addTo(map);
      markerRefs.current.push(marker);
    });
  }, [data, onSelect, selectedPinCode]);

  useEffect(() => {
    const selected = data.find((item) => item.pin_code === selectedPinCode);
    if (selected) {
      mapRef.current?.flyTo({
        center: [selected.longitude, selected.latitude],
        zoom: 10.8,
        speed: 0.85,
      });
    }
  }, [data, selectedPinCode]);

  return <div className="pincode-map-canvas" ref={containerRef} />;
}

export default PinCodeMap;
