// Sidebar.jsx
import { useState } from 'react'
import { LayoutGrid, CheckSquare, Calendar, FolderKanban, Settings, LogOut } from 'lucide-react'

const navItems = [
  { icon: LayoutGrid, label: 'Overview' },
  { icon: CheckSquare, label: 'My tasks' },
  { icon: Calendar, label: 'Calendar' },
  { icon: FolderKanban, label: 'Projects' },
]

function getInitials(fullName) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .slice(0, 2)
    .join('')
}

// Derives category counts + completion status live from the current tasks
function getCategories(tasks) {
  const map = new Map()

  tasks.forEach((task) => {
    if (!map.has(task.category)) {
      map.set(task.category, { total: 0, completed: 0 })
    }
    const entry = map.get(task.category)
    entry.total += 1
    if (task.completed) entry.completed += 1
  })

  return Array.from(map).map(([name, { total, completed }]) => {
    let status = 'red'
    if (completed === total) status = 'green'
    else if (completed > 0) status = 'yellow'

    return { name, count: total, status }
  })
}

const statusColors = {
  green: '#4ade80',
  yellow: '#facc15',
  red: '#ef4444',
}

export default function Sidebar({ activePage, onNavigate, fullName, onLogout, tasks }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const categories = getCategories(tasks)

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">T</div>
        <span className="brand-name">taskly</span>
      </div>

      <nav className="nav-group">
        {navItems.map(({ icon: Icon, label }) => (
          <button
            key={label}
            className={`nav-item${activePage === label ? ' nav-item--active' : ''}`}
            onClick={() => onNavigate(label)}
          >
            <Icon size={18} strokeWidth={2} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="nav-section">
        <span className="nav-section__label">Categories</span>
        <div className="category-list">
          {categories.length === 0 ? (
            <span className="category-item__count">No tasks yet</span>
          ) : (
            categories.map((cat) => (
              <button key={cat.name} className="category-item">
                <span className="category-item__left">
                  <span className="dot" style={{ background: statusColors[cat.status] }} />
                  {cat.name}
                </span>
                <span className="category-item__count">{cat.count}</span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="sidebar-spacer" />

      <div className="user-card-wrapper">
        <div className="user-card">
          <div className="user-avatar">{getInitials(fullName)}</div>
          <div className="user-info">
            <span className="user-name">{fullName}</span>
            <span className="user-role">Personal workspace</span>
          </div>
          <button
            className="icon-button icon-button--ghost user-settings"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Settings"
          >
            <Settings size={16} />
          </button>
        </div>

        {menuOpen && (
          <div className="user-menu">
            <button
              className="user-menu__item"
              onClick={() => {
                setMenuOpen(false)
                onLogout()
              }}
            >
              <LogOut size={15} />
              Log out
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}