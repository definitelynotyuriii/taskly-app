// StatsCards.jsx
export default function StatsCards({ stats }) {
  return (
    <div className="stats-grid">
      {stats.map((stat) => (
        <div key={stat.label} className="stat-card">
          <span className="stat-card__label">{stat.label}</span>
          <span className="stat-card__value">{stat.value}</span>
          <span className={`stat-card__sub${stat.tone === 'positive' ? ' stat-card__sub--positive' : ''}`}>
            {stat.sublabel}
          </span>
        </div>
      ))}
    </div>
  )
}