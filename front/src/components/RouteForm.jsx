import { useState } from 'react';

export default function RouteForm({ onSubmit, initialData }) {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  const defaultTime = now.toISOString().slice(0, 16);

  const [url, setUrl] = useState(initialData?.url || '');
  const [departureTime, setDepartureTime] = useState(initialData?.departureTime || defaultTime);
  const [speedMultiplier, setSpeedMultiplier] = useState(initialData?.speedMultiplier || 1.0);
  const [routeOptions, setRouteOptions] = useState(initialData?.routeOptions || {
    avoidHighways: true,
    avoidTolls: true,
    avoidFerries: true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    onSubmit({ url: url.trim(), departureTime, speedMultiplier: parseFloat(speedMultiplier), routeOptions });
  };

  const toggleOption = (key) => {
    setRouteOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const multiplierLabel = (m) => {
    const pct = Math.round((m - 1) * 100);
    if (pct === 0) return 'Normal';
    if (pct > 0) return `+${pct}% más rápido`;
    return `${pct}% más lento`;
  };

  return (
    <div className="form-wrapper">
      <div className="form-card">
        <div className="form-title-row">
          <div className="step-badge">Paso 1 de 2</div>
          <h2 className="form-title">Planifica tu ruta</h2>
          <p className="form-desc">
            Importa una ruta, ajusta el estilo de conducción y compara perfiles antes de salir.
          </p>
        </div>

        <form className="form-body" onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="field-label">URL de Google Maps</label>
            <input
              className="field-input"
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="Pega aquí el enlace (corto o largo)"
              spellCheck={false}
            />
            <span className="field-hint">
              Comparte la ruta desde Google Maps y pega el enlace. Funciona con enlaces cortos.
            </span>
          </div>

          <div className="form-row-2">
            <div className="form-field">
              <label className="field-label">Hora de salida</label>
              <input
                className="field-input"
                type="datetime-local"
                value={departureTime}
                onChange={e => setDepartureTime(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label className="field-label">
                Ritmo de conducción
                <span className="field-label-hint"> - opcional</span>
              </label>
              <div className="multiplier-display">{multiplierLabel(speedMultiplier)}</div>
              <input
                className="field-range"
                type="range"
                min={0.7}
                max={1.4}
                step={0.05}
                value={speedMultiplier}
                onChange={e => setSpeedMultiplier(parseFloat(e.target.value))}
              />
              <div className="range-labels">
                <span>Tranquilo</span>
                <span>Normal</span>
                <span>Rápido</span>
              </div>
              <span className="field-hint">
                La duración base la calcula Google con tráfico estimado. Ajusta si tu ritmo suele ser distinto.
              </span>
            </div>
          </div>

          <div className="form-field">
            <label className="field-label">Preferencias de ruta</label>
            <div className="route-options">
              <button type="button" className={routeOptions.avoidHighways ? 'option-pill active' : 'option-pill'} onClick={() => toggleOption('avoidHighways')}>
                Evitar autovías
              </button>
              <button type="button" className={routeOptions.avoidTolls ? 'option-pill active' : 'option-pill'} onClick={() => toggleOption('avoidTolls')}>
                Evitar peajes
              </button>
              <button type="button" className={routeOptions.avoidFerries ? 'option-pill active' : 'option-pill'} onClick={() => toggleOption('avoidFerries')}>
                Evitar ferris
              </button>
            </div>
            <span className="field-hint">
              Aunque el enlace venga de Maps, la ruta final se recalcula con estas preferencias.
            </span>
          </div>

          <button className="btn-submit" type="submit" disabled={!url.trim()}>
            Continuar a paradas
          </button>
        </form>
      </div>

      <div className="form-explainer">
        <div className="explainer-item">
          <span className="explainer-icon">ETA</span>
          <div>
            <strong>Previsión por tramo</strong>
            <p>Calcula tu posición estimada en cada tramo y consulta la previsión horaria para ese punto.</p>
          </div>
        </div>
        <div className="explainer-item">
          <span className="explainer-icon">GT</span>
          <div>
            <strong>Rutas Google</strong>
            <p>Respeta evitar autovías, peajes y ferris, y devuelve alternativas comparables.</p>
          </div>
        </div>
        <div className="explainer-item">
          <span className="explainer-icon">WX</span>
          <div>
            <strong>Temperatura aparente</strong>
            <p>No la temperatura del aire, sino lo que sientes en moto con el viento.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
