import { useState, useCallback, useEffect } from 'react';
import RouteForm from './components/RouteForm';
import StopsStep from './components/StopsStep';
import RouteMap from './components/RouteMap';
import WeatherTimeline from './components/WeatherTimeline';
import RideScorePanel from './components/RideScorePanel';
import GearPanel from './components/GearPanel';
import DepartureOptionsPanel from './components/DepartureOptionsPanel';
import { parseGoogleMapsUrl, resolveWaypoints, getRoutesFromGoogle, sampleRoutePoints, isShortUrl, expandShortUrl } from './utils/routeParser';
import { fetchWeatherForPoints, tempToColor, getAlertLevel } from './utils/weather';
import { encodeShareUrl, decodeShareUrl, clearShareUrl } from './utils/shareUrl';
import { downloadGpx } from './utils/gpxExport';
import './App.css';

const ALERT_LABELS = ['OK', 'Precaución', 'Aviso', 'Peligro'];
const ALERT_COLORS = ['#4caf88', '#f5c842', '#f5843a', '#e03a3a'];

export default function App() {
  const [step, setStep] = useState('form');
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(null);
  const [routePlan, setRoutePlan] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [routeData, setRouteData] = useState(null);
  const [shareState, setShareState] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [mapsCopyFeedback, setMapsCopyFeedback] = useState(false);

  useEffect(() => {
    const shared = decodeShareUrl();
    if (shared) {
      const data = {
        url: shared.mapsUrl,
        departureTime: shared.departureTime,
        speedMultiplier: shared.speedMultiplier,
        routeOptions: shared.routeOptions,
      };
      setFormData(data);
      handleParseRoute(data, shared.stops);
    }
  }, []);

  const handleParseRoute = useCallback(async (data, sharedStops = null) => {
    setFormData(data);
    setStep('loading');
    setError('');

    try {
      setLoadingMsg('Analizando enlace de Google Maps');
      let routeUrl = data.url;
      if (isShortUrl(routeUrl)) {
        setLoadingMsg('Expandiendo enlace corto');
        routeUrl = await expandShortUrl(routeUrl);
      }

      const parsed = parseGoogleMapsUrl(routeUrl);
      if (parsed.length < 2) throw new Error('Se necesitan al menos origen y destino.');

      setLoadingMsg('Resolviendo puntos de la ruta');
      const waypoints = await resolveWaypoints(parsed);

      setLoadingMsg('Calculando perfiles de ruta con Google');
      const profiles = buildRouteProfiles(data.routeOptions);
      const profileResults = await Promise.all(
        profiles.map(profile => getRoutesFromGoogle(waypoints, profile.modifiers, true)
          .then(routes => routes.map((route, index) => normalizeRoute(route, profile, index)))
          .catch(error => [{ error: error.message, profile }]))
      );

      const routes = dedupeRoutes(profileResults.flat().filter(route => !route.error));
      if (!routes.length) throw new Error('Google no pudo calcular rutas válidas con esas opciones.');

      const plan = attachWaypointDistances({
        waypoints,
        routes,
        departureTime: data.departureTime,
        speedMultiplier: data.speedMultiplier || 1,
        routeOptions: data.routeOptions || {},
      });

      setRoutePlan(plan);
      setSelectedRouteId(routes[0].id);

      if (sharedStops) {
        await runCalculation(plan, sharedStops, data, routes[0].id);
      } else {
        setStep('stops');
      }
    } catch (e) {
      console.error(e);
      setError(e.message || 'Error desconocido.');
      setStep('error');
    }
  }, []);

  const handleApplyDepartureOffset = useCallback(async (offsetMinutes) => {
    if (!routePlan || !routeData) return;
    const newDeparture = toLocalInputString(new Date(routePlan.departureTime).getTime() + offsetMinutes * 60000);
    const updatedPlan = { ...routePlan, departureTime: newDeparture };
    setRoutePlan(updatedPlan);
    setFormData(prev => (prev ? { ...prev, departureTime: newDeparture } : prev));
    setStep('loading');
    setLoadingMsg('Recalculando con la nueva hora de salida');
    await runCalculation(updatedPlan, routeData.stops || [], { ...formData, departureTime: newDeparture }, routeData.selectedRoute.id);
  }, [routePlan, routeData, formData]);

  const handleCalculate = useCallback(async (stops, routeId = selectedRouteId) => {
    setStep('loading');
    setError('');
    setShareState({ ...formData, stops });
    await runCalculation(routePlan, stops, formData, routeId);
  }, [routePlan, formData, selectedRouteId]);

  async function runCalculation(plan, stops, data, routeId) {
    try {
      const selectedRoute = plan.routes.find(route => route.id === routeId) || plan.routes[0];
      const speedMultiplier = plan.speedMultiplier || 1;
      const departureMs = new Date(plan.departureTime).getTime();

      setLoadingMsg('Muestreando puntos de la ruta');
      const samples = sampleRoutePoints(selectedRoute.geometry, selectedRoute.distanceM, 15);
      const cumTimeS = buildCumulativeTime(selectedRoute.geometry, selectedRoute.legDistances, selectedRoute.legDurations);
      const cumDistM = buildCumulativeDist(selectedRoute.geometry);
      const stopsByDist = buildStopsByDistance(plan.waypoints, selectedRoute.legDistances, stops);

      let accumulatedStopMs = 0;
      const samplesWithETA = samples.map(sample => {
        stopsByDist.forEach(stop => {
          if (stop.distFromStart <= sample.distanceFromStart && !stop.counted) {
            accumulatedStopMs += stop.durationMs;
            stop.counted = true;
          }
        });
        const routeTravelS = interpolateTime(sample.distanceFromStart, cumDistM, cumTimeS);
        const travelMs = (routeTravelS / speedMultiplier) * 1000;
        const etaMs = departureMs + travelMs + accumulatedStopMs;
        return { ...sample, eta: new Date(etaMs).toISOString(), etaMs };
      });

      setLoadingMsg('Consultando previsión meteorológica');
      const { weather: weatherData, rideScore, gear } = await fetchWeatherForPoints(samplesWithETA);

      const enriched = samplesWithETA.map((sample, i) => ({
        ...sample,
        weather: weatherData[i],
        color: weatherData[i] ? tempToColor(weatherData[i].apparentTemp ?? weatherData[i].temp) : '#888',
        alertLevel: weatherData[i] ? getAlertLevel(weatherData[i]) : 0,
      }));

      const effectiveAvgKmh = Math.round((selectedRoute.distanceM / 1000) / ((selectedRoute.durationS / speedMultiplier) / 3600));
      const analyzedRoutes = plan.routes.map(route => ({
        ...route,
        score: scoreRoute(route, selectedRoute.id === route.id ? enriched : null),
      }));

      setShareState({ url: data.url, departureTime: plan.departureTime, speedMultiplier, routeOptions: plan.routeOptions, stops });
      setRouteData({
        waypoints: plan.waypoints,
        geometry: selectedRoute.geometry,
        samples: enriched,
        distanceKm: selectedRoute.distanceM / 1000,
        osrmDurationS: selectedRoute.durationS,
        stops,
        stopsByDist,
        speedMultiplier,
        effectiveAvgKmh,
        departureTime: plan.departureTime,
        selectedRoute,
        routeOptions: plan.routeOptions,
        routeAlternatives: analyzedRoutes,
        rideScore,
        gear,
      });
      setStep('result');
    } catch (e) {
      console.error(e);
      setError(e.message || 'Error desconocido al calcular la previsión.');
      setStep('error');
    }
  }

  const handleShare = useCallback(() => {
    if (!shareState) return;
    const url = encodeShareUrl(shareState.url, shareState.departureTime, shareState.speedMultiplier, shareState.stops || [], shareState.routeOptions || {});
    if (navigator.share) {
      navigator.share({ title: 'El Tiempo en Ruta', text: 'Mira el tiempo en esta ruta', url });
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2500);
      });
    }
  }, [shareState]);

  const handleCopyMapsUrl = useCallback(() => {
    if (!shareState?.url) return;
    navigator.clipboard.writeText(shareState.url).then(() => {
      setMapsCopyFeedback(true);
      setTimeout(() => setMapsCopyFeedback(false), 2500);
    });
  }, [shareState]);

  const handleReset = () => {
    clearShareUrl();
    setStep('form');
    setRoutePlan(null);
    setRouteData(null);
    setShareState(null);
    setError('');
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">ETR</span>
            <div className="logo-text">
              <span className="logo-main">El Tiempo en Ruta</span>
              <span className="logo-sub">Meteorología para rutas en moto</span>
            </div>
          </div>
          <div className="header-actions">
            {(step === 'result' || step === 'stops') && (
              <button className="btn-reset" onClick={handleReset}>Nueva ruta</button>
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
                <span className="error-icon">!</span>
                <span>{error}</span>
              </div>
            )}
          </>
        )}

        {step === 'stops' && routePlan && (
          <StopsStep
            route={routePlan}
            selectedRouteId={selectedRouteId}
            onSelectRoute={setSelectedRouteId}
            onBack={() => setStep('form')}
            onCalculate={handleCalculate}
          />
        )}

        {step === 'loading' && (
          <div className="loading-screen">
            <div className="loading-spinner" />
            <p className="loading-msg">{loadingMsg}</p>
            <p className="loading-sub">Cruzando ruta, tiempos, paradas y previsión horaria.</p>
          </div>
        )}

        {step === 'result' && routeData && (
          <div className="result-layout">
            <RouteDecision routeData={routeData} onSelectRoute={(routeId) => handleCalculate(routeData.stops || [], routeId)} />

            <RideScorePanel rideScore={routeData.rideScore} />

            <DepartureOptionsPanel samples={routeData.samples} onApplyOffset={handleApplyDepartureOffset} />

            <div className="result-summary">
              <SummaryStat value={`${routeData.distanceKm.toFixed(0)} km`} label="Distancia" />
              <SummaryStat value={formatDuration(routeData)} label="Duración total" />
              <SummaryStat value={`~${routeData.effectiveAvgKmh} km/h`} label="Vel. media" />
              <SummaryStat value={formatTime(routeData.departureTime)} label="Salida" />
              <SummaryStat value={getArrivalTime(routeData)} label="Llegada est." />
              <SummaryStat value={<AlertBadge samples={routeData.samples} />} label="Alerta máxima" />
            </div>

            <div className="map-container">
              <RouteMap routeData={routeData} />
            </div>

            <WeatherTimeline samples={routeData.samples} stopsByDist={routeData.stopsByDist} />

            <GearPanel gear={routeData.gear} />
          </div>
        )}
      </main>

      {step === 'result' && shareState && (
        <div className="fab-group">
          <button className="btn-share-fab btn-maps-fab" onClick={() => downloadGpx(routeData)} title="Descargar ruta en formato GPX">
            <span>GPX</span>
          </button>
          <button className="btn-share-fab btn-maps-fab" onClick={handleCopyMapsUrl} title="Copiar enlace de Google Maps">
            <span>{mapsCopyFeedback ? 'Copiado' : 'Maps'}</span>
          </button>
          <button className="btn-share-fab" onClick={handleShare}>
            <span>{copyFeedback ? 'Copiado' : 'Compartir'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function buildRouteProfiles(routeOptions = {}) {
  const requested = {
    avoidHighways: Boolean(routeOptions.avoidHighways),
    avoidTolls: Boolean(routeOptions.avoidTolls),
    avoidFerries: Boolean(routeOptions.avoidFerries),
  };

  return [
    { id: 'chosen', name: routeOptions.avoidHighways ? 'Motera' : 'Elegida', tone: 'Preferencias', modifiers: requested },
    { id: 'fast', name: 'Rápida', tone: 'Sin restricciones', modifiers: { avoidHighways: false, avoidTolls: false, avoidFerries: false } },
    { id: 'no-highways', name: 'Sin autovías', tone: 'Más carretera', modifiers: { ...requested, avoidHighways: true } },
    { id: 'no-tolls', name: 'Sin peajes', tone: 'Coste cero', modifiers: { ...requested, avoidTolls: true } },
  ];
}

function normalizeRoute(route, profile, index) {
  return {
    ...route,
    id: `${profile.id}-${index}`,
    profileId: profile.id,
    profileName: index === 0 ? profile.name : `${profile.name} alt. ${index + 1}`,
    profileTone: profile.tone,
    routeModifiers: profile.modifiers,
  };
}

function dedupeRoutes(routes) {
  const seen = new Set();
  return routes.filter(route => {
    const signature = `${Math.round(route.distanceM / 1000)}-${Math.round(route.durationS / 60)}-${route.geometry[0]?.lat.toFixed(3)}-${route.geometry.at(-1)?.lat.toFixed(3)}`;
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  }).slice(0, 6);
}

function attachWaypointDistances(plan) {
  const primary = plan.routes[0];
  let cumWp = 0;
  const waypointDists = [0];
  primary.legDistances.forEach(distance => {
    cumWp += distance;
    waypointDists.push(cumWp);
  });
  return {
    ...plan,
    distanceM: primary.distanceM,
    waypoints: plan.waypoints.map((waypoint, i) => ({ ...waypoint, distFromStart: waypointDists[i] || 0 })),
  };
}

function RouteDecision({ routeData, onSelectRoute }) {
  const bestWeather = routeData.samples.some(sample => sample.alertLevel >= 2) ? 'Revisa los tramos marcados antes de salir' : 'Ruta sin avisos fuertes en la previsión';
  return (
    <section className="route-decision">
      <div>
        <span className="decision-kicker">Ruta seleccionada</span>
        <h2>{routeData.selectedRoute.profileName}</h2>
        <p>{bestWeather}</p>
      </div>
      <div className="route-alternatives">
        {routeData.routeAlternatives.map(route => (
          <button
            key={route.id}
            className={`route-chip ${route.id === routeData.selectedRoute.id ? 'route-chip-active' : ''}`}
            onClick={() => route.id !== routeData.selectedRoute.id && onSelectRoute(route.id)}
          >
            <strong>{route.profileName}</strong>
            <span>{(route.distanceM / 1000).toFixed(0)} km · {formatSeconds(route.durationS)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function SummaryStat({ value, label }) {
  return (
    <div className="summary-stat">
      <span className="stat-val">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function buildCumulativeTime(geometry, legDistances, legDurations) {
  const cumDist = buildCumulativeDist(geometry);
  const totalDist = cumDist[cumDist.length - 1];
  let legCumDist = 0;
  const legBoundaries = [0];
  legDistances.forEach(distance => {
    legCumDist += distance;
    legBoundaries.push(legCumDist);
  });

  const cumTime = [0];
  let legIdx = 0;
  let timeAtLegStart = 0;
  for (let i = 1; i < geometry.length; i++) {
    const distance = cumDist[i];
    while (legIdx < legBoundaries.length - 2 && distance > legBoundaries[legIdx + 1] + 0.1) {
      timeAtLegStart += legDurations[legIdx];
      legIdx++;
    }
    const legStart = legBoundaries[legIdx];
    const legEnd = legBoundaries[legIdx + 1] || totalDist;
    const legLen = legEnd - legStart;
    const legDur = legDurations[legIdx] || 0;
    const fracInLeg = legLen > 0 ? Math.min(1, (distance - legStart) / legLen) : 0;
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
  let lo = 0;
  let hi = cumDistM.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cumDistM[mid] <= distM) lo = mid;
    else hi = mid;
  }
  const span = cumDistM[hi] - cumDistM[lo];
  if (span < 0.01) return cumTimeS[lo];
  return cumTimeS[lo] + ((distM - cumDistM[lo]) / span) * (cumTimeS[hi] - cumTimeS[lo]);
}

function buildStopsByDistance(waypoints, legDistances, stops) {
  if (!stops || !stops.length) return [];
  let cumDist = 0;
  const waypointDists = [0];
  legDistances.forEach(distance => {
    cumDist += distance;
    waypointDists.push(cumDist);
  });
  return stops.map((stop, i) => {
    const wpIndex = Math.min(stop.waypointIndex, waypointDists.length - 1);
    return { label: waypoints[wpIndex]?.label || `Parada ${i + 1}`, distFromStart: waypointDists[wpIndex] || 0, durationMs: stop.durationMin * 60 * 1000, counted: false };
  });
}

function formatDuration(routeData) {
  const travelS = routeData.osrmDurationS / (routeData.speedMultiplier || 1);
  const stopMin = (routeData.stops || []).reduce((sum, stop) => sum + stop.durationMin, 0);
  return formatSeconds(travelS + stopMin * 60);
}

function formatSeconds(seconds) {
  const totalMin = Math.max(0, seconds / 60);
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  return `${h}h ${m}min`;
}

function getArrivalTime(routeData) {
  const last = routeData.samples[routeData.samples.length - 1];
  if (!last) return '-';
  return new Date(last.etaMs).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function toLocalInputString(ms) {
  const date = new Date(ms);
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function AlertBadge({ samples }) {
  const max = Math.max(...samples.map(sample => sample.alertLevel));
  return <span className="alert-badge" style={{ color: ALERT_COLORS[max], fontWeight: 700, fontSize: '1.1rem' }}>{ALERT_LABELS[max]}</span>;
}

function scoreRoute(route, samples) {
  if (!samples) return null;
  const maxAlert = Math.max(...samples.map(sample => sample.alertLevel));
  return { maxAlert, label: ALERT_LABELS[maxAlert], distanceKm: route.distanceM / 1000, durationS: route.durationS };
}
