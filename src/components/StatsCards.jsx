import { useEffect, useState, useRef } from 'react'

function useCountUp(target) {
  const [value, setValue] = useState(0)
  const frame = useRef(null)

  useEffect(() => {
    const start = performance.now()
    const duration = 700
    const from = 0

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(from + (target - from) * eased))
      if (progress < 1) frame.current = requestAnimationFrame(tick)
    }

    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [target])

  return value
}

function StatCard({ stat }) {
  const animatedValue = useCountUp(stat.value)

  return (
    <div className="stat-card">
      <span className="stat-card__label">{stat.label}</span>
      <span className="stat-card__value">{animatedValue}</span>
      <span className={`stat-card__sub${stat.tone === 'positive' ? ' stat-card__sub--positive' : ''}`}>
        {stat.sublabel}
      </span>
    </div>
  )
}

export default function StatsCards({ stats }) {
  return (
    <div className="stats-grid">
      {stats.map((stat) => (
        <StatCard key={stat.label} stat={stat} />
      ))}
    </div>
  )
}