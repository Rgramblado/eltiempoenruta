const LEVELS = {
  excellent: { label: 'Excelente', color: '#4caf88', verdict: 'Ruta recomendable. A disfrutar.' },
  good: { label: 'Buena', color: '#8bc34a', verdict: 'Ruta recomendable, sin problemas serios.' },
  caution: { label: 'Precaución', color: '#f5c842', verdict: 'Se puede salir, pero vigila los tramos marcados.' },
  bad: { label: 'Mala', color: '#f5843a', verdict: 'Ruta complicada. Valora cambiar hora o recorrido.' },
  avoid: { label: 'Evitar', color: '#e03a3a', verdict: 'Mejor no salir con esta previsión.' },
};

export default function RideScorePanel({ rideScore }) {
  if (!rideScore) return null;

  const level = LEVELS[rideScore.level] || LEVELS.caution;
  const worst = (rideScore.worstSegments || []).filter(segment => segment.score < 75);

  return (
    <section className="ridescore-panel">
      <div className="ridescore-main">
        <div className="ridescore-gauge" style={{ '--score-color': level.color }}>
          <svg viewBox="0 0 120 120" className="gauge-svg">
            <circle cx="60" cy="60" r="52" className="gauge-track" />
            <circle
              cx="60" cy="60" r="52"
              className="gauge-fill"
              style={{
                stroke: level.color,
                strokeDasharray: `${(rideScore.score / 100) * 326.7} 326.7`,
              }}
            />
          </svg>
          <div className="gauge-center">
            <span className="gauge-score">{rideScore.score}</span>
            <span className="gauge-max">/100</span>
          </div>
        </div>

        <div className="ridescore-info">
          <span className="ridescore-kicker">RideScore</span>
          <h3 className="ridescore-level" style={{ color: level.color }}>{level.label}</h3>
          <p className="ridescore-verdict">{level.verdict}</p>
          <span className={`confidence confidence-${confidenceEs(rideScore.confidence)}`}>
            Confianza {confidenceEs(rideScore.confidence)}
          </span>
        </div>
      </div>

      {rideScore.mainReasons?.length > 0 && (
        <ul className="ridescore-reasons">
          {rideScore.mainReasons.map((reason, i) => (
            <li key={i}>{reason}</li>
          ))}
        </ul>
      )}

      {worst.length > 0 && (
        <div className="ridescore-worst">
          <span className="worst-title">Tramos a vigilar</span>
          {worst.map(segment => {
            const segLevel = LEVELS[segment.level] || LEVELS.caution;
            return (
              <div key={segment.index} className="worst-segment">
                <span className="worst-km">km {Math.round(segment.fromKm)}–{Math.round(segment.toKm)}</span>
                <span className="worst-score" style={{ color: segLevel.color }}>{segment.score}/100</span>
                <span className="worst-reason">{segment.reasons?.[0] || segLevel.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function confidenceEs(value) {
  if (value === 'high') return 'alta';
  if (value === 'low') return 'baja';
  return 'media';
}
