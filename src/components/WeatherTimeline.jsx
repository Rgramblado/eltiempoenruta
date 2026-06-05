import { interpretWeatherCode, getAlertLevel } from '../utils/weather';

const ALERT_COLORS = ['#4caf88', '#f5c842', '#f5843a', '#e03a3a'];
const ALERT_LABELS = ['OK', 'Precaución', 'Aviso', 'Peligro'];
const ALERT_ICONS = ['✅', '⚠️', '🔶', '🔴'];

export default function WeatherTimeline({ samples, stopsByDist }) {
  if (!samples?.length) return null;

  const sortedStops = [...(stopsByDist || [])].sort((a, b) => a.distFromStart - b.distFromStart);

  return (
    <div className="timeline-section">
      <h3 className="timeline-title">Previsión a lo largo de la ruta</h3>
      <div className="timeline-scroll">
        {samples.map((s, i) => {
          const w = s.weather;
          if (!w) return null;
          const winfo = interpretWeatherCode(w.weatherCode);
          const alert = getAlertLevel(w);
          const alertColor = ALERT_COLORS[alert];
          const km = (s.distanceFromStart / 1000).toFixed(0);
          const eta = new Date(s.etaMs).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
          const isFirst = i === 0;
          const isLast = i === samples.length - 1;

          // Check if there's a stop near this point
          const nearStop = sortedStops.find(stop => {
            const stopKm = stop.distFromStart / 1000;
            const sKm = s.distanceFromStart / 1000;
            return Math.abs(stopKm - sKm) < 12;
          });

          return (
            <div
              key={i}
              className={`timeline-card ${alert > 1 ? 'timeline-card-alert' : ''}`}
              style={{ borderTopColor: alertColor }}
            >
              <div className="tc-header">
                <span className="tc-km">{isFirst ? 'Salida' : isLast ? 'Llegada' : `km ${km}`}</span>
                <span className="tc-time">{eta}</span>
              </div>

              <div className="tc-weather-icon">{winfo.icon}</div>
              <div className="tc-label">{winfo.label}</div>

              <div className="tc-temp-main" style={{ color: s.color }}>
                {Math.round(w.apparentTemp ?? w.temp)}°
              </div>
              <div className="tc-temp-real">({Math.round(w.temp)}° real)</div>

              <div className="tc-stats">
                <div className="tc-stat">
                  <span className="tc-stat-icon">🌧️</span>
                  <span className="tc-stat-val">{w.precipProb}%</span>
                </div>
                <div className="tc-stat">
                  <span className="tc-stat-icon">💨</span>
                  <span className="tc-stat-val">{Math.round(w.windspeed)} km/h</span>
                </div>
                {w.precip > 0 && (
                  <div className="tc-stat">
                    <span className="tc-stat-icon">💧</span>
                    <span className="tc-stat-val">{w.precip} mm</span>
                  </div>
                )}
              </div>

              {alert > 0 && (
                <div className="tc-alert" style={{ color: alertColor }}>
                  {ALERT_ICONS[alert]} {ALERT_LABELS[alert]}
                </div>
              )}

              {nearStop && (
                <div className="tc-stop">
                  ⏸️ Parada {Math.round(nearStop.durationMs / 60000)} min
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AlertSummary samples={samples} />
    </div>
  );
}

function AlertSummary({ samples }) {
  const dangerous = samples.filter(s => s.alertLevel >= 2);
  if (!dangerous.length) return (
    <div className="alert-summary ok">
      ✅ Ruta sin alertas significativas. Buen viaje.
    </div>
  );

  return (
    <div className="alert-summary warn">
      <strong>⚠️ Zonas a vigilar:</strong>
      <ul className="alert-list">
        {dangerous.map((s, i) => {
          const w = s.weather;
          const winfo = interpretWeatherCode(w.weatherCode);
          const km = (s.distanceFromStart / 1000).toFixed(0);
          const eta = new Date(s.etaMs).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
          return (
            <li key={i}>
              <span style={{ color: ALERT_COLORS[s.alertLevel] }}>{ALERT_LABELS[s.alertLevel]}</span>
              {' '} · km {km} ({eta}) · {winfo.icon} {winfo.label} ·{' '}
              {Math.round(w.apparentTemp)}° sensación · {w.precipProb}% lluvia · {Math.round(w.windspeed)} km/h viento
            </li>
          );
        })}
      </ul>
    </div>
  );
}
