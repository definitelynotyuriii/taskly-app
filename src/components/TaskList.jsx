import { useState } from 'react'
import { MoreHorizontal, Pencil, Trash2, Check, X } from 'lucide-react'

function formatTime(time24) {
  if (!time24) return ''
  const [h, m] = time24.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

const filters = ['All', 'Active', 'Completed']

function EditTaskModal({ task, onSave, onClose }) {
  const [title, setTitle] = useState(task.title)
  const [category, setCategory] = useState(task.category)
  const [priority, setPriority] = useState(task.priority)
  const [due, setDue] = useState(task.due)
  const [dueTime, setDueTime] = useState(task.dueTime || '')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({ ...task, title: title.trim() || task.title, category, priority, due, dueTime })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-card__header">
          <h3>Edit task</h3>
          <button type="button" className="icon-button icon-button--ghost" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <label className="modal-field">
          <span>Title</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label className="modal-field">
          <span>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option>School</option>
            <option>Home</option>
            <option>Personal / Tech</option>
            <option>Social</option>
            <option>Health & Routine</option>
            <option>Work</option>
          </select>
        </label>

        <div className="modal-row">
          <label className="modal-field">
            <span>Priority</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </label>

          <label className="modal-field">
            <span>Due date</span>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
        </div>

        <label className="modal-field">
          <span>Due time</span>
          <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
        </label>

        <button type="submit" className="primary-button modal-submit">
          Save changes
        </button>
      </form>
    </div>
  )
}

export default function TaskList({ tasks, setTasks, onToggleTask }) {
  const [activeFilter, setActiveFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [editingTask, setEditingTask] = useState(null)

  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const saveEdit = (updatedTask) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)))
    setEditingTask(null)
  }

  const visibleTasks = tasks.filter((t) => {
    if (activeFilter === 'Active' && t.completed) return false
    if (activeFilter === 'Completed' && !t.completed) return false
    if (categoryFilter !== 'All' && t.category !== categoryFilter) return false
    if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false
    return true
  })

  return (
    <section className="task-panel">
      <div className="filter-row">
        <div className="filter-tabs">
          {filters.map((f) => (
            <button
              key={f}
              className={`filter-tab${activeFilter === f ? ' filter-tab--active' : ''}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="filter-selects">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option>All</option>
            <option>School</option>
            <option>Home</option>
            <option>Personal / Tech</option>
            <option>Social</option>
            <option>Health & Routine</option>
            <option>Work</option>
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option>All</option>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
        </div>
      </div>

      <div className="task-card">
        <div className="task-card__header">
          <div>
            <h2>Tasks</h2>
            <span className="task-card__count">
              {visibleTasks.length} shown
            </span>
          </div>
          <button className="icon-button icon-button--ghost" aria-label="More options">
            <MoreHorizontal size={18} />
          </button>
        </div>

        <ul className="task-list">
          {visibleTasks.map((task) => (
            <li key={task.id} className="task-row">
              <button
                className={`task-checkbox${task.completed ? ' task-checkbox--checked' : ''}`}
                onClick={() => onToggleTask(task.id)}
                aria-label="Toggle complete"
              >
                {task.completed && <Check size={13} strokeWidth={3} />}
              </button>

              <div className="task-row__body">
                <span className={`task-row__title${task.completed ? ' task-row__title--done' : ''}`}>
                  {task.title}
                </span>
                <span className="task-row__meta">
                  {task.category} &middot; Due {task.due}{task.dueTime ? ` at ${formatTime(task.dueTime)}` : ''}
                </span>
              </div>

              <span className={`priority-pill priority-pill--${task.priority.toLowerCase()}`}>
                {task.priority}
              </span>

              <button
                className="icon-button icon-button--ghost"
                onClick={() => setEditingTask(task)}
                aria-label="Edit task"
              >
                <Pencil size={15} />
              </button>
              <button
                className="icon-button icon-button--danger"
                onClick={() => deleteTask(task.id)}
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}

          {visibleTasks.length === 0 && (
            <li className="task-empty">Nothing here for this filter yet.</li>
          )}
        </ul>
      </div>

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onSave={saveEdit}
          onClose={() => setEditingTask(null)}
        />
      )}
    </section>
  )
}