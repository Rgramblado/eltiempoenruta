import { useState } from 'react';

export default function StopsStep({ route, selectedRouteId, onSelectRoute, onBack, onCalculate }) {
  const selectedRoute = route.routes.find(item => item.id === selectedRouteId) || route.routes[0];
  const { waypoints } = route;
  const stoppableWaypoints = waypoints.slice(0, -1);
  const [stopDurations, setStopDurations] = useState({});

  const setDuration = (idx, minutes) => {
    setStopDurations(prev => {
      const next = { ...prev };
      if (minutes <= 0) delete next[idx];
      else next[idx] = minutes;
      return next;
    });
  };

  const adjustDuration = (idx, delta) => {
    const current = stopDurations[idx] || 0;
    setDuration(idx, Math.max(0, current + delta));
  };

  const handleCalculate = () => {
    const stops = Object.entries(stopDurations).map(([idx, durationMin]) => ({
      waypointIndex: parseInt(idx),
      durationMin,
      id: idx,
    }));
    onCalculate(stops, selectedRoute.id);
  };

  const totalStopMin = Object.values(stopDurations).reduce((a, b) => a + b, 0);

  return (
    <div className="stops-step">
      <div className="step-header">
        <div className="step-badge">Paso 2 de 2</div>
        <h2 className="step-title">Elige ruta y paradas</h2>
        <p className="step-desc">
          Google ha calculado varias opciones. Escoge la que encaja con la salida y marca cuánto tiempo vas a parar.
        </p>
      </div>

      <div className="route-picker">
        {route.routes.map(item => (
          <button
            key={item.id}
            className={`route-choice ${item.id === selectedRoute.id ? 'route-choice-active' : ''}`}
            onClick={() => onSelectRoute(item.id)}
          >
            <span className="route-choice-name">{item.profileName}</span>
            <span className="route-choice-meta">{(item.distanceM / 1000).toFixed(0)} km · {formatSeconds(item.durationS)}</span>
            <span className="route-choice-tone">{item.profileTone}</span>
          </button>
        ))}
      </div>

      <div className="waypoints-list">
        {stoppableWaypoints.map((wp, i) => {
          const km = (wp.distFromStart / 1000).toFixed(0);
          const isOrigin = i === 0;
          const duration = stopDurations[i] || 0;
          const hasStop = duration > 0;

          return (
            <div key={i} className={`wp-card ${hasStop ? 'wp-card-active' : ''}`}>
              <div className="wp-marker">
                <span className="wp-number" style={{ background: isOrigin ? 'var(--green)' : 'var(--yellow)' }}>
                  {i + 1}
                </span>
                {i < stoppableWaypoints.length - 1 && <span className="wp-line" />}
              </div>

              <div className="wp-content">
                <div className="wp-info">
                  <span className="wp-name">{shortLabel(wp.label)}</span>
                  <span className="wp-km">{isOrigin ? 'Salida · km 0' : `km ${km}`}</span>
                </div>

                <div className="wp-stop-control">
                  {hasStop ? (
                    <div className="duration-stepper">
                      <button className="step-btn" onClick={() => adjustDuration(i, -15)}>-</button>
                      <span className="duration-val">{duration} min</span>
                      <button className="step-btn" onClick={() => adjustDuration(i, 15)}>+</button>
                      <button className="step-clear" onClick={() => setDuration(i, 0)}>x</button>
                    </div>
                  ) : (
                    <button className="btn-add-pause" onClick={() => setDuration(i, 30)}>
                      Parar aquí
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {waypoints.length > 0 && (
          <div className="wp-card wp-card-dest">
            <div className="wp-marker">
              <span className="wp-number" style={{ background: 'var(--red)' }}>
                {waypoints.length}
              </span>
            </div>
            <div className="wp-content">
              <div className="wp-info">
                <span className="wp-name">{shortLabel(waypoints[waypoints.length - 1].label)}</span>
                <span className="wp-km">Destino · km {(selectedRoute.distanceM / 1000).toFixed(0)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {totalStopMin > 0 && (
        <div className="stops-summary">
          Tiempo total de paradas: <strong>{formatStopTotal(totalStopMin)}</strong>
        </div>
      )}

      <div className="step-actions">
        <button className="btn-secondary-lg" onClick={onBack}>Atrás</button>
        <button className="btn-submit" onClick={handleCalculate}>
          Calcular previsión
        </button>
      </div>
    </div>
  );
}

function shortLabel(label) {
  if (!label) return 'Punto';
  return label.split(',')[0].trim();
}

function formatStopTotal(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatSeconds(seconds) {
  const totalMin = Math.max(0, seconds / 60);
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  return `${h}h ${m}min`;
}
