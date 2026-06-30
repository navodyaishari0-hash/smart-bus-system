import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, MapPin } from 'lucide-react';

const STOP_COORDS = {
  Colombo: { lat: 6.9271, lng: 79.8612 }, Kadawatha: { lat: 6.9941, lng: 79.9583 },
  Nittambuwa: { lat: 7.1431, lng: 80.0981 }, Kegalle: { lat: 7.2513, lng: 80.3464 },
  Peradeniya: { lat: 7.2673, lng: 80.6000 }, Kandy: { lat: 7.2906, lng: 80.6337 },
  Kottawa: { lat: 6.8476, lng: 79.9630 }, Gelanigama: { lat: 6.7750, lng: 80.0000 },
  Galle: { lat: 6.0535, lng: 80.2210 }, Matara: { lat: 5.9549, lng: 80.5550 },
  Kurunegala: { lat: 7.4868, lng: 80.3645 }, Anuradhapura: { lat: 8.3114, lng: 80.4037 },
  Vavuniya: { lat: 8.7514, lng: 80.4970 }, Kilinochchi: { lat: 9.3814, lng: 80.4119 },
  Jaffna: { lat: 9.6615, lng: 80.0255 }, Gampola: { lat: 7.1649, lng: 80.5696 },
  Pussellawa: { lat: 7.1066, lng: 80.6360 }, Ramboda: { lat: 7.0565, lng: 80.6880 },
  'Nuwara Eliya': { lat: 6.9497, lng: 80.7891 }, Katugasthota: { lat: 7.3304, lng: 80.6329 },
  Wattegama: { lat: 7.3509, lng: 80.6537 }, Matale: { lat: 7.4712, lng: 80.6232 },
  Negombo: { lat: 7.2083, lng: 79.8358 }, Kochchikade: { lat: 7.2593, lng: 79.8528 },
  Wennappuwa: { lat: 7.3410, lng: 79.8465 }, Chilaw: { lat: 7.5758, lng: 79.7953 },
  Ratnapura: { lat: 6.7056, lng: 80.3847 }, Kuruwita: { lat: 6.8011, lng: 80.3679 },
  Avissawella: { lat: 6.9493, lng: 80.2174 }, Padaviya: { lat: 8.7883, lng: 80.6516 },
  Kanthale: { lat: 8.4044, lng: 81.0052 }, Trincomalee: { lat: 8.5874, lng: 81.2152 },
};

function createBusIcon(angle = 0) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:36px;height:36px;
      background:linear-gradient(135deg,#3b82f6,#8b5cf6);
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 4px 20px rgba(59,130,246,0.6),0 0 0 4px rgba(59,130,246,0.2);
      transform:rotate(${angle}deg);
      transition:transform 0.3s;
    ">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="3" width="22" height="18" rx="3"/><path d="M7 19v2M17 19v2M1 9h22M5 13h4M15 13h4"/>
      </svg>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

const stopIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:14px;height:14px;
    background:#f59e0b;
    border-radius:50%;
    border:3px solid rgba(245,158,11,0.4);
    box-shadow:0 0 12px rgba(245,158,11,0.3);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const startIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:20px;height:20px;
    background:#3b82f6;
    border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 0 16px rgba(59,130,246,0.5),0 0 0 4px rgba(59,130,246,0.15);
  ">
    <svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="none">
      <circle cx="12" cy="12" r="10"/>
    </svg>
  </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const destinationIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:24px;height:24px;
    background:#ef4444;
    border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 0 20px rgba(239,68,68,0.5),0 0 0 4px rgba(239,68,68,0.15);
    animation:pulse-dest 1.5s ease-in-out infinite;
  ">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="none">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

export default function LiveMap({
  busLocation,
  stops = [],
  destinationStop,
  startStop,
  endStop,
  height = '400px',
  className = '',
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const busMarkerRef = useRef(null);
  const polylineRef = useRef(null);
  const startMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const stopMarkersRef = useRef([]);
  const [center, setCenter] = useState(null);

  /* resolve start/end coordinates from city names */
  const startCoord = startStop ? STOP_COORDS[startStop] : null;
  const endCoord = endStop ? STOP_COORDS[endStop] : null;

  /* ── initialise map ── */
  useEffect(() => {
    if (mapInstance.current) return;
    const initLoc = busLocation || startCoord || endCoord || { lat: 6.9271, lng: 79.8612 };
    const map = L.map(mapRef.current, {
      center: [initLoc.lat, initLoc.lng],
      zoom: 10,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);
    mapInstance.current = map;
    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  /* ── fit bounds whenever start/end change ── */
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (startCoord && endCoord) {
      map.fitBounds(
        [
          [startCoord.lat, startCoord.lng],
          [endCoord.lat, endCoord.lng],
        ],
        { padding: [60, 60], maxZoom: 13, animate: true, duration: 0.5 }
      );
    } else if (startCoord) {
      map.setView([startCoord.lat, startCoord.lng], 11, { animate: true, duration: 0.5 });
    } else if (endCoord) {
      map.setView([endCoord.lat, endCoord.lng], 11, { animate: true, duration: 0.5 });
    }
  }, [startStop, endStop]);

  /* ── update bus marker ── */
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (busLocation) {
      const { lat, lng } = busLocation;
      if (!busMarkerRef.current) {
        busMarkerRef.current = L.marker([lat, lng], { icon: createBusIcon() }).addTo(map);
      } else {
        busMarkerRef.current.setLatLng([lat, lng]);
        busMarkerRef.current.setIcon(createBusIcon());
      }
      setCenter({ lat, lng });
    } else {
      if (busMarkerRef.current) {
        map.removeLayer(busMarkerRef.current);
        busMarkerRef.current = null;
      }
    }
  }, [busLocation]);

  /* ── draw start marker, destination marker, route polyline, and stop dots ── */
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    /* clear previous overlays */
    if (startMarkerRef.current) { map.removeLayer(startMarkerRef.current); startMarkerRef.current = null; }
    if (destMarkerRef.current) { map.removeLayer(destMarkerRef.current); destMarkerRef.current = null; }
    if (polylineRef.current) { map.removeLayer(polylineRef.current); polylineRef.current = null; }
    stopMarkersRef.current.forEach(m => map.removeLayer(m));
    stopMarkersRef.current = [];

    /* start marker */
    if (startCoord) {
      startMarkerRef.current = L.marker([startCoord.lat, startCoord.lng], { icon: startIcon })
        .addTo(map)
        .bindTooltip(startStop || 'Start', { direction: 'top', offset: L.point(0, -10), className: 'leaflet-tooltip-dark' });
    }

    /* destination marker (pulsing) */
    if (endCoord) {
      destMarkerRef.current = L.marker([endCoord.lat, endCoord.lng], { icon: destinationIcon })
        .addTo(map)
        .bindTooltip(endStop || 'Destination', { direction: 'top', offset: L.point(0, -12), className: 'leaflet-tooltip-dark' });
    }

    /* route polyline from start to end */
    if (startCoord && endCoord) {
      polylineRef.current = L.polyline(
        [[startCoord.lat, startCoord.lng], [endCoord.lat, endCoord.lng]],
        { color: '#3b82f6', weight: 3, opacity: 0.5, dashArray: '8 12' }
      ).addTo(map);
    }

    /* intermediate stop dots (skip start/end to avoid overlap) */
    stops.forEach((s) => {
      if (s.lat == null || s.lng == null) return;
      if (startStop && s.name === startStop) return;
      if (endStop && s.name === endStop) return;
      const marker = L.marker([s.lat, s.lng], { icon: stopIcon })
        .addTo(map)
        .bindTooltip(s.name, { direction: 'top', offset: L.point(0, -10), className: 'leaflet-tooltip-dark' });
      stopMarkersRef.current.push(marker);
    });
  }, [stops, startStop, endStop]);

  /* ── focus map on bus when center updates ── */
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !center) return;
    map.setView([center.lat, center.lng], map.getZoom(), { animate: true, duration: 0.5 });
  }, [center]);

  const handleRecenter = () => {
    const map = mapInstance.current;
    if (!map) return;
    if (busLocation) {
      map.setView([busLocation.lat, busLocation.lng], 13, { animate: true, duration: 0.5 });
    } else if (startCoord && endCoord) {
      map.fitBounds(
        [[startCoord.lat, startCoord.lng], [endCoord.lat, endCoord.lng]],
        { padding: [60, 60], maxZoom: 13, animate: true, duration: 0.5 }
      );
    }
  };

  return (
    <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', height }} className={className}>
      <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: '16px' }} />

      {/* control bar */}
      <div style={{
        position: 'absolute', top: '0.75rem', left: '0.75rem', zIndex: 1000,
        display: 'flex', gap: '0.5rem'
      }}>
        <button onClick={handleRecenter}
          style={{
            background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
            padding: '0.5rem', cursor: 'pointer', color: '#94a3b8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#e2e8f0'}
          onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
          title="Center on route"
        >
          <Navigation size={18} />
        </button>
      </div>

      {/* bottom info bar */}
      <div style={{
        position: 'absolute', bottom: '0.75rem', left: '0.75rem', right: '0.75rem', zIndex: 1000,
        background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px',
        padding: '0.5rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '0.72rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <MapPin size={12} style={{ color: busLocation ? '#3b82f6' : '#64748b' }} />
          <span style={{ color: busLocation ? '#94a3b8' : '#64748b' }}>
            {busLocation ? `${busLocation.lat.toFixed(4)}, ${busLocation.lng.toFixed(4)}` : 'Awaiting GPS signal'}
          </span>
        </div>
        {endStop && (
          <span style={{ color: '#64748b' }}>
            {startStop && `${startStop} → `}{endStop}
          </span>
        )}
      </div>

      <style>{`
        @keyframes pulse-dest {
          0%, 100% { box-shadow: 0 0 20px rgba(239,68,68,0.5), 0 0 0 4px rgba(239,68,68,0.15); }
          50% { box-shadow: 0 0 30px rgba(239,68,68,0.8), 0 0 0 8px rgba(239,68,68,0.1); }
        }
        .leaflet-tooltip-dark {
          background: rgba(15,23,42,0.9) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: #e2e8f0 !important;
          font-size: 0.7rem !important;
          border-radius: 8px !important;
          padding: 0.2rem 0.5rem !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
        }
        .leaflet-tooltip-dark::before {
          border-top-color: rgba(15,23,42,0.9) !important;
        }
      `}</style>
    </div>
  );
}
