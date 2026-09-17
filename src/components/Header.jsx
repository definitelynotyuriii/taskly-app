import { useState } from 'react'
import { Search, Bell, Plus } from 'lucide-react'

function formatTime(time24) {
  if (!time24) return ''
  const [h, m] = time24.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

export default function Header({ dateLabel, name, onAddTask, tasks, searchQuery, onSearchChange }) {
  const [notifOpen, setNotifOpen] = useState(false)

  const todayStr = new Date().toISOString().slice(0, 10)

  const overdue = tasks.filter((t) => !t.completed && t.due < todayStr)
  const dueToday = tasks.filter((t) => !t.completed && t.due === todayStr)
  const notifCount = overdue.length + dueToday.length

  return (
    <header className="page-header">
      <div>
        <p className="page-header__eyebrow">{dateLabel}</p>
        <h1 className="page-header__title">Good afternoon, {name}</h1>
      </div>

      <div className="page-header__actions">
        <div className="search-field">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="notif-wrapper">
          <button
            className="icon-button"
            aria-label="Notifications"
            onClick={() => setNotifOpen((open) => !open)}
          >
            <Bell size={18} />
            {notifCount > 0 && <span className="notif-badge">{notifCount}</span>}
          </button>

          {notifOpen && (
            <div className="notif-panel">
              <div className="notif-panel__header">Notifications</div>

              {notifCount === 0 ? (
                <p className="task-empty">You're all caught up.</p>
              ) : (
                <ul className="notif-list">
                  {overdue.map((t) => (
                    <li key={t.id} className="notif-item notif-item--red">
                      <span className="notif-item__dot" />
                      <div>
                        <span className="notif-item__title">{t.title}</span>
                        <span className="notif-item__meta">
                          Overdue &middot; was due {t.due}
                        </span>
                      </div>
                    </li>
                  ))}
                  {dueToday.map((t) => (
                    <li key={t.id} className="notif-item notif-item--yellow">
                      <span className="notif-item__dot" />
                      <div>
                        <span className="notif-item__title">{t.title}</span>
                        <span className="notif-item__meta">
                          Due today{t.dueTime ? ` at ${formatTime(t.dueTime)}` : ''}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <button className="primary-button" onClick={onAddTask}>
          <Plus size={16} />
          Add task
        </button>
      </div>
    </header>
  )
}