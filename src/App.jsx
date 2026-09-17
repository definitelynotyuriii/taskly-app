import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Header from './components/Header.jsx'
import StatsCards from './components/StatsCards.jsx'
import TaskList from './components/TaskList.jsx'
import SchedulePanel from './components/SchedulePanel.jsx'
import AddTaskModal from './components/AddTaskModal.jsx'
import NameGate from './components/NameGate.jsx'

function computeStats(tasks) {
  const total = tasks.length
  const completed = tasks.filter((t) => t.completed).length
  const inProgress = total - completed
  const todayStr = new Date().toISOString().slice(0, 10)
  const dueToday = tasks.filter((t) => t.due === todayStr).length
  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100)

  return [
    { label: 'Total tasks', value: total, sublabel: 'Across your workspace' },
    { label: 'Completed', value: completed, sublabel: `${completionRate}% completion rate`, tone: 'positive' },
    { label: 'In progress', value: inProgress, sublabel: 'Keep the momentum' },
    { label: 'Due today', value: dueToday, sublabel: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) },
  ]
}

function getTasksKey(profile) {
  const slug = `${profile.firstName}-${profile.lastName}`
    .toLowerCase()
    .replace(/\s+/g, '-')
  return `taskly-tasks-${slug}`
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

  useEffect(() => {
    const savedProfile = localStorage.getItem('taskly-profile')
    if (savedProfile) {
      const parsedProfile = JSON.parse(savedProfile)
      setProfile(parsedProfile)

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
    localStorage.setItem('taskly-profile', JSON.stringify(data))
    setProfile(data)

    const savedTasks = localStorage.getItem(getTasksKey(data))
    setTasks(savedTasks ? JSON.parse(savedTasks) : [])
  }

  const handleLogout = () => {
    localStorage.removeItem('taskly-profile')
    setProfile(null)
    setTasks([])
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

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        fullName={fullName}
        onLogout={handleLogout}
        tasks={tasks}
      />

      <main className="main-content">
        <Header
          dateLabel="THURSDAY · 17 SEPTEMBER"
          name={profile.firstName}
          onAddTask={() => setIsModalOpen(true)}
          tasks={tasks}
        />

        {activePage === 'Overview' && (
          <>
            <StatsCards stats={computeStats(tasks)} />
            <div className="content-columns">
              <TaskList tasks={tasks} setTasks={setTasks} onToggleTask={toggleTask} />
              <SchedulePanel tasks={tasks} />
            </div>
          </>
        )}

        {activePage !== 'Overview' && (
          <div className="task-card">
            <div className="task-card__header">
              <div>
                <h2>{activePage}</h2>
                <span className="task-card__count">Coming soon</span>
              </div>
            </div>
          </div>
        )}
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