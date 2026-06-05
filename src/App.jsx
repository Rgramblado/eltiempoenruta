import { useState, useCallback, useEffect } from 'react';
import RouteForm from './components/RouteForm';
import StopsStep from './components/StopsStep';
import RouteMap from './components/RouteMap';
import WeatherTimeline from './components/WeatherTimeline';
import { parseGoogleMapsUrl, resolveWaypoints, getRouteFromOSRM, sampleRoutePoints, isShortUrl, expandShortUrl } from './utils/routeParser';
import { fetchWeatherForPoints, tempToColor, getAlertLevel } from './utils/weather';
import { encodeShareUrl, decodeShareUrl, clearShareUrl } from './utils/shareUrl';
import './App.css';

const ALERT_LABELS = ['OK', 'Precaución', 'Aviso', 'Peligro'];
const ALERT_COLORS = ['#4caf88', '#f5c842', '#f5843a', '#e03a3a'];

export default function App() {
  const [step, setStep] = useState('form');
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');
  const [routeData, setRouteData] = useState(null);
  const [formData, setFormData] = useState(null);
  const [parsedRoute, setParsedRoute] = useState(null);
  const [shareState, setShareState] = useState(null); // raw params for share button
  const [copyFeedback, setCopyFeedback] = useState(false);

  // On mount: check if there's a shared route in the URL and auto-calculate
  useEffect(() => {
    const shared = decodeShareUrl();
    if (shared) {
      const data = { url: shared.mapsUrl, departureTime: shared.departureTime, speedMultiplier: shared.speedMultiplier };
      setFormData(data);
      handleParseAndCalculate(data, shared.stops);
    }
  }, []);

  // Combined parse + calculate (used for shared URLs, skips the stops step)
  const handleParseAndCalculate = useCallback(async (data, stops = []) => {
    setStep('loading');
    setError('');

    try {
      setLoadingMsg('Analizando URL de Google Maps…');
      let routeUrl = data.url;
      if (isShortUrl(routeUrl)) {
        setLoadingMsg('Expandiendo enlace corto…');
        routeUrl = await expandShortUrl(routeUrl);
      }
      const parsed = parseGoogleMapsUrl(routeUrl);
      if (parsed.length < 2) throw new Error('Se necesitan al menos origen y destino.');

      setLoadingMsg('Geocodificando puntos de la ruta…');
      const waypoints = await resolveWaypoints(parsed);

      setLoadingMsg('Calculando ruta con OSRM…');
      const { geometry, distanceM, durationS, legDistances, legDurations } = await getRouteFromOSRM(waypoints);

      let cumWp = 0;
      const waypointDists = [0];
      legDistances.forEach(d => { cumWp += d; waypointDists.push(cumWp); });
      const waypointsWithDist = waypoints.map((w, i) => ({ ...w, distFromStart: waypointDists[i] || 0 }));

      const pr = { waypoints: waypointsWithDist, geometry, distanceM, durationS, legDistances, legDurations, departureTime: data.departureTime, speedMultiplier: data.speedMultiplier || 1.0 };
      setParsedRoute(pr);

      await runCalculation(pr, stops, data);

    } catch (e) {
      console.error(e);
      setError(e.message || 'Error desconocido.');
      setStep('error');
    }
  }, []);

  // STEP 1: parse route, go to stops screen
  const handleParseRoute = useCallback(async (data) => {
    setFormData(data);
    setStep('loading');
    setError('');

    try {
      setLoadingMsg('Analizando URL de Google Maps…');
      let routeUrl = data.url;
      if (isShortUrl(routeUrl)) {
        setLoadingMsg('Expandiendo enlace corto…');
        routeUrl = await expandShortUrl(routeUrl);
      }
      const parsed = parseGoogleMapsUrl(routeUrl);
      if (parsed.length < 2) throw new Error('Se necesitan al menos origen y destino.');

      setLoadingMsg('Geocodificando puntos de la ruta…');
      const waypoints = await resolveWaypoints(parsed);

      setLoadingMsg('Calculando ruta con OSRM…');
      const { geometry, distanceM, durationS, legDistances, legDurations } = await getRouteFromOSRM(waypoints);

      let cumWp = 0;
      const waypointDists = [0];
      legDistances.forEach(d => { cumWp += d; waypointDists.push(cumWp); });
      const waypointsWithDist = waypoints.map((w, i) => ({ ...w, distFromStart: waypointDists[i] || 0 }));

      setParsedRoute({ waypoints: waypointsWithDist, geometry, distanceM, durationS, legDistances, legDurations, departureTime: data.departureTime, speedMultiplier: data.speedMultiplier || 1.0 });
      setStep('stops');

    } catch (e) {
      console.error(e);
      setError(e.message || 'Error desconocido.');
      setStep('error');
    }
  }, []);

  // STEP 2: calculate weather with chosen stops
  const handleCalculate = useCallback(async (stops) => {
    setStep('loading');
    setError('');
    // Save stops into shareState alongside the form data
    setShareState({ ...formData, stops });
    await runCalculation(parsedRoute, stops, formData);
  }, [parsedRoute, formData]);

  // Core calculation (reused by both paths)
  async function runCalculation(pr, stops, data) {
    try {
      const { waypoints, geometry, distanceM, durationS, legDistances, legDurations, departureTime, speedMultiplier } = pr;
      const multiplier = speedMultiplier || 1.0;
      const departureMs = new Date(departureTime).getTime();

      setLoadingMsg('Muestreando puntos de la ruta…');
      const samples = sampleRoutePoints(geometry, distanceM, 15);
      const cumTimeS = buildCumulativeTime(geometry, legDistances, legDurations);
      const cumDistM = buildCumulativeDist(geometry);
      const stopsByDist = buildStopsByDistance(waypoints, legDistances, stops);

      let accumulatedStopMs = 0;
      const samplesWithETA = samples.map(s => {
        stopsByDist.forEach(stop => {
          if (stop.distFromStart <= s.distanceFromStart && !stop.counted) {
            accumulatedStopMs += stop.durationMs;
            stop.counted = true;
          }
        });
        const osrmTravelS = interpolateTime(s.distanceFromStart, cumDistM, cumTimeS);
        const travelMs = (osrmTravelS / multiplier) * 1000;
        const etaMs = departureMs + travelMs + accumulatedStopMs;
        return { ...s, eta: new Date(etaMs).toISOString(), etaMs };
      });

      setLoadingMsg('Consultando previsión meteorológica…');
      const weatherData = await fetchWeatherForPoints(samplesWithETA);

      const enriched = samplesWithETA.map((s, i) => ({
        ...s,
        weather: weatherData[i],
        color: weatherData[i] ? tempToColor(weatherData[i].apparentTemp ?? weatherData[i].temp) : '#888',
        alertLevel: weatherData[i] ? getAlertLevel(weatherData[i]) : 0,
      }));

      const effectiveAvgKmh = Math.round((distanceM / 1000) / ((durationS / multiplier) / 3600));

      setShareState({ url: data.url, departureTime, speedMultiplier: multiplier, stops });
      setRouteData({ waypoints, geometry, samples: enriched, distanceKm: distanceM / 1000, osrmDurationS: durationS, stops, stopsByDist, speedMultiplier: multiplier, effectiveAvgKmh, departureTime });
      setStep('result');

    } catch (e) {
      console.error(e);
      setError(e.message || 'Error desconocido al calcular la previsión.');
      setStep('error');
    }
  }

  const handleShare = useCallback(() => {
    if (!shareState) return;
    const url = encodeShareUrl(shareState.url, shareState.departureTime, shareState.speedMultiplier, shareState.stops || []);
    if (navigator.share) {
      navigator.share({ title: 'El Tiempo en Ruta', text: '🏍️ Mira el tiempo en esta ruta', url });
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2500);
      });
    }
  }, [shareState]);

  const handleReset = () => {
    clearShareUrl();
    setStep('form');
    setParsedRoute(null);
    setRouteData(null);
    setShareState(null);
    setError('');
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">🏍️</span>
            <div className="logo-text">
              <span className="logo-main">El Tiempo en Ruta</span>
              <span className="logo-sub">Previsión espacio-temporal para motoristas</span>
            </div>
          </div>
          <div className="header-actions">
            {(step === 'result' || step === 'stops') && (
              <button className="btn-reset" onClick={handleReset}>← Nueva ruta</button>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        {(step === 'form' || step === 'error') && (
          <>
            <RouteForm onSubmit={handleParseRoute} initialData={formData} />
            {step === 'error' && (
              <div className="error-box">
                <span className="error-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}
          </>
        )}

        {step === 'stops' && parsedRoute && (
          <StopsStep route={parsedRoute} onBack={() => setStep('form')} onCalculate={handleCalculate} />
        )}

        {step === 'loading' && (
          <div className="loading-screen">
            <div className="loading-spinner" />
            <p className="loading-msg">{loadingMsg}</p>
            <p className="loading-sub">Consultando rutas, geocodificación y meteorología…</p>
          </div>
        )}

        {step === 'result' && routeData && (
          <div className="result-layout">
            <div className="result-summary">
              <div className="summary-stat">
                <span className="stat-val">{routeData.distanceKm.toFixed(0)} km</span>
                <span className="stat-label">Distancia</span>
              </div>
              <div className="summary-stat">
                <span className="stat-val">{formatDuration(routeData)}</span>
                <span className="stat-label">Duración total</span>
              </div>
              <div className="summary-stat">
                <span className="stat-val">~{routeData.effectiveAvgKmh} km/h</span>
                <span className="stat-label">Vel. media est.</span>
              </div>
              <div className="summary-stat">
                <span className="stat-val">{formatTime(routeData.departureTime)}</span>
                <span className="stat-label">Salida</span>
              </div>
              <div className="summary-stat">
                <span className="stat-val">{getArrivalTime(routeData)}</span>
                <span className="stat-label">Llegada est.</span>
              </div>
              <div className="summary-stat">
                <AlertBadge samples={routeData.samples} />
                <span className="stat-label">Alerta máxima</span>
              </div>
            </div>

            <div className="map-container">
              <RouteMap routeData={routeData} />
            </div>

            <WeatherTimeline samples={routeData.samples} stopsByDist={routeData.stopsByDist} />
          </div>
        )}
      </main>

      {step === 'result' && shareState && (
        <button className="btn-share-fab" onClick={handleShare}>
          {copyFeedback ? '✅' : '🔗'}
          <span>{copyFeedback ? 'Copiado' : 'Compartir'}</span>
        </button>
      )}
    </div>
  );
}

function buildCumulativeTime(geometry, legDistances, legDurations) {
  const cumDist = buildCumulativeDist(geometry);
  const totalDist = cumDist[cumDist.length - 1];
  let legCumDist = 0;
  const legBoundaries = [0];
  legDistances.forEach(d => { legCumDist += d; legBoundaries.push(legCumDist); });

  const cumTime = [0];
  let legIdx = 0;
  let timeAtLegStart = 0;
  for (let i = 1; i < geometry.length; i++) {
    const d = cumDist[i];
    while (legIdx < legBoundaries.length - 2 && d > legBoundaries[legIdx + 1] + 0.1) {
      timeAtLegStart += legDurations[legIdx];
      legIdx++;
    }
    const legStart = legBoundaries[legIdx];
    const legEnd = legBoundaries[legIdx + 1] || totalDist;
    const legLen = legEnd - legStart;
    const legDur = legDurations[legIdx] || 0;
    const fracInLeg = legLen > 0 ? Math.min(1, (d - legStart) / legLen) : 0;
    cumTime.push(timeAtLegStart + fracInLeg * legDur);
  }
  return cumTime;
}

function buildCumulativeDist(geometry) {
  const cum = [0];
  for (let i = 1; i < geometry.length; i++) cum.push(cum[i - 1] + haversineM(geometry[i - 1], geometry[i]));
  return cum;
}

function haversineM(a, b) {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const sa = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa));
}

function interpolateTime(distM, cumDistM, cumTimeS) {
  let lo = 0, hi = cumDistM.length - 1;
  while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (cumDistM[mid] <= distM) lo = mid; else hi = mid; }
  const span = cumDistM[hi] - cumDistM[lo];
  if (span < 0.01) return cumTimeS[lo];
  return cumTimeS[lo] + ((distM - cumDistM[lo]) / span) * (cumTimeS[hi] - cumTimeS[lo]);
}

function buildStopsByDistance(waypoints, legDistances, stops) {
  if (!stops || !stops.length) return [];
  let cumDist = 0;
  const waypointDists = [0];
  legDistances.forEach(d => { cumDist += d; waypointDists.push(cumDist); });
  return stops.map((stop, i) => {
    const wpIndex = Math.min(stop.waypointIndex, waypointDists.length - 1);
    return { label: waypoints[wpIndex]?.label || `Parada ${i + 1}`, distFromStart: waypointDists[wpIndex] || 0, durationMs: stop.durationMin * 60 * 1000, counted: false };
  });
}

function formatDuration(routeData) {
  const travelS = routeData.osrmDurationS / (routeData.speedMultiplier || 1);
  const stopMin = (routeData.stops || []).reduce((a, s) => a + s.durationMin, 0);
  const totalMin = travelS / 60 + stopMin;
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  return `${h}h ${m}min`;
}

function getArrivalTime(routeData) {
  const last = routeData.samples[routeData.samples.length - 1];
  if (!last) return '—';
  return new Date(last.etaMs).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function AlertBadge({ samples }) {
  const max = Math.max(...samples.map(s => s.alertLevel));
  return <span className="alert-badge" style={{ color: ALERT_COLORS[max], fontWeight: 700, fontSize: '1.1rem' }}>{ALERT_LABELS[max]}</span>;
}
