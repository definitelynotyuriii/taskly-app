import { useState } from 'react'

export default function NameGate({ onSubmit }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) return
    onSubmit({ firstName: firstName.trim(), lastName: lastName.trim() })
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="baguio-scene">
          <svg className="baguio-scene__stars" viewBox="0 0 300 420" preserveAspectRatio="none">
            {[
              [24, 40], [70, 20], [110, 60], [160, 30], [200, 50],
              [240, 25], [270, 70], [40, 90], [130, 15], [190, 90],
            ].map(([cx, cy], i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={i % 3 === 0 ? 1.6 : 1}
                fill="#f2f5f2"
                style={{ animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </svg>

          <div className="baguio-scene__moon" />
          <div className="baguio-scene__mist" />

          {/* Back mountain layer */}
          <svg className="baguio-scene__mountains" viewBox="0 0 300 200" preserveAspectRatio="none" style={{ bottom: 60, opacity: 0.5 }}>
            <path d="M0,140 L40,90 L80,130 L120,70 L160,120 L200,80 L240,130 L270,100 L300,140 L300,200 L0,200 Z" fill="#1c221f" />
          </svg>

          {/* Front mountain layer */}
          <svg className="baguio-scene__mountains" viewBox="0 0 300 200" preserveAspectRatio="none" style={{ bottom: 20 }}>
            <path d="M0,170 L50,110 L90,150 L140,80 L190,150 L230,100 L270,150 L300,120 L300,200 L0,200 Z" fill="#141a16" />
          </svg>

          {/* Pine tree line */}
          <svg className="baguio-scene__trees" viewBox="0 0 300 90" preserveAspectRatio="none">
            {[10, 40, 70, 100, 130, 160, 190, 220, 250, 280].map((x, i) => (
              <g key={i} className="tree" transform={`translate(${x}, 0)`}>
                <polygon
                  points="10,20 0,50 6,50 -4,75 8,75 8,90 12,90 12,75 24,75 14,50 20,50"
                  fill="#0e130f"
                />
              </g>
            ))}
          </svg>

          <div className="baguio-scene__content">
            <span className="baguio-scene__eyebrow">TODO-LIST</span>
            <h2>taskly</h2>
            <p>Your tasks, organized. Your day, under control</p>
          </div>
        </div>

        <form className="login-form-side" onSubmit={handleSubmit}>
          <label className="login-field">
            <span>First name</span>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Juan"
              autoFocus
            />
          </label>

          <label className="login-field">
            <span>Last name</span>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Dela Cruz"
            />
          </label>

          <button type="submit" className="primary-button login-submit">
            Continue
          </button>
        </form>
      </div>
    </div>
  )
}