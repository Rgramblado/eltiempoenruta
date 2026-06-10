import { interpretWeatherCode, getAlertLevel } from '../utils/weather';

const ALERT_COLORS = ['#4caf88', '#f5c842', '#f5843a', '#e03a3a'];
const ALERT_LABELS = ['OK', 'Precaución', 'Aviso', 'Peligro'];

export default function WeatherTimeline({ samples, stopsByDist }) {
  if (!samples?.length) return null;

  const sortedStops = [...(stopsByDist || [])].sort((a, b) => a.distFromStart - b.distFromStart);

  return (
    <div className="timeline-section">
      <h3 className="timeline-title">Previsión a lo largo de la ruta</h3>
      <div className="timeline-scroll">
        {samples.map((sample, i) => {
          const weather = sample.weather;
          if (!weather) return null;
          const winfo = interpretWeatherCode(weather.weatherCode);
          const alert = getAlertLevel(weather);
          const alertColor = ALERT_COLORS[alert];
          const km = (sample.distanceFromStart / 1000).toFixed(0);
          const eta = new Date(sample.etaMs).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
          const isFirst = i === 0;
          const isLast = i === samples.length - 1;
          const nearStop = sortedStops.find(stop => Math.abs((stop.distFromStart - sample.distanceFromStart) / 1000) < 12);

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
              <div className="tc-label">{weather.weatherLabel || winfo.label}</div>

              <div className="tc-temp-main" style={{ color: sample.color }}>
                {Math.round(weather.apparentTemp ?? weather.temp)}°
              </div>
              <div className="tc-temp-real">({Math.round(weather.temp)}° real)</div>

              <div className="tc-stats">
                <div className="tc-stat">
                  <span className="tc-stat-icon">Lluvia</span>
                  <span className="tc-stat-val">{weather.precipProb}%</span>
                </div>
                <div className="tc-stat">
                  <span className="tc-stat-icon">Viento</span>
                  <span className="tc-stat-val">{Math.round(weather.windspeed)} km/h</span>
                </div>
                {weather.precip > 0 && (
                  <div className="tc-stat">
                    <span className="tc-stat-icon">Agua</span>
                    <span className="tc-stat-val">{weather.precip} mm</span>
                  </div>
                )}
              </div>

              <div className={`confidence confidence-${weather.confidence || 'media'}`}>
                Confianza {weather.confidence || 'media'}
              </div>

              {alert > 0 && (
                <div className="tc-alert" style={{ color: alertColor }}>
                  {ALERT_LABELS[alert]}
                </div>
              )}

              {nearStop && (
                <div className="tc-stop">
                  Parada {Math.round(nearStop.durationMs / 60000)} min
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
  const dangerous = samples.filter(sample => sample.alertLevel >= 2);
  if (!dangerous.length) {
    return (
      <div className="alert-summary ok">
        Ruta sin alertas significativas. Buen viaje.
      </div>
    );
  }

  return (
    <div className="alert-summary warn">
      <strong>Zonas a vigilar</strong>
      <ul className="alert-list">
        {dangerous.map((sample, i) => {
          const weather = sample.weather;
          const winfo = interpretWeatherCode(weather.weatherCode);
          const km = (sample.distanceFromStart / 1000).toFixed(0);
          const eta = new Date(sample.etaMs).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
          return (
            <li key={i}>
              <span style={{ color: ALERT_COLORS[sample.alertLevel] }}>{ALERT_LABELS[sample.alertLevel]}</span>
              {' '} · km {km} ({eta}) · {weather.weatherLabel || winfo.label} ·{' '}
              {Math.round(weather.apparentTemp)}° sensación · {weather.precipProb}% lluvia · {Math.round(weather.windspeed)} km/h viento
            </li>
          );
        })}
      </ul>
    </div>
  );
}
