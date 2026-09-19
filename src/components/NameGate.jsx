import { useState } from 'react'

/* Edit this list to match the courses/programs your users pick from.
   The value shown in the dropdown and the value saved are the same string. */
const COURSES = [
  // A
  'Bachelor of Science in Accountancy',
  'Bachelor of Science in Accounting Technology',
  'Bachelor of Science in Agricultural Engineering',
  'Bachelor of Science in Agricultural and Biosystems Engineering',
  'Bachelor of Science in Agriculture',
  'Bachelor of Science in Agribusiness',
  'Bachelor of Science in Agribusiness Economics',
  'Bachelor of Arts in Anthropology',
  'Bachelor of Science in Applied Mathematics',
  'Bachelor of Science in Architecture',
  'Bachelor of Science in Aerospace Engineering',

  // B
  'Bachelor of Science in Biology',
  'Bachelor of Science in Business Administration',
  'Bachelor of Science in Business Management',
  'Bachelor of Arts in Broadcasting',
  'Bachelor of Early Childhood Education',
  'Bachelor of Elementary Education',
  'Bachelor of Fine Arts',

  // C
  'Bachelor of Science in Chemical Engineering',
  'Bachelor of Science in Chemistry',
  'Bachelor of Science in Civil Engineering',
  'Bachelor of Arts in Communication',
  'Bachelor of Science in Computer Engineering',
  'Bachelor of Science in Computer Science',
  'Bachelor of Science in Computer Technology',
  'Bachelor of Science in Criminology',
  'Bachelor of Science in Customs Administration',

  // D
  'Bachelor of Science in Data Science',
  'Doctor of Dental Medicine',
  'Bachelor of Arts in Development Communication',
  'Bachelor of Arts in Development Studies',
  'Doctor of Medicine',
  'Doctor of Veterinary Medicine',

  // E
  'Bachelor of Science in Economics',
  'Bachelor of Science in Electrical Engineering',
  'Bachelor of Science in Electronics Engineering',
  'Bachelor of Arts in English',
  'Bachelor of Arts in English Language Studies',
  'Bachelor of Science in Entrepreneurship',
  'Bachelor of Science in Environmental Science',
  'Bachelor of Science in Entertainment and Multimedia Computing',

  // F
  'Bachelor of Science in Fisheries',
  'Bachelor of Fine Arts',
  'Bachelor of Science in Food Technology',
  'Bachelor of Science in Forestry',
  'Bachelor of Science in Forensic Science',

  // G
  'Bachelor of Science in Geodetic Engineering',
  'Bachelor of Science in Geology',
  'Bachelor of Science in Guidance and Counseling',

  // H
  'Bachelor of Science in Health Science',
  'Bachelor of Science in Hospitality Management',
  'Bachelor of Science in Hotel and Restaurant Management',
  'Bachelor of Science in Human Resource Management',

  // I
  'Bachelor of Science in Industrial Engineering',
  'Bachelor of Science in Industrial Technology',
  'Bachelor of Science in Information Systems',
  'Bachelor of Science in Information Technology',
  'Bachelor of Science in Interior Design',
  'Bachelor of Arts in International Studies',
  'Bachelor of Arts in Islamic Studies',

  // J
  'Bachelor of Arts in Journalism',
  'Juris Doctor',

  // K
  'Bachelor of Science in Kinesiology',

  // L
  'Bachelor of Science in Landscape Architecture',
  'Bachelor of Science in Legal Management',
  'Bachelor of Library and Information Science',
  'Bachelor of Arts in Literature',

  // M
  'Bachelor of Science in Management Accounting',
  'Bachelor of Science in Marine Biology',
  'Bachelor of Science in Marine Transportation',
  'Bachelor of Science in Marketing',
  'Bachelor of Science in Mathematics',
  'Bachelor of Science in Mechanical Engineering',
  'Bachelor of Science in Medical Laboratory Science',
  'Bachelor of Science in Medical Technology',
  'Bachelor of Science in Midwifery',
  'Bachelor of Science in Mining Engineering',
  'Bachelor of Multimedia Arts',
  'Bachelor of Music',

  // N
  'Bachelor of Science in Nursing',
  'Bachelor of Science in Nutrition and Dietetics',

  // O
  'Bachelor of Science in Occupational Therapy',
  'Bachelor of Science in Office Administration',
  'Doctor of Optometry',

  // P
  'Bachelor of Science in Pharmacy',
  'Bachelor of Arts in Philosophy',
  'Bachelor of Physical Education',
  'Bachelor of Science in Physical Therapy',
  'Bachelor of Science in Physics',
  'Bachelor of Arts in Political Science',
  'Bachelor of Science in Psychology',
  'Bachelor of Science in Public Administration',
  'Bachelor of Science in Public Management',

  // Q
  'Bachelor of Science in Quantity Surveying',

  // R
  'Bachelor of Science in Radiologic Technology',
  'Bachelor of Science in Real Estate Management',
  'Bachelor of Science in Respiratory Therapy',
  'Bachelor of Science in Robotics Engineering',

  // S
  'Bachelor of Science in Sanitary Engineering',
  'Bachelor of Science in Social Work',
  'Bachelor of Arts in Sociology',
  'Bachelor of Science in Software Engineering',
  'Bachelor of Special Needs Education',
  'Bachelor of Science in Speech-Language Pathology',
  'Bachelor of Science in Sports Science',
  'Bachelor of Science in Statistics',

  // T
  'Bachelor of Teacher Education',
  'Bachelor of Technical-Vocational Teacher Education',
  'Bachelor of Science in Tourism Management',
  'Bachelor of Technology and Livelihood Education',
  'Bachelor of Theology',

  // U
  'Bachelor of Science in Urban and Regional Planning',

  // V
  'Doctor of Veterinary Medicine',

  // W
  'Bachelor of Science in Wildlife Management',

  // Z
  'Bachelor of Science in Zoology',

  // Other
  'Other',
];

export default function NameGate({ onSubmit }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [course, setCourse] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !course) return
    onSubmit({ firstName: firstName.trim(), lastName: lastName.trim(), course })
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

          <label className="login-field">
            <span>Course</span>
            <select
              className="login-select"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
            >
              <option value="" disabled>
                Select your course
              </option>
              {COURSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" className="primary-button login-submit">
            Continue
          </button>
        </form>
      </div>
    </div>
  )
}