import { useState } from 'react'
import { X } from 'lucide-react'
import { TASK_TYPES, CATEGORY_GROUPS } from '../taskTypes.js'

export default function AddTaskModal({ onSubmit, onClose }) {
  const [category, setCategory] = useState(CATEGORY_GROUPS[0])
  const [taskType, setTaskType] = useState(TASK_TYPES[CATEGORY_GROUPS[0]][0].name)
  const [title, setTitle] = useState('')
  const [due, setDue] = useState(new Date().toISOString().slice(0, 10))
  const [dueTime, setDueTime] = useState('09:00')
  const [priority, setPriority] = useState(TASK_TYPES[CATEGORY_GROUPS[0]][0].priority)

  const handleCategoryChange = (value) => {
    setCategory(value)
    const firstType = TASK_TYPES[value][0]
    setTaskType(firstType.name)
    setPriority(firstType.priority)
  }

  const handleTaskTypeChange = (value) => {
    setTaskType(value)
    const match = TASK_TYPES[category].find((t) => t.name === value)
    if (match) setPriority(match.priority)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const finalTitle = title.trim() || taskType
    onSubmit({
      title: finalTitle,
      category: category.replace(/^\S+\s/, ''),
      due,
      dueTime,
      priority,
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-card__header">
          <h3>Add task</h3>
          <button type="button" className="icon-button icon-button--ghost" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <label className="modal-field">
          <span>Category</span>
          <select value={category} onChange={(e) => handleCategoryChange(e.target.value)}>
            {CATEGORY_GROUPS.map((group) => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </label>

        <label className="modal-field">
          <span>Task type</span>
          <select value={taskType} onChange={(e) => handleTaskTypeChange(e.target.value)}>
            {TASK_TYPES[category].map((t) => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
          </select>
        </label>

        <label className="modal-field">
          <span>Title (optional — defaults to task type)</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={taskType}
          />
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
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </label>
        </div>

        <label className="modal-field">
          <span>Due time</span>
          <input
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
          />
        </label>

        <button type="submit" className="primary-button modal-submit">
          Add task
        </button>
      </form>
    </div>
  )
}