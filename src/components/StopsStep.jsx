import { useState } from 'react';

export default function StopsStep({ route, onBack, onCalculate }) {
  const { waypoints, distanceM } = route;

  // Intermediate waypoints are candidates for stops (not origin, not destination)
  // But we allow stops at any waypoint except the very last (no point stopping at destination)
  const stoppableWaypoints = waypoints.slice(0, -1); // all except destination

  // Map of waypointIndex → durationMin (0 = no stop)
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
    onCalculate(stops);
  };

  const totalStopMin = Object.values(stopDurations).reduce((a, b) => a + b, 0);

  const shortLabel = (label) => {
    if (!label) return 'Punto';
    // Take first meaningful chunk before comma
    return label.split(',')[0].trim();
  };

  return (
    <div className="stops-step">
      <div className="step-header">
        <div className="step-badge">Paso 2 de 2</div>
        <h2 className="step-title">¿Vas a parar en algún punto?</h2>
        <p className="step-desc">
          He encontrado {waypoints.length} puntos en tu ruta. Marca dónde paras y cuánto tiempo —
          recalculo la hora de llegada al resto de puntos.
        </p>
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
                      <button className="step-btn" onClick={() => adjustDuration(i, -15)}>−</button>
                      <span className="duration-val">{duration} min</span>
                      <button className="step-btn" onClick={() => adjustDuration(i, 15)}>+</button>
                      <button className="step-clear" onClick={() => setDuration(i, 0)}>✕</button>
                    </div>
                  ) : (
                    <button className="btn-add-pause" onClick={() => setDuration(i, 30)}>
                      ⏸ Parar aquí
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Destination row (no stop possible) */}
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
                <span className="wp-km">Destino · km {(distanceM / 1000).toFixed(0)}</span>
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
        <button className="btn-secondary-lg" onClick={onBack}>← Atrás</button>
        <button className="btn-submit" onClick={handleCalculate}>
          Calcular previsión →
        </button>
      </div>
    </div>
  );
}

function formatStopTotal(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}
