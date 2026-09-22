import { useState, useMemo } from 'react'
import { Search, Bell, Plus, Quote, Music as MusicIcon } from 'lucide-react'
import { MY_SONGS } from './Music'

function getPHDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function formatTime(time24) {
  if (!time24) return ''
  const [h, m] = time24.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

function getGreeting() {
  const phHour = Number(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Asia/Manila',
    }).format(new Date())
  )

  if (phHour < 12) return 'Good morning'
  if (phHour < 18) return 'Good afternoon'
  return 'Good evening'
}

const QUOTES = [
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Great things are done by a series of small things brought together.", author: "Vincent van Gogh" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Success doesn't come from what you do occasionally. It comes from what you do consistently.", author: "Marie Forleo" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Dream big. Start small. Act now.", author: "Robin Sharma" },
  { text: "Your goals don't care how you feel. Show up anyway.", author: "Unknown" },
  { text: "One day or day one. You decide.", author: "Unknown" },
  { text: "Stop waiting for motivation. Build discipline.", author: "Unknown" },
  { text: "The pain of discipline is nothing compared to the pain of regret.", author: "Unknown" },
  { text: "Make today so productive that tomorrow becomes easier.", author: "Unknown" },
  { text: "A little progress each day adds up to big results.", author: "Unknown" },
  { text: "Your only limit is the one you set for yourself.", author: "Unknown" },
  { text: "Work hard in silence. Let your progress make the noise.", author: "Unknown" },
  { text: "Don't quit because it's hard. Keep going because it's worth it.", author: "Unknown" },
  { text: "Focus on the task in front of you. The rest can wait.", author: "Unknown" },
  { text: "Finish what you start.", author: "Unknown" },
];

function getDailyIndex(length) {
  const [y, m, d] = getPHDateKey().split('-').map(Number)
  const dayNumber = Math.floor(Date.UTC(y, m - 1, d) / (1000 * 60 * 60 * 24))
  return dayNumber % length
}

export default function Header({ dateLabel, name, onAddTask, tasks, searchQuery, onSearchChange }) {
  const [notifOpen, setNotifOpen] = useState(false)

  const todayStr = getPHDateKey()

  const overdue = tasks.filter((t) => !t.completed && t.due < todayStr)
  const dueToday = tasks.filter((t) => !t.completed && t.due === todayStr)
  const notifCount = overdue.length + dueToday.length

  const quote = useMemo(() => QUOTES[getDailyIndex(QUOTES.length)], [])

  const q = searchQuery.trim().toLowerCase()
  const taskMatches = useMemo(
    () => (q ? tasks.filter((t) => t.title.toLowerCase().includes(q)).slice(0, 5) : []),
    [q, tasks]
  )
  const songMatches = useMemo(
    () =>
      q
        ? MY_SONGS.filter(
            (s) =>
              s.name.toLowerCase().includes(q) ||
              (s.artist || '').toLowerCase().includes(q)
          ).slice(0, 5)
        : [],
    [q]
  )
  const showResults = q.length > 0 && (taskMatches.length > 0 || songMatches.length > 0)

  return (
    <header className="page-header">
      <div>
        <p className="page-header__eyebrow">{dateLabel}</p>
        <h1 className="page-header__title">{getGreeting()}, {name}</h1>
        <p className="page-header__quote">
          <Quote size={13} className="page-header__quote-icon" />
          <span>"{quote.text}"</span>
          <span className="page-header__quote-author">— {quote.author}</span>
        </p>
      </div>

      <div className="page-header__actions">
        <div className="search-field" style={{ position: 'relative' }}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search tasks or songs..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />

          {showResults && (
            <div
              className="notif-panel"
              style={{ top: 'calc(100% + 8px)', left: 0, right: 'auto', width: 260 }}
            >
              {taskMatches.length > 0 && (
                <>
                  <div className="notif-panel__header">Tasks</div>
                  <ul className="notif-list">
                    {taskMatches.map((t) => (
                      <li key={t.id} className="notif-item">
                        <span className="notif-item__dot" />
                        <span className="notif-item__title">{t.title}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {songMatches.length > 0 && (
                <>
                  <div className="notif-panel__header">Songs</div>
                  <ul className="notif-list">
                    {songMatches.map((s) => (
                      <li key={s.file} className="notif-item">
                        <MusicIcon size={14} />
                        <div>
                          <span className="notif-item__title">{s.name}</span>
                          <span className="notif-item__meta">{s.artist}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
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