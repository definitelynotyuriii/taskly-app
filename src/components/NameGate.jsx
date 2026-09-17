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
    <div className="modal-overlay">
      <form className="modal-card" onSubmit={handleSubmit}>
        <div className="modal-card__header">
          <h3>Welcome to taskly</h3>
        </div>

        <label className="modal-field">
          <span>First name</span>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Juan"
            autoFocus
          />
        </label>

        <label className="modal-field">
          <span>Last name</span>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Dela Cruz"
          />
        </label>

        <button type="submit" className="primary-button modal-submit">
          Continue
        </button>
      </form>
    </div>
  )
}