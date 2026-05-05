import maplibregl, { type LngLatLike, type Map as MapLibreMap, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import type { PinCodeSummary } from "../../lib/api";

interface PinCodeMapProps {
  data: PinCodeSummary[];
  selectedPinCode: string;
  onSelect: (summary: PinCodeSummary) => void;
}

// ── Karnataka geometry ────────────────────────────────────────────────────────
// Simplified boundary polygon (clockwise = GeoJSON inner/hole ring)
const KARNATAKA_RING: [number, number][] = [
  [74.05, 14.85], [74.18, 14.68], [74.52, 14.35], [74.73, 13.85],
  [74.88, 13.38], [75.22, 13.12], [75.55, 12.65], [75.62, 12.28],
  [75.80, 12.10], [75.95, 11.92], [76.22, 11.78], [76.45, 11.62],
  [76.80, 11.68], [77.15, 11.92], [77.48, 12.22], [77.73, 12.68],
  [77.92, 13.12], [78.20, 13.52], [78.55, 14.10], [78.10, 15.45],
  [77.83, 15.88], [77.70, 16.20], [77.90, 16.58], [77.83, 17.00],
  [77.88, 17.42], [77.75, 17.85], [77.40, 18.12], [76.92, 18.38],
  [76.47, 18.22], [75.93, 17.98], [75.38, 17.92], [75.05, 17.77],
  [74.70, 17.42], [74.48, 17.15], [74.38, 16.68], [74.55, 16.28],
  [74.25, 15.93], [74.02, 15.58], [73.97, 15.18], [74.05, 14.85],
];

// World outer ring (counter-clockwise = GeoJSON exterior)
const WORLD_RING: [number, number][] = [
  [-180, 90], [-180, -90], [180, -90], [180, 90], [-180, 90],
];

// Pan is locked to Karnataka bounding box
const KARNATAKA_BOUNDS: [[number, number], [number, number]] = [
  [72.5, 10.5],
  [80.0, 19.5],
];

// Initial view: full Karnataka
const KARNATAKA_CENTER: LngLatLike = [76.3, 15.1];
const INITIAL_ZOOM = 6.8;

// ── Helpers ───────────────────────────────────────────────────────────────────
function markerTone(s: PinCodeSummary) {
  if (s.high_risk_count > 0) return "risk";
  if (s.pending_review_count > 0) return "review";
  if (s.closed_count > 0) return "closed";
  return "active";
}

function markerSize(s: PinCodeSummary) {
  const total = s.active_count + s.dormant_count + s.closed_count + s.pending_review_count;
  return Math.max(40, Math.min(68, 36 + total * 3));
}

function popupHtml(s: PinCodeSummary): string {
  const riskTag = s.high_risk_count > 0
    ? `<span class="pop-risk">⚠ ${s.high_risk_count} High Risk</span>` : "";
  const gaps = s.department_coverage_gaps.slice(0, 2)
    .map(g => `<span class="pop-gap">${g}</span>`).join("");
  return `
    <div class="map-popup">
      <div class="map-popup-head">
        <span class="map-popup-pin">${s.pin_code}</span>
        <span class="map-popup-label">${s.label}</span>
      </div>
      <div class="map-popup-stats">
        <span class="pop-active">✓ ${s.active_count} Active</span>
        <span class="pop-dormant">◌ ${s.dormant_count} Dormant</span>
        ${riskTag}
      </div>
      ${gaps ? `<div class="map-popup-gaps">Gaps: ${gaps}</div>` : ""}
    </div>`;
}

// ── Component ─────────────────────────────────────────────────────────────────
function PinCodeMap({ data, selectedPinCode, onSelect }: PinCodeMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRefs = useRef<Marker[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  // Prevent auto-fly on the very first render
  const didUserSelect = useRef(false);
  const prevSelected = useRef(selectedPinCode);

  // ── Map initialisation ──────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      center: KARNATAKA_CENTER,
      zoom: INITIAL_ZOOM,
      minZoom: 5,
      maxZoom: 16,
      maxBounds: KARNATAKA_BOUNDS,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
            maxzoom: 19,
          },
        },
        layers: [{ id: "osm-tiles", type: "raster", source: "osm" }],
      },
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

    // Karnataka dim-mask + border — added once tiles are ready
    map.on("load", () => {
      map.addSource("ka-mask", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [WORLD_RING, KARNATAKA_RING] },
          properties: {},
        },
      });
      map.addLayer({
        id: "ka-outside-dim",
        type: "fill",
        source: "ka-mask",
        paint: { "fill-color": "#0b1525", "fill-opacity": 0.5 },
      });

      map.addSource("ka-border", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "LineString", coordinates: KARNATAKA_RING },
          properties: {},
        },
      });
      map.addLayer({
        id: "ka-border-line",
        type: "line",
        source: "ka-border",
        paint: { "line-color": "#3b82f6", "line-width": 2, "line-opacity": 0.8 },
      });
    });

    return () => {
      popupRef.current?.remove();
      markerRefs.current.forEach(m => m.remove());
      markerRefs.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Markers — rebuilt when data or selection changes ────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markerRefs.current.forEach(m => m.remove());
    markerRefs.current = [];

    data.forEach(summary => {
      const size = markerSize(summary);
      const tone = markerTone(summary);
      const isSelected = summary.pin_code === selectedPinCode;
      const count = summary.high_risk_count > 0 ? summary.high_risk_count : summary.active_count;

      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("aria-label", `PIN ${summary.pin_code} – ${summary.label}`);
      el.className = `pincode-marker marker-${tone}${isSelected ? " selected" : ""}`;
      el.style.cssText = `width:${size}px;height:${size}px;`;
      el.innerHTML = `
        <span class="mk-pin">${summary.pin_code}</span>
        <strong class="mk-count">${count}</strong>
        ${isSelected ? '<span class="mk-pulse"></span>' : ""}
      `;

      el.addEventListener("mouseenter", () => {
        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({
          closeButton: false,
          offset: size / 2 + 6,
          className: "setu-popup",
        })
          .setLngLat([summary.longitude, summary.latitude])
          .setHTML(popupHtml(summary))
          .addTo(map);
      });
      el.addEventListener("mouseleave", () => {
        popupRef.current?.remove();
        popupRef.current = null;
      });
      el.addEventListener("click", () => {
        didUserSelect.current = true;
        onSelect(summary);
      });

      markerRefs.current.push(
        new maplibregl.Marker({ element: el })
          .setLngLat([summary.longitude, summary.latitude])
          .addTo(map),
      );
    });
  }, [data, selectedPinCode, onSelect]);

  // ── Fly to selected — only on explicit user selection, not on mount ─────
  useEffect(() => {
    // Skip if this is just the initial render with the default selection
    if (!didUserSelect.current && prevSelected.current === selectedPinCode) return;
    prevSelected.current = selectedPinCode;

    const selected = data.find(d => d.pin_code === selectedPinCode);
    if (!selected || !mapRef.current) return;

    mapRef.current.flyTo({
      center: [selected.longitude, selected.latitude],
      zoom: 12,
      speed: 1.1,
      curve: 1.3,
      essential: true,
    });
  }, [data, selectedPinCode]);

  return <div className="pincode-map-canvas" ref={containerRef} />;
}

export default PinCodeMap;
