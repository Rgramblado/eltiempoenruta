import { useEffect, useRef, useState } from 'react';
import { interpretWeatherCode, getAlertLevel, MAP_LAYERS, layerColorFor, layerLegend } from '../utils/weather';

const ALERT_COLORS = ['#4caf88', '#f5c842', '#f5843a', '#e03a3a'];

export default function RouteMap({ routeData }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const lastRouteRef = useRef(null);
  const [layer, setLayer] = useState('temp');

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return undefined;
    let cancelled = false;

    import('leaflet').then(L => {
      if (cancelled || mapInstanceRef.current || !mapRef.current) return;
      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: 'OpenStreetMap CARTO',
      }).addTo(map);

      L.control.attribution({ prefix: false }).addTo(map);
      mapInstanceRef.current = { map, L };
      lastRouteRef.current = routeData;
      renderRoute(map, L, routeData, layer, true);
    });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current?.map) {
        mapInstanceRef.current.map.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const { map, L } = mapInstanceRef.current;
    map.eachLayer(mapLayer => {
      if (mapLayer._url) return;
      map.removeLayer(mapLayer);
    });
    const routeChanged = lastRouteRef.current !== routeData;
    lastRouteRef.current = routeData;
    renderRoute(map, L, routeData, layer, routeChanged);
  }, [routeData, layer]);

  const legend = layerLegend(layer);

  return (
    <div className="map-outer">
      <div ref={mapRef} className="leaflet-map" />

      <div className="map-layer-picker">
        {MAP_LAYERS.map(item => (
          <button
            key={item.id}
            className={`layer-btn ${layer === item.id ? 'layer-btn-active' : ''}`}
            onClick={() => setLayer(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="map-legend">
        <div className="legend-title">{legend.title}</div>
        <div className="legend-scale">
          {legend.stops.map(([label, color]) => (
            <div key={label} className="legend-item">
              <span className="legend-swatch" style={{ background: color }} />
              <span className="legend-temp">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function segmentRiskForSample(routeData, sampleIndex) {
  const segments = routeData.rideScore?.segments;
  if (!segments?.length) return null;
  return segments[Math.min(sampleIndex, segments.length - 1)];
}

function renderRoute(map, L, routeData, layer, fitToRoute) {
  const { geometry, samples, waypoints } = routeData;
  if (!geometry?.length) return;

  L.polyline(geometry.map(p => [p.lat, p.lng]), {
    color: '#282d36',
    weight: 8,
    opacity: 1,
  }).addTo(map);

  if (samples && samples.length > 1) {
    for (let i = 0; i < samples.length - 1; i++) {
      const a = samples[i];
      const b = samples[i + 1];
      const segPoints = getSegmentGeometry(geometry, a, b);
      const color = layerColorFor(layer, a, segmentRiskForSample(routeData, i));

      L.polyline(segPoints.map(p => [p.lat, p.lng]), {
        color,
        weight: 5,
        opacity: 0.95,
      }).addTo(map);
    }
  }

  samples.forEach((sample, i) => {
    if (!sample.weather) return;
    const winfo = interpretWeatherCode(sample.weather.weatherCode);
    const alert = getAlertLevel(sample.weather);
    const alertColor = ALERT_COLORS[alert];
    const markerColor = layerColorFor(layer, sample, segmentRiskForSample(routeData, i));
    const eta = new Date(sample.etaMs).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const km = (sample.distanceFromStart / 1000).toFixed(0);

    const icon = L.divIcon({
      className: '',
      html: `<div class="map-marker" style="background:${markerColor};border-color:${alertColor}">
        <span class="marker-icon">${shortWeather(winfo.icon)}</span>
        <span class="marker-temp">${Math.round(sample.weather.apparentTemp ?? sample.weather.temp)}°</span>
      </div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const popup = `
      <div class="custom-popup">
        <div class="popup-header">
          <span class="popup-icon">${winfo.icon}</span>
          <span class="popup-label">${sample.weather.weatherLabel || winfo.label}</span>
        </div>
        <div class="popup-row"><span>ETA</span><strong>${eta}</strong></div>
        <div class="popup-row"><span>km</span><strong>${km} km</strong></div>
        <div class="popup-row"><span>Temp.</span><strong>${Math.round(sample.weather.temp)}° (sensación ${Math.round(sample.weather.apparentTemp)}°)</strong></div>
        <div class="popup-row"><span>Lluvia</span><strong>${sample.weather.precipProb}% prob. (${sample.weather.precip} mm)</strong></div>
        <div class="popup-row"><span>Viento</span><strong>${Math.round(sample.weather.windspeed)} km/h</strong></div>
      </div>
    `;

    L.marker([sample.lat, sample.lng], { icon })
      .bindPopup(popup, { className: 'dark-popup', maxWidth: 240 })
      .addTo(map);
  });

  waypoints.forEach((waypoint, i) => {
    const isFirst = i === 0;
    const isLast = i === waypoints.length - 1;
    const label = isFirst ? 'Salida' : isLast ? 'Llegada' : `Punto ${i + 1}`;
    const color = isFirst ? '#4caf88' : isLast ? '#e03a3a' : '#f5c842';

    const icon = L.divIcon({
      className: '',
      html: `<div class="waypoint-marker" style="background:${color}">${i + 1}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    L.marker([waypoint.lat, waypoint.lng], { icon })
      .bindPopup(`<div class="custom-popup"><strong>${label}</strong><br><small>${waypoint.label?.split(',').slice(0, 2).join(', ')}</small></div>`, { className: 'dark-popup' })
      .addTo(map);
  });

  if (fitToRoute) {
    map.fitBounds(L.latLngBounds(geometry.map(p => [p.lat, p.lng])), { padding: [36, 36] });
  }
}

function getSegmentGeometry(geometry, sampleA, sampleB) {
  let idxA = 0;
  let idxB = geometry.length - 1;
  let minDistA = Infinity;
  let minDistB = Infinity;

  geometry.forEach((p, i) => {
    const dA = dist(p, sampleA);
    const dB = dist(p, sampleB);
    if (dA < minDistA) {
      minDistA = dA;
      idxA = i;
    }
    if (dB < minDistB) {
      minDistB = dB;
      idxB = i;
    }
  });

  if (idxA > idxB) [idxA, idxB] = [idxB, idxA];
  return geometry.slice(idxA, idxB + 1);
}

function dist(a, b) {
  return Math.sqrt((a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2);
}

function shortWeather(label) {
  return String(label || 'WX').slice(0, 2).toUpperCase();
}
