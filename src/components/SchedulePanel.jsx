// SchedulePanel.jsx
import { useMemo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
function formatTime(time24) {
  const [h, m] = time24.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

const WEEKDAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// 24 standard one-hour offset time zones, UTC-12 to UTC+11
const TIMEZONES = [
  { offset: "UTC-12", country: "Baker Island, US", tz: "Etc/GMT+12" },
  { offset: "UTC-11", country: "American Samoa", tz: "Pacific/Pago_Pago" },
  { offset: "UTC-10", country: "Hawaii, USA", tz: "Pacific/Honolulu" },
  { offset: "UTC-9", country: "Alaska, USA", tz: "America/Anchorage" },
  { offset: "UTC-8", country: "USA (Pacific)", tz: "America/Los_Angeles" },
  { offset: "UTC-7", country: "USA (Mountain)", tz: "America/Denver" },
  { offset: "UTC-6", country: "Mexico", tz: "America/Mexico_City" },
  { offset: "UTC-5", country: "USA (Eastern)", tz: "America/New_York" },
  { offset: "UTC-4", country: "Chile", tz: "America/Santiago" },
  { offset: "UTC-3", country: "Argentina", tz: "America/Argentina/Buenos_Aires" },
  { offset: "UTC-2", country: "South Georgia", tz: "Atlantic/South_Georgia" },
  { offset: "UTC-1", country: "Azores, Portugal", tz: "Atlantic/Azores" },
  { offset: "UTC+0", country: "United Kingdom", tz: "Europe/London" },
  { offset: "UTC+1", country: "France", tz: "Europe/Paris" },
  { offset: "UTC+2", country: "Egypt", tz: "Africa/Cairo" },
  { offset: "UTC+3", country: "Russia (Moscow)", tz: "Europe/Moscow" },
  { offset: "UTC+4", country: "United Arab Emirates", tz: "Asia/Dubai" },
  { offset: "UTC+5", country: "Pakistan", tz: "Asia/Karachi" },
  { offset: "UTC+6", country: "Bangladesh", tz: "Asia/Dhaka" },
  { offset: "UTC+7", country: "Thailand / Indonesia (WIB)", tz: "Asia/Bangkok" },
  { offset: "UTC+8", country: "Philippines / Indonesia (WITA)", tz: "Asia/Manila" },
  { offset: "UTC+9", country: "Japan / Indonesia (WIT)", tz: "Asia/Tokyo" },
  { offset: "UTC+10", country: "Australia (Sydney)", tz: "Australia/Sydney" },
  { offset: "UTC+11", country: "Solomon Islands", tz: "Pacific/Guadalcanal" },
];

function toDateKey(year, month, day) {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function buildCalendarGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

function useTick() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return now;
}

export default function SchedulePanel({ tasks, initialDate = new Date() }) {
  const [viewDate, setViewDate] = useState(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
  );
  const [selectedKey, setSelectedKey] = useState(
    toDateKey(
      initialDate.getFullYear(),
      initialDate.getMonth(),
      initialDate.getDate()
    )
  );
  const [selectedTz, setSelectedTz] = useState(TIMEZONES[20].tz); // Philippines / Indonesia (WITA)

  const now = useTick();

  const activeZone = TIMEZONES.find((z) => z.tz === selectedTz) ?? TIMEZONES[20];

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthLabel = viewDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const grid = useMemo(() => buildCalendarGrid(year, month), [year, month]);

  const markedSet = useMemo(
    () => new Set(tasks.map((t) => t.due)),
    [tasks]
  );

  const selectedTasks = useMemo(
    () => tasks.filter((task) => task.due === selectedKey),
    [tasks, selectedKey]
  );

  const selectedLabel = useMemo(() => {
    const [y, m, d] = selectedKey.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }, [selectedKey]);

  function goToPrevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }

  function goToNextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }

  function handleSelectDay(day) {
    if (!day) return;
    setSelectedKey(toDateKey(year, month, day));
  }

  return (
    <div className="schedule-panel">
      {/* Calendar card */}
      <div className="schedule-card">
        <div className="schedule-card__header">
          <div>
            <span className="schedule-card__eyebrow">Schedule</span>
            <h3>{monthLabel}</h3>
          </div>
          <div className="schedule-nav">
            <button
              type="button"
              className="icon-button icon-button--ghost"
              onClick={goToPrevMonth}
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="icon-button icon-button--ghost"
              onClick={goToNextMonth}
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="world-clock">
          <span className="world-clock__dot" />
          <select
            className="world-clock__select"
            value={selectedTz}
            onChange={(e) => setSelectedTz(e.target.value)}
          >
            {TIMEZONES.map((z) => (
              <option key={z.tz} value={z.tz}>
                {z.offset} · {z.country}
              </option>
            ))}
          </select>
          <span className="world-clock__time">
            {now.toLocaleTimeString("en-US", {
              timeZone: activeZone.tz,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            })}
          </span>
        </div>

        <div className="calendar-grid">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label} className="calendar-grid__weekday">
              {label}
            </span>
          ))}

          {grid.map((day, idx) => {
            if (!day) {
              return (
                <span
                  key={`empty-${idx}`}
                  className="calendar-day calendar-day--empty"
                />
              );
            }

            const key = toDateKey(year, month, day);
            const isSelected = key === selectedKey;
            const isMarked = markedSet.has(key);

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectDay(day)}
                className={`calendar-day${
                  isSelected ? " calendar-day--selected" : ""
                }`}
              >
                {day}
                {isMarked && <span className="calendar-day__dot" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day / agenda card */}
      <div className="agenda-card">
        <div className="agenda-card__header">
          <div>
            <span className="agenda-card__eyebrow">Selected day</span>
            <h3>{selectedLabel}</h3>
          </div>
          <Sparkles size={18} className="agenda-card__sparkle" />
        </div>

        {selectedTasks.length === 0 ? (
          <p className="task-empty">Nothing scheduled.</p>
        ) : (
          <ul className="agenda-list">
            {selectedTasks.map((task) => (
              <li key={task.id} className="agenda-item">
                <span className="agenda-item__dot" />
                <div>
                  <span className="agenda-item__title">{task.title}</span>
                <span className="agenda-item__meta">
                  {task.category} &middot; {task.priority}
                  {task.dueTime ? ` · ${formatTime(task.dueTime)}` : ''}
                </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}