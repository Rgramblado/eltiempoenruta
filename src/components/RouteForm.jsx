import { useState } from 'react';

export default function RouteForm({ onSubmit, initialData }) {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  const defaultTime = now.toISOString().slice(0, 16);

  const [url, setUrl] = useState(initialData?.url || '');
  const [departureTime, setDepartureTime] = useState(initialData?.departureTime || defaultTime);
  const [speedMultiplier, setSpeedMultiplier] = useState(initialData?.speedMultiplier || 1.0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    onSubmit({ url: url.trim(), departureTime, speedMultiplier: parseFloat(speedMultiplier) });
  };

  const multiplierLabel = (m) => {
    const pct = Math.round((m - 1) * 100);
    if (pct === 0) return 'Normal (OSRM)';
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
            El tiempo cambia mientras conduces. Aquí sabes qué te espera en cada punto y a qué hora llegarás.
          </p>
        </div>

        <div className="form-body">
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
              Comparte la ruta desde Google Maps y pega el enlace. Funciona con enlaces cortos (maps.app.goo.gl).
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
                <span className="field-label-hint"> — opcional</span>
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
                La duración base la calcula OSRM según el tipo de vía. Ajusta si conduces más rápido o lento que la media.
              </span>
            </div>
          </div>

          <button
            className="btn-submit"
            onClick={handleSubmit}
            disabled={!url.trim()}
          >
            Continuar a paradas →
          </button>
        </div>
      </div>

      <div className="form-explainer">
        <div className="explainer-item">
          <span className="explainer-icon">🗺️</span>
          <div>
            <strong>Cómo funciona</strong>
            <p>Calculo tu posición exacta en cada momento de la ruta y consulto la meteorología para ese punto y esa hora.</p>
          </div>
        </div>
        <div className="explainer-item">
          <span className="explainer-icon">⏱️</span>
          <div>
            <strong>Tiempos reales</strong>
            <p>OSRM calcula la duración tramo a tramo según el tipo de vía: autovía, carretera nacional, pueblo. No es una velocidad fija.</p>
          </div>
        </div>
        <div className="explainer-item">
          <span className="explainer-icon">🌡️</span>
          <div>
            <strong>Temperatura aparente</strong>
            <p>No la temperatura del aire, sino lo que sientes en moto con el viento. Lo que importa de verdad.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
