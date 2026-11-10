import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LocationHeatmap.css';
import { PIPELINE_STAGES } from '../../data/pipelineStages';

const PH_CENTER = [12.3, 122.5];
// OpenStreetMap's free tiles: no API key, attribution required (light use only, per
// https://operations.osmfoundation.org/policies/tiles/). Dark mode recolours them with CSS.
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const stageLabel = Object.fromEntries(PIPELINE_STAGES.map((stage) => [stage.id, stage.label]));

// leaflet.heat is a plain script that expects a global `L`.
let heatReady = null;
const loadHeat = () => {
  if (!heatReady) {
    window.L = L;
    heatReady = import('leaflet.heat');
  }
  return heatReady;
};

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function popupHtml(group) {
  const stages = Object.entries(group.stages).sort((a, b) => b[1] - a[1])
    .map(([id, count]) => `<li><span>${escapeHtml(stageLabel[id] || id)}</span><b>${count}</b></li>`).join('');
  const jobs = Object.entries(group.jobs).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([title, count]) => `<li><span>${escapeHtml(title)}</span><b>${count}</b></li>`).join('');
  return `<div class="rm-popup">
    <p class="rm-popup-title">${escapeHtml(group.name)}</p>
    <p class="rm-popup-sub">${escapeHtml(group.detail)}</p>
    <p class="rm-popup-count"><b>${group.count}</b> applicant${group.count === 1 ? '' : 's'} · ${Math.round(group.share * 100)}%</p>
    <p class="rm-popup-head">By stage</p><ul>${stages}</ul>
    <p class="rm-popup-head">Top jobs</p><ul>${jobs}</ul>
  </div>`;
}

/**
 * Interactive heatmap of applicant locations. `groups` come from useLocationGroups.
 * The parent can call ref.current.focus(key) to fly to a location and open it.
 */
export const LocationHeatmap = forwardRef(function LocationHeatmap({ groups, isDarkMode, showHeat = true, showMarkers = true }, ref) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef({ heat: null, markers: null, byKey: new Map() });
  const [ready, setReady] = useState(false);

  useImperativeHandle(ref, () => ({
    focus(key) {
      const marker = layersRef.current.byKey.get(key);
      if (!marker || !mapRef.current) return;
      const map = mapRef.current;
      map.closePopup();
      map.once('moveend', () => marker.openPopup()); // open after the fly-to so it is not cut off
      map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 10), { duration: 0.8 });
    },
  }));

  // Create the map once.
  useEffect(() => {
    const map = L.map(containerRef.current, { center: PH_CENTER, zoom: 5, minZoom: 4, maxZoom: 16, scrollWheelZoom: false, worldCopyJump: true });
    mapRef.current = map;
    // Tiles belong to this map instance (React's dev mode mounts components twice).
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    // Scroll-zoom only after the map is clicked, so the page still scrolls normally.
    map.on('click', () => map.scrollWheelZoom.enable());
    map.on('mouseout', () => map.scrollWheelZoom.disable());
    let cancelled = false;
    loadHeat().then(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; map.remove(); mapRef.current = null; };
  }, []);

  // Heat layer + count bubbles.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const layers = layersRef.current;
    layers.heat?.remove();
    layers.markers?.remove();
    layers.byKey = new Map();
    if (!groups.length) {
      map.setView(PH_CENTER, 5);
      return;
    }
    const max = Math.max(...groups.map((group) => group.count));
    if (showHeat) {
      layers.heat = L.heatLayer(groups.map((group) => [group.lat, group.lng, 0.35 + 0.65 * (group.count / max)]), {
        radius: 34, blur: 26, maxZoom: 9, minOpacity: 0.35,
        gradient: { 0.2: '#3b82f6', 0.45: '#22c55e', 0.65: '#facc15', 0.85: '#f97316', 1: '#dc2626' },
      }).addTo(map);
    }
    layers.markers = L.layerGroup();
    for (const group of groups) {
      const size = Math.round(26 + 22 * Math.sqrt(group.count / max));
      const marker = L.marker([group.lat, group.lng], {
        icon: L.divIcon({
          className: 'rm-count-icon',
          html: `<span style="width:${size}px;height:${size}px">${group.count}</span>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        }),
        title: `${group.name}: ${group.count}`,
        opacity: showMarkers ? 1 : 0,
        interactive: showMarkers,
      }).bindPopup(popupHtml(group), { maxWidth: 260 });
      layers.markers.addLayer(marker);
      layers.byKey.set(group.key, marker);
    }
    layers.markers.addTo(map);
    const bounds = L.latLngBounds(groups.map((group) => [group.lat, group.lng]));
    map.fitBounds(bounds.pad(0.25), { maxZoom: groups.length === 1 ? 10 : 9, animate: false });
  }, [groups, ready, showHeat, showMarkers]);

  return (
    <div className="relative">
      <div ref={containerRef} className={`rm-map ${isDarkMode ? 'rm-map-dark' : ''} h-[420px] w-full overflow-hidden rounded-xl sm:h-[480px]`} role="region" aria-label="Map of applicant locations" />
      {showHeat && groups.length > 0 && (
        <div className={`pointer-events-none absolute bottom-3 left-3 z-[400] rounded-lg px-3 py-2 text-[11px] shadow ${isDarkMode ? 'bg-[#121b27]/90 text-slate-300' : 'bg-white/90 text-slate-600'}`}>
          <p className="mb-1 font-semibold">Applicant density</p>
          <div className="h-2 w-36 rounded-full" style={{ background: 'linear-gradient(90deg,#3b82f6,#22c55e,#facc15,#f97316,#dc2626)' }} />
          <div className="mt-0.5 flex justify-between"><span>Fewer</span><span>More</span></div>
        </div>
      )}
    </div>
  );
});
