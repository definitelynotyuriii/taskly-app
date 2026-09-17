// data.js
// Central place for task + schedule data used across the dashboard.
// `tasks` is the single source of truth — everything else (calendar dots,
// category counts, stat cards) is derived from it so nothing drifts out
// of sync when a task is added, completed, or removed.

export const tasks = [
  {
    id: "task-1",
    title: "Finalize Q3 roadmap deck",
    category: "Work",
    priority: "High",
    due: "2026-09-17",
    completed: false,
  },
  {
    id: "task-2",
    title: "Review onboarding copy",
    category: "Design",
    priority: "Medium",
    due: "2026-09-17",
    completed: false,
  },
  {
    id: "task-3",
    title: "Sync with design team",
    category: "Design",
    priority: "Low",
    due: "2026-09-21",
    completed: false,
  },
  {
    id: "task-4",
    title: "Plan personal errands",
    category: "Personal",
    priority: "Low",
    due: "2026-09-24",
    completed: false,
  },
  {
    id: "task-5",
    title: "Ship v1.2 release",
    category: "Work",
    priority: "High",
    due: "2026-09-18",
    completed: true,
  },
];

// Back-compat alias: SchedulePanel.jsx expects `scheduleTasks` with a
// `dueDate` field. Keep it as a thin, always-in-sync derived view of
// `tasks` rather than a second copy of the data.
export const scheduleTasks = tasks.map((t) => ({ ...t, dueDate: t.due }));

// Days (as "YYYY-MM-DD") that should show a dot indicator on the calendar.
export const markedDays = Array.from(new Set(tasks.map((t) => t.due)));

// Sidebar category list — name, task count, and accent color/dot.
const CATEGORY_COLORS = {
  Work: "#38bdf8",
  Design: "#a78bfa",
  Personal: "#facc15",
};

export const categories = Array.from(
  tasks.reduce((map, task) => {
    map.set(task.category, (map.get(task.category) || 0) + 1);
    return map;
  }, new Map())
).map(([name, count]) => ({
  name,
  count,
  color: CATEGORY_COLORS[name] || "#84cc16",
}));

// Current user, shown in the sidebar's user card.
export const user = {
  initials: "TD",
  name: "Tristan Dela Cruz",
  workspace: "Personal workspace",
};

// Overview stat cards.
const totalTasks = tasks.length;
const completedTasks = tasks.filter((t) => t.completed).length;
const inProgressTasks = totalTasks - completedTasks;
const completionRate = totalTasks
  ? Math.round((completedTasks / totalTasks) * 100)
  : 0;

const todayKey = new Date().toISOString().slice(0, 10);
const dueTodayTasks = tasks.filter(
  (t) => t.due === todayKey && !t.completed
).length;

const todayLabel = new Date(todayKey + "T00:00:00").toLocaleDateString(
  "en-US",
  { month: "long", day: "numeric" }
);

export const stats = [
  {
    label: "Total tasks",
    value: totalTasks,
    sublabel: "Across your workspace",
  },
  {
    label: "Completed",
    value: completedTasks,
    sublabel: `${completionRate}% completion rate`,
    tone: "positive",
  },
  {
    label: "In progress",
    value: inProgressTasks,
    sublabel: "Keep the momentum",
  },
  {
    label: "Due today",
    value: dueTodayTasks,
    sublabel: todayLabel,
  },
];