const PRIORITY_COLORS = ['#e03a3a', '#f5843a', '#f5c842', '#4caf88'];

export default function GearPanel({ gear }) {
  if (!gear?.length) return null;

  return (
    <section className="gear-panel">
      <h3 className="gear-title">Equipación recomendada</h3>
      <div className="gear-list">
        {gear.map(item => (
          <div key={item.id} className="gear-item">
            <span className="gear-dot" style={{ background: PRIORITY_COLORS[item.priority] || '#4caf88' }} />
            <div className="gear-text">
              <strong>{item.label}</strong>
              <span>{item.reason}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
