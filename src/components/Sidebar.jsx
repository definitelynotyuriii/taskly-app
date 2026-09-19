import { useState, useRef } from 'react'
import { LayoutGrid, BookOpen, Music, Settings, LogOut, Camera, X, Check } from 'lucide-react'

const navItems = [
  { icon: LayoutGrid, label: 'Overview' },
  { icon: BookOpen, label: 'Notebook' },
  { icon: Music, label: 'Music' },
]

function getInitials(fullName) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .slice(0, 2)
    .join('')
}

function getCategories(tasks) {
  const map = new Map()

  tasks.forEach((task) => {
    if (!map.has(task.category)) {
      map.set(task.category, { total: 0, active: 0, hasHigh: false, hasMedium: false })
    }
    const entry = map.get(task.category)
    entry.total += 1
    if (!task.completed) {
      entry.active += 1
      if (task.priority === 'High') entry.hasHigh = true
      if (task.priority === 'Medium') entry.hasMedium = true
    }
  })

  return Array.from(map)
    .filter(([, { active }]) => active > 0)
    .map(([name, { active, hasHigh, hasMedium }]) => {
      let status = 'green'
      if (hasHigh) status = 'red'
      else if (hasMedium) status = 'yellow'

      return { name, count: active, status }
    })
}

const statusColors = {
  green: '#4ade80',
  yellow: '#facc15',
  red: '#ef4444',
}

// Shrinks the image to a small square so it fits in localStorage
const resizeImage = (file, size = 256) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')

      // center-crop to a square
      const min = Math.min(img.width, img.height)
      const sx = (img.width - min) / 2
      const sy = (img.height - min) / 2
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)

      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not load image'))
    }

    img.src = url
  })

export default function Sidebar({
  activePage,
  onNavigate,
  fullName,
  course,
  onLogout,
  tasks,
  avatarUrl,
  onAvatarChange,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)
  const [pendingAvatar, setPendingAvatar] = useState(null) // chosen but not saved yet
  const fileInputRef = useRef(null)
  const categories = getCategories(tasks)

  const handleChoosePhoto = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const dataUrl = await resizeImage(file)
      setPendingAvatar(dataUrl) // only preview, do not save yet
    } catch {
      alert('Could not read that image. Try another one.')
    }

    e.target.value = ''
  }

  const closeAvatarModal = () => {
    setAvatarModalOpen(false)
    setPendingAvatar(null) // discard unsaved photo
  }

  const handleSavePhoto = () => {
    if (!pendingAvatar) return
    onAvatarChange(pendingAvatar)
    setPendingAvatar(null)
    setAvatarModalOpen(false)
  }

  const previewSrc = pendingAvatar || avatarUrl

  return (
    <aside className="sidebar">
      <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img
          src="/imgs/taskly.logo.png"
          alt="Taskly logo"
          width={40}
          height={40}
          style={{ objectFit: 'contain', borderRadius: 8 }}
        />
        <span className="brand-name">taskly</span>
      </div>

      <div className="user-card-wrapper">
        <div className="user-card">
          <button
            type="button"
            className="user-avatar user-avatar--editable"
            onClick={() => setAvatarModalOpen(true)}
            aria-label="Change profile picture"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="user-avatar__img" />
            ) : (
              getInitials(fullName)
            )}
            <span className="user-avatar__overlay">
              <Camera size={14} />
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          <div className="user-info" style={{ minWidth: 0 }}>
            <span className="user-name" title={fullName}>{fullName}</span>
            <span className="user-role" title={course || 'Personal workspace'}>
              {course || 'Personal workspace'}
            </span>
          </div>
              <button
                className="icon-button icon-button--ghost user-settings"
                style={{ marginTop: 2 }}
                onClick={() => setMenuOpen((open) => !open)}
                aria-label="Settings"
              >
            <Settings size={20} />
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

      {avatarModalOpen && (
        <div className="modal-overlay" onClick={closeAvatarModal}>
          <div className="avatar-modal" onClick={(e) => e.stopPropagation()}>
            <div className="avatar-modal__header">
              <h3>Profile picture</h3>
              <button
                type="button"
                className="icon-button icon-button--ghost"
                onClick={closeAvatarModal}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="avatar-modal__preview">
              {previewSrc ? (
                <img src={previewSrc} alt="Profile" className="avatar-modal__img" />
              ) : (
                <span className="avatar-modal__initials">{getInitials(fullName)}</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button type="button" className="primary-button" onClick={handleChoosePhoto}>
                <Camera size={16} />
                {pendingAvatar ? 'Choose another' : 'Change photo'}
              </button>

              {pendingAvatar && (
                <button type="button" className="primary-button" onClick={handleSavePhoto}>
                  <Check size={16} />
                  Save photo
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}