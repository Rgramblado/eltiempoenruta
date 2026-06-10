import { useEffect, useState } from 'react';
import { fetchDepartureOptions } from '../utils/weather';

const LEVEL_COLORS = {
  excellent: '#4caf88',
  good: '#8bc34a',
  caution: '#f5c842',
  bad: '#f5843a',
  avoid: '#e03a3a',
};

export default function DepartureOptionsPanel({ samples, onApplyOffset }) {
  const [state, setState] = useState({ status: 'loading', data: null });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', data: null });
    fetchDepartureOptions(samples)
      .then(data => !cancelled && setState({ status: 'ready', data }))
      .catch(() => !cancelled && setState({ status: 'error', data: null }));
    return () => {
      cancelled = true;
    };
  }, [samples]);

  if (state.status === 'error') return null;

  if (state.status === 'loading') {
    return (
      <section className="departure-panel">
        <h3 className="departure-title">¿Mejor a otra hora?</h3>
        <p className="departure-loading">Comparando horas de salida…</p>
      </section>
    );
  }

  const { recommendation, options } = state.data;

  return (
    <section className="departure-panel">
      <h3 className="departure-title">¿Mejor a otra hora?</h3>
      <p className="departure-recommendation">{recommendation}</p>

      <div className="departure-options">
        {options.map(option => {
          const isCurrent = option.offsetMinutes === 0;
          const color = LEVEL_COLORS[option.level] || '#f5c842';
          return (
            <button
              key={option.offsetMinutes}
              className={`departure-chip ${option.recommended ? 'departure-chip-recommended' : ''} ${isCurrent ? 'departure-chip-current' : ''}`}
              onClick={() => !isCurrent && onApplyOffset(option.offsetMinutes)}
              disabled={isCurrent}
              title={isCurrent ? 'Hora actual' : 'Aplicar esta hora de salida'}
            >
              <span className="chip-time">{formatTime(option.departureEta)}</span>
              <span className="chip-score" style={{ color }}>{option.score}</span>
              <span className="chip-meta">
                {isCurrent ? 'Actual' : option.recommended ? 'Recomendada' : offsetLabel(option.offsetMinutes)}
              </span>
              {option.rainMinutes > 0 && (
                <span className="chip-rain">{option.rainMinutes} min lluvia</span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function offsetLabel(minutes) {
  const absolute = Math.abs(minutes);
  const text = absolute >= 60
    ? (absolute % 60 === 0 ? `${absolute / 60}h` : `${Math.floor(absolute / 60)}h${absolute % 60}`)
    : `${absolute}min`;
  return minutes < 0 ? `-${text}` : `+${text}`;
}
