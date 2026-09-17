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

function usePhilippineTime() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return now.toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
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

  const phTime = usePhilippineTime();

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

        <div className="ph-clock">
          <span className="ph-clock__dot" />
          <span className="ph-clock__label">Philippines</span>
          <span className="ph-clock__time">{phTime}</span>
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