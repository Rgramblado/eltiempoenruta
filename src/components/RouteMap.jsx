import { useEffect, useRef } from 'react';
import { interpretWeatherCode, tempToColor, getAlertLevel } from '../utils/weather';

const ALERT_COLORS = ['#4caf88', '#f5c842', '#f5843a', '#e03a3a'];

export default function RouteMap({ routeData }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Dynamically import Leaflet to avoid SSR issues
    import('leaflet').then(L => {
      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap © CARTO'
      }).addTo(map);

      L.control.attribution({ prefix: false }).addTo(map);

      mapInstanceRef.current = { map, L };

      renderRoute(map, L, routeData);
    });

    return () => {
      if (mapInstanceRef.current?.map) {
        mapInstanceRef.current.map.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const { map, L } = mapInstanceRef.current;
    // Clear existing layers except tile layer
    map.eachLayer(layer => {
      if (layer._url) return; // keep tile layer
      map.removeLayer(layer);
    });
    renderRoute(map, L, routeData);
  }, [routeData]);

  return (
    <div className="map-outer">
      <div ref={mapRef} className="leaflet-map" />
      <div className="map-legend">
        <div className="legend-title">Temperatura aparente</div>
        <div className="legend-scale">
          {[[-10,'#a8d4f5'],[0,'#7bbde0'],[5,'#6ab0d4'],[10,'#5bb5a0'],[15,'#6abf7a'],[20,'#f5c842'],[25,'#f5a623'],[30,'#e05c2a'],[35,'#c0392b']].map(([t, c]) => (
            <div key={t} className="legend-item">
              <span className="legend-swatch" style={{ background: c }} />
              <span className="legend-temp">{t}°</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function renderRoute(map, L, routeData) {
  const { geometry, samples, waypoints } = routeData;
  if (!geometry?.length) return;

  // Draw the full route as background (dark line)
  L.polyline(geometry.map(p => [p.lat, p.lng]), {
    color: '#333',
    weight: 6,
    opacity: 1,
  }).addTo(map);

  // Draw colored segments between sample points
  if (samples && samples.length > 1) {
    for (let i = 0; i < samples.length - 1; i++) {
      const a = samples[i];
      const b = samples[i + 1];
      const color = a.color || '#888';
      
      // Find geometry points between these two samples
      const segPoints = getSegmentGeometry(geometry, a, b);

      L.polyline(segPoints.map(p => [p.lat, p.lng]), {
        color,
        weight: 5,
        opacity: 0.9,
      }).addTo(map);
    }
  }

  // Weather marker at each sample point
  samples.forEach((s, i) => {
    if (!s.weather) return;
    const winfo = interpretWeatherCode(s.weather.weatherCode);
    const alert = getAlertLevel(s.weather);
    const alertColor = ALERT_COLORS[alert];
    
    const eta = new Date(s.etaMs).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const km = (s.distanceFromStart / 1000).toFixed(0);

    const icon = L.divIcon({
      className: '',
      html: `<div class="map-marker" style="background:${s.color};border-color:${alertColor}">
        <span class="marker-icon">${winfo.icon}</span>
        <span class="marker-temp">${Math.round(s.weather.apparentTemp ?? s.weather.temp)}°</span>
      </div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const popup = `
      <div class="custom-popup">
        <div class="popup-header">
          <span class="popup-icon">${winfo.icon}</span>
          <span class="popup-label">${winfo.label}</span>
        </div>
        <div class="popup-row"><span>⏰ ETA</span><strong>${eta}</strong></div>
        <div class="popup-row"><span>📍 km</span><strong>${km} km</strong></div>
        <div class="popup-row"><span>🌡️ Temp.</span><strong>${Math.round(s.weather.temp)}° (sensación ${Math.round(s.weather.apparentTemp)}°)</strong></div>
        <div class="popup-row"><span>🌧️ Lluvia</span><strong>${s.weather.precipProb}% prob. (${s.weather.precip} mm)</strong></div>
        <div class="popup-row"><span>💨 Viento</span><strong>${Math.round(s.weather.windspeed)} km/h</strong></div>
      </div>
    `;

    L.marker([s.lat, s.lng], { icon })
      .bindPopup(popup, { className: 'dark-popup', maxWidth: 220 })
      .addTo(map);
  });

  // Waypoint markers (origin, stops, destination)
  waypoints.forEach((w, i) => {
    const isFirst = i === 0;
    const isLast = i === waypoints.length - 1;
    const label = isFirst ? '🏁 Salida' : isLast ? '🎯 Llegada' : `📍 Punto ${i + 1}`;
    const color = isFirst ? '#4caf88' : isLast ? '#e03a3a' : '#f5c842';
    
    const icon = L.divIcon({
      className: '',
      html: `<div class="waypoint-marker" style="background:${color}">${i + 1}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    L.marker([w.lat, w.lng], { icon })
      .bindPopup(`<div class="custom-popup"><strong>${label}</strong><br><small>${w.label?.split(',').slice(0, 2).join(',')}</small></div>`, { className: 'dark-popup' })
      .addTo(map);
  });

  // Fit bounds
  const allPoints = [...waypoints.map(w => [w.lat, w.lng])];
  if (allPoints.length > 0) {
    map.fitBounds(L.latLngBounds(allPoints), { padding: [40, 40] });
  }
}

function getSegmentGeometry(geometry, sampleA, sampleB) {
  // Simple approach: return points between the two samples by proximity
  // Find closest geometry point to each sample
  let idxA = 0, idxB = geometry.length - 1;
  let minDistA = Infinity, minDistB = Infinity;

  geometry.forEach((p, i) => {
    const dA = dist(p, sampleA);
    const dB = dist(p, sampleB);
    if (dA < minDistA) { minDistA = dA; idxA = i; }
    if (dB < minDistB) { minDistB = dB; idxB = i; }
  });

  if (idxA > idxB) [idxA, idxB] = [idxB, idxA];
  return geometry.slice(idxA, idxB + 1);
}

function dist(a, b) {
  return Math.sqrt((a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2);
}
