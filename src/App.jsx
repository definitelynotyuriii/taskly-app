import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Header from './components/Header.jsx'
import StatsCards from './components/StatsCards.jsx'
import TaskList from './components/TaskList.jsx'
import Notebook from './components/Notebook.jsx'
import AddTaskModal from './components/AddTaskModal.jsx'
import NameGate from './components/NameGate.jsx'
import SchedulePanel from './components/SchedulePanel.jsx'
import Music from './components/Music.jsx'

function getPHDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function computeStats(tasks) {
  const total = tasks.length
  const completed = tasks.filter((t) => t.completed).length
  const inProgress = total - completed
  const todayStr = getPHDateKey()
  const dueToday = tasks.filter((t) => !t.completed && t.due === todayStr).length
  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100)

  return [
    { label: 'Total tasks', value: total, sublabel: 'Across your workspace' },
    { label: 'Completed', value: completed, sublabel: `${completionRate}% completion rate`, tone: 'positive' },
    { label: 'In progress', value: inProgress, sublabel: 'Keep the momentum' },
    { label: 'Due today', value: dueToday, sublabel: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) },
  ]
}

function slugify(profile) {
  return `${profile.firstName}-${profile.lastName}`.toLowerCase().replace(/\s+/g, '-')
}

function getTasksKey(profile) {
  return `taskly-tasks-${slugify(profile)}`
}

function getNotebookKey(profile) {
  return `taskly-notebook-${slugify(profile)}`
}

function getMusicKey(profile) {
  return `taskly-music-${slugify(profile)}`
}

function getAvatarKey(profile) {
  return `taskly-avatar-${slugify(profile)}`
}

function loadAvatar(profile) {
  try {
    return localStorage.getItem(getAvatarKey(profile)) || null
  } catch {
    return null
  }
}

function playCompletionSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const now = ctx.currentTime
    const notes = [880, 1175]

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.value = freq

      const startTime = now + i * 0.1
      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + 0.3)
    })
  } catch (err) {
    console.error('Could not play completion sound:', err)
  }
}

export default function App() {
  const [tasks, setTasks] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activePage, setActivePage] = useState('Overview')
  const [profile, setProfile] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [toast, setToast] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const savedProfile = localStorage.getItem('taskly-profile')
    if (savedProfile) {
      const parsedProfile = JSON.parse(savedProfile)

      // avatar is stored separately; fall back to old format (avatar inside profile)
      const avatar = loadAvatar(parsedProfile) || parsedProfile.avatar || null
      setProfile({ ...parsedProfile, avatar })

      const savedTasks = localStorage.getItem(getTasksKey(parsedProfile))
      if (savedTasks) setTasks(JSON.parse(savedTasks))
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded || !profile) return
    localStorage.setItem(getTasksKey(profile), JSON.stringify(tasks))
  }, [tasks, loaded, profile])

  const handleNameSubmit = (data) => {
    // save only the name (and course) in the profile; the avatar has its own key
    const { avatar: _ignored, ...nameOnly } = data
    localStorage.setItem('taskly-profile', JSON.stringify(nameOnly))

    // load this user's saved avatar on login
    setProfile({ ...nameOnly, avatar: loadAvatar(nameOnly) })

    const savedTasks = localStorage.getItem(getTasksKey(nameOnly))
    setTasks(savedTasks ? JSON.parse(savedTasks) : [])
  }

  const handleLogout = () => {
    // remove only the session profile; tasks, notebook, avatar and music stay saved
    localStorage.removeItem('taskly-profile')
    setProfile(null)
    setTasks([])
  }

  const handleAvatarChange = (dataUrl) => {
    setProfile((prev) => ({ ...prev, avatar: dataUrl }))
    try {
      localStorage.setItem(getAvatarKey(profile), dataUrl)
    } catch {
      alert('Image is too large to save. Try a smaller one.')
    }
  }

  const addTask = (newTask) => {
    setTasks((prev) => [
      { id: Date.now(), completed: false, ...newTask },
      ...prev,
    ])
    setIsModalOpen(false)
  }

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        const updated = { ...t, completed: !t.completed }
        if (updated.completed) {
          playCompletionSound()
          setToast('Task completed! 🎉')
          setTimeout(() => setToast(null), 2500)
        }
        return updated
      })
    )
  }

  if (!loaded) return null

  if (!profile) {
    return <NameGate onSubmit={handleNameSubmit} />
  }

  const fullName = `${profile.firstName} ${profile.lastName}`
  const notebookKey = getNotebookKey(profile)
  const musicKey = getMusicKey(profile)
  const filteredTasks = tasks.filter((t) =>
    (t.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        fullName={fullName}
        course={profile.course}
        onLogout={handleLogout}
        tasks={tasks}
        avatarUrl={profile.avatar}
        onAvatarChange={handleAvatarChange}
      />

      <main className="main-content">
        <Header
          dateLabel="THURSDAY · 17 SEPTEMBER"
          name={profile.firstName}
          onAddTask={() => setIsModalOpen(true)}
          tasks={tasks}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {activePage === 'Overview' && (
          <>
            <StatsCards stats={computeStats(tasks)} />
            <div className="content-columns">
              <TaskList tasks={filteredTasks} setTasks={setTasks} onToggleTask={toggleTask} />
              <SchedulePanel tasks={tasks} />
            </div>
          </>
        )}

        {activePage === 'Notebook' && (
          <Notebook storageKey={notebookKey} />
        )}

        {/* Music stays mounted so the song keeps playing on other pages */}
        <div style={{ display: activePage === 'Music' ? 'block' : 'none' }}>
          <Music key={musicKey} storageKey={musicKey} />
        </div>
      </main>

      {isModalOpen && (
        <AddTaskModal
          onSubmit={addTask}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}