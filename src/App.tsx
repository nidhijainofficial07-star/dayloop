import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"

type Page = "today" | "focus" | "review" | "tomorrow" | "history" | "settings" | "profile"
type Priority = "low" | "medium" | "high"
type Recurrence = "none" | "daily" | "weekdays" | "weekly" | "monthly"
type Task = {
  id: number
  title: string
  completed: boolean
  carried?: boolean
  reminder?: string
  notes?: string
  date?: string
  priority?: Priority
  category?: string
  recurrence?: Recurrence
  reminderMinutes?: number
  topThree?: boolean
  createdAt?: string
  completedAt?: string
  order?: number
  snoozedUntil?: string
}

type HistoryRecord = {
  date: string
  total: number
  completed: number
}

const navItems: { page: Page label: string icon: IconName }[] = [
  { page: "today", label: "Today", icon: "sun" },
  { page: "focus", label: "Focus", icon: "timer" },
  { page: "review", label: "End of Day", icon: "moon" },
  { page: "tomorrow", label: "Tomorrow", icon: "calendar" },
  { page: "history", label: "History", icon: "chart" },
  { page: "settings", label: "Settings", icon: "settings" },
]

type IconName = "sun" | "moon" | "calendar" | "chart" | "settings" | "plus" | "check" | "clock" | "more" | "edit" | "trash" | "arrow" | "bell" | "sparkle" | "list" | "close" | "user" | "timer"

function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function readStoredArray<T>(key: string): T[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]")
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function normalizeTasks(tasks: Task[], fallbackDate: string): Task[] {
  return tasks.map((task, index) => ({
    ...task,
    date: task.date || fallbackDate,
    priority: task.priority || "medium",
    category: task.category || undefined,
    recurrence: task.recurrence || "none",
    reminderMinutes: task.reminderMinutes ?? 30,
    createdAt: task.createdAt || new Date().toISOString(),
    order: task.order ?? index,
  }))
}

function removeLegacySeedTasks(tasks: Task[]) {
  return tasks.filter((task) => ![1, 2, 3, 4, 5, 101, 102].includes(task.id))
}

function Icon({ name, size = 20 }: { name: IconName size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
      </>
    ),
    moon: (
      <path d="M20.5 14.1A8.5 8.5 0 0 1 9.9 3.5 8.5 8.5 0 1 0 20.5 14.1Z" />
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 8.95 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.58 15 1.7 1.7 0 0 0 3 14H3v-4h.08A1.7 1.7 0 0 0 4.6 8.95a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.58 1.7 1.7 0 0 0 10 3V3h4v.08A1.7 1.7 0 0 0 15.05 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.42 9 1.7 1.7 0 0 0 21 10h.08v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    edit: (
      <>
        <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" />
        <path d="m14 7 3 3" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" />
      </>
    ),
    arrow: <path d="M5 12h14M14 7l5 5-5 5" />,
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    sparkle: (
      <path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3ZM19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" />
    ),
    list: (
      <>
        <path d="M9 6h11M9 12h11M9 18h11" />
        <path d="m3 6 1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    timer: (
      <>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l3 2M9 2h6M12 2v3" />
      </>
    ),
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function PageHeader({
  eyebrow,
  title,
  description,
  now,
}: {
  eyebrow: string
  title: string
  description: string
  now: Date
}) {
  const currentDate = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now)
  const currentTime = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(now)

  return (
    <div className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="subtitle">{description}</p>
      </div>
      <div className="header-date">
        <Icon name="clock" size={18} />
        <span>{currentDate}</span>
        <i>{currentTime}</i>
      </div>
    </div>
  )
}

function ProgressRing({
  value,
  size = "large",
}: {
  value: number
  size?: "large" | "small"
}) {
  return (
    <div
      className={`progress-ring ${size}`}
      style={{ "--progress": `${value * 3.6}deg` } as React.CSSProperties}
    >
      <div className="progress-ring-inner">
        <strong>{value}%</strong>
        {size === "large" && <span>complete</span>}
      </div>
    </div>
  )
}

function TaskRow({
  task,
  onToggle,
  onEdit,
  onUpdate,
  onDelete,
  onFocus,
  onMove,
  tomorrow = false,
}: {
  task: Task
  onToggle?: (id: number) => void
  onEdit?: (id: number, title: string) => void
  onUpdate?: (id: number, updates: Partial<Task>) => void
  onDelete?: (id: number) => void
  onFocus?: (task: Task) => void
  onMove?: (id: number, direction: -1 | 1) => void
  tomorrow?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [editNotes, setEditNotes] = useState(task.notes || "")
  const [editPriority, setEditPriority] = useState<Priority>(
    task.priority || "medium",
  )
  const [editCategory, setEditCategory] = useState(task.category || "")
  const [editRecurrence, setEditRecurrence] = useState<Recurrence>(
    task.recurrence || "none",
  )

  function save() {
    if (title.trim()) onEdit?.(task.id, title.trim())
    onUpdate?.(task.id, {
      title: title.trim() || task.title,
      notes: editNotes.trim() || undefined,
      priority: editPriority,
      category: editCategory.trim() || undefined,
      recurrence: editRecurrence,
    })
    setEditing(false)
  }

  return (
    <div className={`task-row ${task.completed ? "is-complete" : ""}`}>
      <button
        className="checkbox"
        onClick={() => onToggle?.(task.id)}
        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
      >
        {task.completed && <Icon name="check" size={16} />}
      </button>
      <div className="task-copy">
        {editing ? (
          <form
            className="inline-task-editor"
            onSubmit={(event) => {
              event.preventDefault()
              save()
            }}
          >
            <input
              className="edit-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={onUpdate ? undefined : save}
              autoFocus
              aria-label="Edit task"
            />
            {onUpdate && (
              <div className="inline-edit-options">
                <select
                  value={editPriority}
                  onChange={(event) =>
                    setEditPriority(event.target.value as Priority)
                  }
                  aria-label="Task priority"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <input
                  value={editCategory}
                  onChange={(event) => setEditCategory(event.target.value)}
                  aria-label="Task category"
                  placeholder="Category"
                />
                <select
                  value={editRecurrence}
                  onChange={(event) =>
                    setEditRecurrence(event.target.value as Recurrence)
                  }
                  aria-label="Task recurrence"
                >
                  <option value="none">No repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekdays">Weekdays</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <input
                  value={editNotes}
                  onChange={(event) => setEditNotes(event.target.value)}
                  placeholder="Notes"
                  aria-label="Task notes"
                />
                <button type="submit">Save</button>
              </div>
            )}
          </form>
        ) : (
          <button
            className="task-title-button"
            onClick={() => onToggle?.(task.id)}
          >
            <span className="task-title">{task.title}</span>
          </button>
        )}
        <div className="task-meta">
          {task.topThree && (
            <span className="top-tag">
              <Icon name="sparkle" size={12} /> Top 3
            </span>
          )}
          {task.priority && (
            <span className={`priority-tag ${task.priority}`}>
              {task.priority} priority
            </span>
          )}
          {task.category && (
            <span className="category-tag">{task.category}</span>
          )}
          {task.recurrence && task.recurrence !== "none" && (
            <span className="recurrence-tag">Repeats {task.recurrence}</span>
          )}
          {task.carried && (
            <span className="carried-tag">
              <Icon name="arrow" size={12} /> Carried from yesterday
            </span>
          )}
          {task.reminder && (
            <span className="due-time">
              <Icon name="clock" size={13} /> Due{" "}
              {tomorrow ? "tomorrow at " : "at "}
              {task.reminder}
            </span>
          )}
          {task.notes && <span className="notes-preview">{task.notes}</span>}
        </div>
      </div>
      <div className="task-actions">
        {onFocus && !task.completed && (
          <button
            className="icon-button"
            onClick={() => onFocus(task)}
            aria-label={`Focus on ${task.title}`}
          >
            <Icon name="timer" size={17} />
          </button>
        )}
        {onMove && (
          <>
            <button
              className="icon-button move-up"
              onClick={() => onMove(task.id, -1)}
              aria-label="Move task up"
            >
              <Icon name="arrow" size={15} />
            </button>
            <button
              className="icon-button move-down"
              onClick={() => onMove(task.id, 1)}
              aria-label="Move task down"
            >
              <Icon name="arrow" size={15} />
            </button>
          </>
        )}
        {onEdit && (
          <button
            className="icon-button"
            onClick={() => setEditing(true)}
            aria-label="Edit task"
          >
            <Icon name="edit" size={17} />
          </button>
        )}
        {onDelete && (
          <button
            className="icon-button danger"
            onClick={() => onDelete(task.id)}
            aria-label="Delete task"
          >
            <Icon name="trash" size={17} />
          </button>
        )}
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon name="check" />
      </div>
      <p>{message}</p>
    </div>
  )
}

export default function App() {
  const [now, setNow] = useState(() => new Date())
  const [userName, setUserName] = useState(
    () => localStorage.getItem("dayloop-name") || "",
  )
  const [nameInput, setNameInput] = useState("")
  const [profileName, setProfileName] = useState("")
  const [page, setPage] = useState<Page>("today")
  const [todayTasks, setTodayTasks] = useState<Task[]>(() => {
    return normalizeTasks(
      removeLegacySeedTasks(readStoredArray<Task>("dayloop-today")),
      localDateKey(new Date()),
    )
  })
  const [tomorrowTasks, setTomorrowTasks] = useState<Task[]>(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return normalizeTasks(
      removeLegacySeedTasks(readStoredArray<Task>("dayloop-tomorrow")),
      localDateKey(tomorrow),
    )
  })
  const [newTask, setNewTask] = useState("")
  const [newTaskTime, setNewTaskTime] = useState("")
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("medium")
  const [newTaskCategory, setNewTaskCategory] = useState("")
  const [newTaskNotes, setNewTaskNotes] = useState("")
  const [newTaskRecurrence, setNewTaskRecurrence] = useState<Recurrence>("none")
  const [newTaskDate, setNewTaskDate] = useState(() => localDateKey(new Date()))
  const [newTaskTopThree, setNewTaskTopThree] = useState(false)
  const [taskFilter, setTaskFilter] = useState("all")
  const [taskSearch, setTaskSearch] = useState("")
  const [focusedTask, setFocusedTask] = useState<Task | null>(null)
  const [focusDuration, setFocusDuration] = useState(
    () => Number(localStorage.getItem("dayloop-focus-duration")) || 25,
  )
  const [focusSeconds, setFocusSeconds] = useState(() => focusDuration * 60)
  const [focusRunning, setFocusRunning] = useState(false)
  const [reviewPrompt, setReviewPrompt] = useState(false)
  const [reviewed, setReviewed] = useState<number[]>([])
  const [endTime, setEndTime] = useState(
    () => localStorage.getItem("dayloop-end-time") || "21:00",
  )
  const [reminders, setReminders] = useState(
    () => localStorage.getItem("dayloop-reminders") !== "false",
  )
  const [reminderTiming, setReminderTiming] = useState(
    () => localStorage.getItem("dayloop-reminder-timing") || "30",
  )
  const [historyRange, setHistoryRange] = useState("7")
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>(() => {
    return readStoredArray<HistoryRecord>("dayloop-history")
  })
  const [savedMessage, setSavedMessage] = useState(false)
  const [reminderAlert, setReminderAlert] = useState<Task | null>(null)
  const notifiedTasks = useRef(new Set<number>())

  useEffect(() => {
    localStorage.setItem("dayloop-today", JSON.stringify(todayTasks))
  }, [todayTasks])

  useEffect(() => {
    localStorage.setItem("dayloop-tomorrow", JSON.stringify(tomorrowTasks))
  }, [tomorrowTasks])

  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(clock)
  }, [])

  const todayKey = localDateKey(now)

  useEffect(() => {
    const lastDay = localStorage.getItem("dayloop-active-day")
    if (!lastDay) {
      localStorage.setItem("dayloop-active-day", todayKey)
      return
    }
    if (lastDay === todayKey) return

    const generatedRecurring = todayTasks
      .filter((task) => {
        if (!task.recurrence || task.recurrence === "none") return false
        if (task.recurrence === "daily") return true
        if (task.recurrence === "weekdays")
          return now.getDay() >= 1 && now.getDay() <= 5
        const created = new Date(task.createdAt || now)
        if (task.recurrence === "weekly")
          return created.getDay() === now.getDay()
        return created.getDate() === now.getDate()
      })
      .map((task, index) => ({
        ...task,
        id: Date.now() + index,
        completed: false,
        completedAt: undefined,
        carried: false,
        date: todayKey,
        order: tomorrowTasks.length + index,
      }))
    setTodayTasks([
      ...tomorrowTasks.map((task) => ({
        ...task,
        date: todayKey,
        carried: task.carried || undefined,
      })),
      ...generatedRecurring,
    ])
    setTomorrowTasks([])
    setReviewed([])
    notifiedTasks.current.clear()
    localStorage.setItem("dayloop-active-day", todayKey)
  }, [todayKey])

  useEffect(() => {
    if (!focusRunning) return
    const timer = window.setInterval(() => {
      setFocusSeconds((seconds) => {
        if (seconds <= 1) {
          setFocusRunning(false)
          return 0
        }
        return seconds - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [focusRunning])

  useEffect(() => {
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
    const promptedToday =
      localStorage.getItem("dayloop-review-prompted") === todayKey
    if (
      !promptedToday &&
      currentTime >= endTime &&
      todayTasks.some((task) => !task.completed)
    ) {
      setReviewPrompt(true)
      localStorage.setItem("dayloop-review-prompted", todayKey)
    }
  }, [endTime, now, todayKey, todayTasks])

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}sw.js`)
        .catch(() => undefined)
    }
    if (!document.querySelector('link[rel="manifest"]')) {
      const manifest = document.createElement("link")
      manifest.rel = "manifest"
      manifest.href = `${import.meta.env.BASE_URL}manifest.webmanifest`
      document.head.appendChild(manifest)
    }
  }, [])

  useEffect(() => {
    setHistoryRecords((records) => {
      const nextRecord = {
        date: todayKey,
        total: todayTasks.length,
        completed: todayTasks.filter((task) => task.completed).length,
      }
      const existing = records.find((record) => record.date === todayKey)
      if (
        existing?.total === nextRecord.total &&
        existing.completed === nextRecord.completed
      )
        return records
      return [
        ...records.filter((record) => record.date !== todayKey),
        nextRecord,
      ]
    })
  }, [todayKey, todayTasks])

  useEffect(() => {
    localStorage.setItem("dayloop-history", JSON.stringify(historyRecords))
  }, [historyRecords])

  useEffect(() => {
    if (!reminders || !userName) return

    function checkReminders() {
      const now = new Date()
      const todayKey = now.toDateString()
      todayTasks.forEach((task) => {
        if (
          task.completed ||
          !task.reminder ||
          notifiedTasks.current.has(task.id)
        )
          return
        let due: Date
        if (task.snoozedUntil) {
          due = new Date(task.snoozedUntil)
        } else {
          const [time, period] = task.reminder.split(" ")
          const [rawHour, minute] = time.split(":").map(Number)
          let hour = rawHour
          if (period === "PM" && hour !== 12) hour += 12
          if (period === "AM" && hour === 12) hour = 0
          due = new Date()
          due.setHours(hour, minute, 0, 0)
        }
        const minutesUntilDue = (due.getTime() - now.getTime()) / 60000

        if (
          minutesUntilDue >= -1 &&
          minutesUntilDue <= (task.reminderMinutes ?? Number(reminderTiming))
        ) {
          notifiedTasks.current.add(task.id)
          setReminderAlert(task)

          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted"
          ) {
            try {
              new Notification("DayLoop task reminder", {
                body: `${task.title} is due at ${task.reminder}.`,
                tag: `dayloop-${todayKey}-${task.id}`,
              })
            } catch {
              // The in-app alert remains available when the preview blocks system notifications.
            }
          }
        }
      })
    }

    checkReminders()
    const interval = window.setInterval(checkReminders, 30000)
    return () => window.clearInterval(interval)
  }, [reminders, reminderTiming, todayTasks, userName])

  const completed = todayTasks.filter((task) => task.completed).length
  const remaining = todayTasks.length - completed
  const percentage = todayTasks.length
    ? Math.round((completed / todayTasks.length) * 100)
    : 0
  const unfinishedForReview = todayTasks.filter(
    (task) => !task.completed && !reviewed.includes(task.id),
  )
  const recordsByDate = new Map(
    historyRecords.map((record) => [record.date, record]),
  )
  const currentRecord = { date: todayKey, total: todayTasks.length, completed }
  recordsByDate.set(todayKey, currentRecord)
  const recentDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now)
    date.setDate(now.getDate() - (6 - index))
    const record = recordsByDate.get(localDateKey(date))
    return {
      label: new Intl.DateTimeFormat(undefined, { weekday: "narrow" }).format(
        date,
      ),
      complete: Boolean(
        record && record.total > 0 && record.completed === record.total,
      ),
    }
  })
  let streak = 0
  const todayIsComplete =
    currentRecord.total > 0 && currentRecord.completed === currentRecord.total
  for (let offset = todayIsComplete ? 0 : 1; offset < 366; offset += 1) {
    const date = new Date(now)
    date.setDate(now.getDate() - offset)
    const record = recordsByDate.get(localDateKey(date))
    if (!record || record.total === 0 || record.completed !== record.total)
      break
    streak += 1
  }
  const rangeStart = new Date(now)
  rangeStart.setDate(now.getDate() - Number(historyRange) + 1)
  const filteredHistory = Array.from(recordsByDate.values())
    .filter(
      (record) =>
        dateFromKey(record.date) >=
        new Date(
          rangeStart.getFullYear(),
          rangeStart.getMonth(),
          rangeStart.getDate(),
        ),
    )
    .sort((a, b) => b.date.localeCompare(a.date))
  const rangeTotal = filteredHistory.reduce(
    (sum, record) => sum + record.total,
    0,
  )
  const rangeCompleted = filteredHistory.reduce(
    (sum, record) => sum + record.completed,
    0,
  )
  const rangePercentage = rangeTotal
    ? Math.round((rangeCompleted / rangeTotal) * 100)
    : 0
  let longestStreak = 0
  let runningStreak = 0
  Array.from(recordsByDate.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((record) => {
      if (record.total > 0 && record.completed === record.total) {
        runningStreak += 1
        longestStreak = Math.max(longestStreak, runningStreak)
      } else {
        runningStreak = 0
      }
    })
  const visibleTasks = todayTasks
    .filter((task) => {
      const queryMatch =
        task.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
        task.notes?.toLowerCase().includes(taskSearch.toLowerCase())
      const filterMatch =
        taskFilter === "all" ||
        (taskFilter === "top" && task.topThree) ||
        task.category === taskFilter ||
        task.priority === taskFilter
      return queryMatch && filterMatch
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const availableCategories = Array.from(
    new Set(todayTasks.map((task) => task.category).filter(Boolean)),
  ) as string[]
  const greeting =
    now.getHours() < 12
      ? "Good morning"
      : now.getHours() < 18
        ? "Good afternoon"
        : "Good evening"
  const fullCurrentDate = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(now)
  const tomorrowDate = new Date(now)
  tomorrowDate.setDate(now.getDate() + 1)
  const fullTomorrowDate = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(tomorrowDate)

  function addTask(event: FormEvent) {
    event.preventDefault()
    if (!newTask.trim()) return
    const task: Task = {
      id: Date.now(),
      title: newTask.trim(),
      completed: false,
      reminder: newTaskTime ? formatTime(newTaskTime) : undefined,
      reminderMinutes: Number(reminderTiming),
      date: newTaskDate,
      priority: newTaskPriority,
      category: newTaskCategory.trim() || undefined,
      notes: newTaskNotes.trim() || undefined,
      recurrence: newTaskRecurrence,
      topThree:
        newTaskTopThree &&
        todayTasks.filter((item) => item.topThree && !item.completed).length <
          3,
      createdAt: new Date().toISOString(),
      order:
        newTaskDate === todayKey ? todayTasks.length : tomorrowTasks.length,
    }
    if (newTaskDate === todayKey) setTodayTasks((tasks) => [...tasks, task])
    else setTomorrowTasks((tasks) => [...tasks, task])
    setNewTask("")
    setNewTaskTime("")
    setNewTaskNotes("")
    setNewTaskPriority("medium")
    setNewTaskCategory("")
    setNewTaskRecurrence("none")
    setNewTaskTopThree(false)
    setNewTaskDate(todayKey)
    setShowAdvanced(false)
  }

  function formatTime(value: string) {
    const [hourString, minute] = value.split(":")
    const hour = Number(hourString)
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minute} ${hour >= 12 ? "PM" : "AM"}`
  }

  async function enableNotifications() {
    if (typeof Notification === "undefined") return
    await Notification.requestPermission()
  }

  function completeOnboarding(event: FormEvent) {
    event.preventDefault()
    const name = nameInput.trim()
    if (!name) return
    localStorage.setItem("dayloop-name", name)
    if (!localStorage.getItem("dayloop-joined")) {
      localStorage.setItem("dayloop-joined", new Date().toISOString())
    }
    setUserName(name)
    void enableNotifications()
  }

  function toggleTask(id: number) {
    setTodayTasks((tasks) =>
      tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              completed: !task.completed,
              completedAt: !task.completed
                ? new Date().toISOString()
                : undefined,
            }
          : task,
      ),
    )
    if (reminderAlert?.id === id) setReminderAlert(null)
  }

  function editTask(id: number, title: string) {
    setTodayTasks((tasks) =>
      tasks.map((task) => (task.id === id ? { ...task, title } : task)),
    )
  }

  function updateTask(id: number, updates: Partial<Task>) {
    setTodayTasks((tasks) =>
      tasks.map((task) => (task.id === id ? { ...task, ...updates } : task)),
    )
  }

  function deleteTask(id: number) {
    setTodayTasks((tasks) => tasks.filter((task) => task.id !== id))
  }

  function moveTask(id: number, direction: -1 | 1) {
    setTodayTasks((tasks) => {
      const ordered = [...tasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      const index = ordered.findIndex((task) => task.id === id)
      const destination = index + direction
      if (index < 0 || destination < 0 || destination >= ordered.length)
        return tasks
      ;[ordered[index], ordered[destination]] = [
        ordered[destination],
        ordered[index],
      ]
      return ordered.map((task, order) => ({ ...task, order }))
    })
  }

  function startFocus(task: Task) {
    setFocusedTask(task)
    setFocusSeconds(focusDuration * 60)
    setFocusRunning(false)
    setPage("focus")
  }

  function snoozeReminder(minutes: number) {
    if (!reminderAlert) return
    setTodayTasks((tasks) =>
      tasks.map((task) =>
        task.id === reminderAlert.id
          ? {
              ...task,
              snoozedUntil: new Date(
                Date.now() + minutes * 60000,
              ).toISOString(),
            }
          : task,
      ),
    )
    notifiedTasks.current.delete(reminderAlert.id)
    setReminderAlert(null)
  }

  function resolveTask(task: Task, action: "move" | "skip" | "delete") {
    if (action === "move") {
      setTomorrowTasks((tasks) => [
        ...tasks,
        {
          ...task,
          id: Date.now() + task.id,
          completed: false,
          completedAt: undefined,
          carried: true,
          date: localDateKey(tomorrowDate),
          reminder: undefined,
          order: tasks.length,
        },
      ])
    }
    if (action === "delete") {
      setTodayTasks((tasks) => tasks.filter((item) => item.id !== task.id))
    }
    setReviewed((ids) => [...ids, task.id])
  }

  function saveSettings(event: FormEvent) {
    event.preventDefault()
    localStorage.setItem("dayloop-end-time", endTime)
    localStorage.setItem("dayloop-reminders", String(reminders))
    localStorage.setItem("dayloop-reminder-timing", reminderTiming)
    localStorage.setItem("dayloop-focus-duration", String(focusDuration))
    setSavedMessage(true)
    window.setTimeout(() => setSavedMessage(false), 2200)
  }

  function exportData() {
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      userName,
      todayTasks,
      tomorrowTasks,
      historyRecords,
      settings: { endTime, reminders, reminderTiming, focusDuration },
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      }),
    )
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `dayloop-backup-${todayKey}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function importData(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result))
        if (
          !Array.isArray(data.todayTasks) ||
          !Array.isArray(data.tomorrowTasks) ||
          !Array.isArray(data.historyRecords)
        )
          throw new Error()
        setTodayTasks(normalizeTasks(data.todayTasks, todayKey))
        setTomorrowTasks(
          normalizeTasks(data.tomorrowTasks, localDateKey(tomorrowDate)),
        )
        setHistoryRecords(data.historyRecords)
        if (data.settings && typeof data.settings === "object") {
          if (typeof data.settings.endTime === "string")
            setEndTime(data.settings.endTime)
          if (typeof data.settings.reminders === "boolean")
            setReminders(data.settings.reminders)
          if (typeof data.settings.reminderTiming === "string")
            setReminderTiming(data.settings.reminderTiming)
          if (
            typeof data.settings.focusDuration === "number" &&
            data.settings.focusDuration > 0
          ) {
            setFocusDuration(data.settings.focusDuration)
            setFocusSeconds(data.settings.focusDuration * 60)
          }
        }
        if (typeof data.userName === "string" && data.userName.trim()) {
          setUserName(data.userName.trim())
          localStorage.setItem("dayloop-name", data.userName.trim())
        }
        setSavedMessage(true)
      } catch {
        window.alert("This file is not a valid DayLoop backup.")
      }
    }
    reader.readAsText(file)
    event.target.value = ""
  }

  function resetAppData() {
    if (
      !window.confirm(
        "Reset all DayLoop tasks and history? This cannot be undone.",
      )
    )
      return
    setTodayTasks([])
    setTomorrowTasks([])
    setHistoryRecords([])
    setReviewed([])
    notifiedTasks.current.clear()
  }

  function saveProfile(event: FormEvent) {
    event.preventDefault()
    const name = profileName.trim()
    if (!name) return
    localStorage.setItem("dayloop-name", name)
    setUserName(name)
    setProfileName("")
    setSavedMessage(true)
    window.setTimeout(() => setSavedMessage(false), 2200)
  }

  if (!userName) {
    return (
      <main className="welcome-screen">
        <section className="welcome-card">
          <div className="welcome-brand">
            <span className="brand-mark">
              <span />
            </span>
            <span>DayLoop</span>
          </div>
          <div className="welcome-art" aria-hidden="true">
            <div className="welcome-ring">
              <Icon name="check" size={28} />
            </div>
            <span className="orbit-dot one" />
            <span className="orbit-dot two" />
          </div>
          <p className="eyebrow">YOUR DAY, YOUR RHYTHM</p>
          <h1>Let’s make today count.</h1>
          <p className="welcome-description">
            Start with your name. DayLoop will help you plan tasks, meet
            deadlines, and close each day with clarity.
          </p>
          <form className="welcome-form" onSubmit={completeOnboarding}>
            <label htmlFor="name">What should we call you?</label>
            <input
              id="name"
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              placeholder="Enter your first name"
              autoFocus
              autoComplete="given-name"
            />
            <button
              className="primary-button"
              type="submit"
              disabled={!nameInput.trim()}
            >
              Start my day <Icon name="arrow" size={16} />
            </button>
          </form>
          <p className="welcome-note">
            <Icon name="bell" size={14} /> We’ll ask permission to send task
            reminders next.
          </p>
        </section>
        <div className="welcome-side">
          <blockquote>
            “Small steps, repeated daily, become remarkable progress.”
          </blockquote>
          <div className="preview-task">
            <span>
              <Icon name="check" size={14} />
            </span>
            <div>
              <strong>Plan with intention</strong>
              <small>Add your own tasks and deadlines</small>
            </div>
          </div>
          <div className="preview-task offset">
            <span>
              <Icon name="clock" size={14} />
            </span>
            <div>
              <strong>Stay gently on track</strong>
              <small>Choose when DayLoop reminds you</small>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => setPage("today")}
          aria-label="Go to Today"
        >
          <span className="brand-mark">
            <span />
          </span>
          <span>DayLoop</span>
        </button>
        <nav className="nav-list" aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              key={item.page}
              className={`nav-item ${page === item.page ? "active" : ""}`}
              onClick={() => setPage(item.page)}
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
              {item.page === "review" && remaining > 0 && (
                <span className="nav-count">{remaining}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-card">
          <span className="sidebar-card-icon">
            <Icon name="sparkle" size={18} />
          </span>
          <p>Keep the loop going</p>
          <span>
            {streak > 0
              ? `You're on a ${streak} day streak.`
              : "Complete today to start a streak."}
          </span>
          <div className="streak-days">
            {recentDays.map((day, index) => (
              <i
                className={day.complete ? "done" : ""}
                key={`${day.label}-${index}`}
              >
                {day.complete ? <Icon name="check" size={11} /> : day.label}
              </i>
            ))}
          </div>
        </div>
        <button
          className={`profile ${page === "profile" ? "active" : ""}`}
          onClick={() => setPage("profile")}
          aria-label="Open profile dashboard"
        >
          <div className="avatar">{userName.slice(0, 2).toUpperCase()}</div>
          <div>
            <strong>{userName}</strong>
            <span>Local workspace</span>
          </div>
          <Icon name="arrow" size={16} />
        </button>
      </aside>

      <button
        className="mobile-profile"
        onClick={() => setPage("profile")}
        aria-label="Open profile dashboard"
      >
        {userName.slice(0, 2).toUpperCase()}
      </button>

      <main className="main-content">
        {page === "today" && (
          <>
            <PageHeader
              eyebrow="TODAY"
              title={`${greeting}, ${userName}`}
              description="A fresh day, a clear mind. Let's make it count."
              now={now}
            />
            <section className="progress-card">
              <div className="progress-intro">
                <span className="section-icon">
                  <Icon name="sun" size={20} />
                </span>
                <div>
                  <span>Today's progress</span>
                  <strong>
                    {todayTasks.length === 0
                      ? "Start with one meaningful task."
                      : completed === todayTasks.length
                        ? "Everything is done. Nicely played."
                        : "You're building momentum."}
                  </strong>
                </div>
              </div>
              <ProgressRing value={percentage} />
              <div className="progress-stats">
                <div>
                  <strong>{todayTasks.length}</strong>
                  <span>Total tasks</span>
                </div>
                <div>
                  <strong>{completed}</strong>
                  <span>Completed</span>
                </div>
                <div>
                  <strong>{remaining}</strong>
                  <span>Remaining</span>
                </div>
              </div>
            </section>

            <form className="task-composer" onSubmit={addTask}>
              <div className="add-task">
                <span className="add-icon">
                  <Icon name="plus" size={19} />
                </span>
                <input
                  value={newTask}
                  onChange={(event) => setNewTask(event.target.value)}
                  placeholder="What needs to get done?"
                  aria-label="New task"
                />
                <label className="task-time">
                  <Icon name="clock" size={16} />
                  <span>Due</span>
                  <input
                    type="time"
                    value={newTaskTime}
                    onChange={(event) => setNewTaskTime(event.target.value)}
                    aria-label="Task due time"
                  />
                </label>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={!newTask.trim()}
                >
                  Add task
                </button>
              </div>
              <button
                className="advanced-toggle"
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Icon name="settings" size={15} />{" "}
                {showAdvanced ? "Hide options" : "Advanced options"}
              </button>
              {showAdvanced && (
                <div className="advanced-task-fields">
                  <label>
                    <span>Date</span>
                    <input
                      type="date"
                      min={todayKey}
                      max={localDateKey(tomorrowDate)}
                      value={newTaskDate}
                      onChange={(event) => setNewTaskDate(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Priority</span>
                    <select
                      value={newTaskPriority}
                      onChange={(event) =>
                        setNewTaskPriority(event.target.value as Priority)
                      }
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                  <label>
                    <span>Category</span>
                    <input
                      value={newTaskCategory}
                      onChange={(event) =>
                        setNewTaskCategory(event.target.value)
                      }
                      placeholder="Optional category"
                      list="dayloop-categories"
                    />
                    <datalist id="dayloop-categories">
                      {availableCategories.map((category) => (
                        <option value={category} key={category} />
                      ))}
                    </datalist>
                  </label>
                  <label>
                    <span>Repeat</span>
                    <select
                      value={newTaskRecurrence}
                      onChange={(event) =>
                        setNewTaskRecurrence(event.target.value as Recurrence)
                      }
                    >
                      <option value="none">Does not repeat</option>
                      <option value="daily">Daily</option>
                      <option value="weekdays">Weekdays</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </label>
                  <label className="notes-field">
                    <span>Notes</span>
                    <input
                      value={newTaskNotes}
                      onChange={(event) => setNewTaskNotes(event.target.value)}
                      placeholder="Optional details"
                    />
                  </label>
                  <label className="top-three-control">
                    <input
                      type="checkbox"
                      checked={newTaskTopThree}
                      onChange={(event) =>
                        setNewTaskTopThree(event.target.checked)
                      }
                    />
                    <span>Make this one of today’s Top 3</span>
                  </label>
                </div>
              )}
            </form>

            <section className="task-section">
              <div className="section-heading">
                <div>
                  <h2>Today’s tasks</h2>
                  <span>{remaining} left to complete</span>
                </div>
                <button
                  className="text-button"
                  onClick={() => setPage("review")}
                >
                  Review day <Icon name="arrow" size={15} />
                </button>
              </div>
              <div className="task-toolbar">
                <div className="task-search">
                  <Icon name="list" size={15} />
                  <input
                    value={taskSearch}
                    onChange={(event) => setTaskSearch(event.target.value)}
                    placeholder="Search tasks"
                    aria-label="Search tasks"
                  />
                </div>
                <select
                  value={taskFilter}
                  onChange={(event) => setTaskFilter(event.target.value)}
                  aria-label="Filter tasks"
                >
                  <option value="all">All tasks</option>
                  <option value="top">Top 3</option>
                  <option value="high">High priority</option>
                  {availableCategories.map((category) => (
                    <option value={category} key={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="task-list">
                {visibleTasks
                  .filter((task) => !task.completed)
                  .map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={toggleTask}
                      onEdit={editTask}
                      onUpdate={updateTask}
                      onDelete={deleteTask}
                      onFocus={startFocus}
                      onMove={moveTask}
                    />
                  ))}
                {visibleTasks.filter((task) => !task.completed).length ===
                  0 && (
                  <EmptyState
                    message={
                      remaining === 0
                        ? "All done for today. Enjoy the feeling."
                        : "No tasks match this filter."
                    }
                  />
                )}
              </div>
              {completed > 0 && (
                <div className="completed-group">
                  <div className="completed-label">
                    <span>Completed</span>
                    <i>{completed}</i>
                  </div>
                  <div className="task-list">
                    {visibleTasks
                      .filter((task) => task.completed)
                      .map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          onToggle={toggleTask}
                          onEdit={editTask}
                          onUpdate={updateTask}
                          onDelete={deleteTask}
                        />
                      ))}
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {page === "focus" && (
          <>
            <PageHeader
              eyebrow="FOCUS MODE"
              title="One thing at a time"
              description="Clear the noise and give your attention to what matters now."
              now={now}
            />
            <section className="focus-layout">
              <div className="focus-main">
                {focusedTask ? (
                  <>
                    <div className="focus-task-label">
                      <Icon name="timer" size={16} /> CURRENT FOCUS
                    </div>
                    <h2>{focusedTask.title}</h2>
                    {focusedTask.notes && <p>{focusedTask.notes}</p>}
                    <div className="focus-tags">
                      {focusedTask.category && (
                        <span>{focusedTask.category}</span>
                      )}
                      {focusedTask.priority && (
                        <span>{focusedTask.priority} priority</span>
                      )}
                      {focusedTask.reminder && (
                        <span>Due {focusedTask.reminder}</span>
                      )}
                    </div>
                    <div className="focus-timer">
                      {String(Math.floor(focusSeconds / 60)).padStart(2, "0")}:
                      {String(focusSeconds % 60).padStart(2, "0")}
                    </div>
                    <div className="focus-actions">
                      <button
                        className="primary-button"
                        onClick={() => {
                          if (focusSeconds === 0)
                            setFocusSeconds(focusDuration * 60)
                          setFocusRunning(!focusRunning)
                        }}
                      >
                        {focusRunning
                          ? "Pause"
                          : focusSeconds === 0
                            ? "Restart"
                            : "Start focus"}
                      </button>
                      <button
                        onClick={() => {
                          toggleTask(focusedTask.id)
                          setFocusedTask(null)
                          setFocusRunning(false)
                        }}
                      >
                        Mark complete
                      </button>
                    </div>
                  </>
                ) : (
                  <EmptyState message="Choose a task from Today or your Top 3 to begin a focus session." />
                )}
              </div>
              <aside className="focus-queue">
                <div className="section-heading">
                  <div>
                    <h2>Today’s Top 3</h2>
                    <span>Your most important work</span>
                  </div>
                </div>
                {todayTasks
                  .filter((task) => task.topThree && !task.completed)
                  .slice(0, 3)
                  .map((task) => (
                    <button
                      key={task.id}
                      className={focusedTask?.id === task.id ? "active" : ""}
                      onClick={() => startFocus(task)}
                    >
                      <span>
                        <Icon name="sparkle" size={14} />
                      </span>
                      <div>
                        <strong>{task.title}</strong>
                        <small>{task.category}</small>
                      </div>
                      <Icon name="arrow" size={15} />
                    </button>
                  ))}
                {todayTasks.filter((task) => task.topThree && !task.completed)
                  .length === 0 && (
                  <p className="focus-empty">
                    Mark tasks as Top 3 in Advanced options.
                  </p>
                )}
              </aside>
            </section>
          </>
        )}

        {page === "review" && (
          <>
            <PageHeader
              eyebrow="END OF DAY"
              title="Close the loop"
              description="Take a moment to reflect, then decide what moves forward."
              now={now}
            />
            <section className="review-summary">
              <div className="review-copy">
                <span className="section-icon inverse">
                  <Icon name="moon" size={20} />
                </span>
                <div>
                  <p>{fullCurrentDate}</p>
                  <h2>
                    {percentage >= 80
                      ? `A strong day, ${userName}.`
                      : "Progress over perfection."}
                  </h2>
                  <span>
                    You completed {completed} of {todayTasks.length} tasks
                    today.
                  </span>
                </div>
              </div>
              <ProgressRing value={percentage} />
            </section>
            <div className="review-grid">
              <section className="review-column">
                <div className="section-heading compact">
                  <div>
                    <h2>Completed</h2>
                    <span>{completed} tasks finished</span>
                  </div>
                  <span className="success-badge">
                    <Icon name="check" size={14} /> Done
                  </span>
                </div>
                <div className="review-completed">
                  {todayTasks
                    .filter((task) => task.completed)
                    .map((task) => (
                      <div className="mini-task" key={task.id}>
                        <span className="mini-check">
                          <Icon name="check" size={14} />
                        </span>
                        <span>{task.title}</span>
                      </div>
                    ))}
                  {completed === 0 && (
                    <EmptyState message="No completed tasks yet." />
                  )}
                </div>
              </section>
              <section className="review-column">
                <div className="section-heading compact">
                  <div>
                    <h2>Needs a decision</h2>
                    <span>Choose what happens next</span>
                  </div>
                  <span className="pending-badge">
                    {unfinishedForReview.length} left
                  </span>
                </div>
                <div className="decision-list">
                  {unfinishedForReview.map((task) => (
                    <div className="decision-card" key={task.id}>
                      <div>
                        <span className="decision-dot" />
                        <strong>{task.title}</strong>
                      </div>
                      <div className="decision-actions">
                        <button
                          className="move-button"
                          onClick={() => resolveTask(task, "move")}
                        >
                          <Icon name="arrow" size={15} /> Move to tomorrow
                        </button>
                        <button onClick={() => resolveTask(task, "skip")}>
                          Skip
                        </button>
                        <button
                          className="delete-button"
                          onClick={() => resolveTask(task, "delete")}
                          aria-label={`Delete ${task.title}`}
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {unfinishedForReview.length === 0 && (
                    <EmptyState message="Your day is reviewed. The loop is closed." />
                  )}
                </div>
              </section>
            </div>
          </>
        )}

        {page === "tomorrow" && (
          <>
            <PageHeader
              eyebrow="TOMORROW"
              title="Plan ahead, gently"
              description="A little clarity today makes tomorrow feel lighter."
              now={now}
            />
            <section className="tomorrow-banner">
              <div>
                <span className="section-icon">
                  <Icon name="calendar" size={20} />
                </span>
                <div>
                  <p>{fullTomorrowDate}</p>
                  <strong>{tomorrowTasks.length} tasks waiting for you</strong>
                </div>
              </div>
              <div className="tomorrow-count">{tomorrowTasks.length}</div>
            </section>
            <section className="task-section">
              <div className="section-heading">
                <div>
                  <h2>Tomorrow’s tasks</h2>
                  <span>Review what’s ahead</span>
                </div>
              </div>
              <div className="task-list">
                {tomorrowTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    tomorrow
                    onEdit={(id, title) =>
                      setTomorrowTasks((tasks) =>
                        tasks.map((item) =>
                          item.id === id ? { ...item, title } : item,
                        ),
                      )
                    }
                    onUpdate={(id, updates) =>
                      setTomorrowTasks((tasks) =>
                        tasks.map((item) =>
                          item.id === id ? { ...item, ...updates } : item,
                        ),
                      )
                    }
                    onDelete={(id) =>
                      setTomorrowTasks((tasks) =>
                        tasks.filter((item) => item.id !== id),
                      )
                    }
                  />
                ))}
                {tomorrowTasks.length === 0 && (
                  <EmptyState message="Tomorrow is wide open." />
                )}
              </div>
            </section>
          </>
        )}

        {page === "history" && (
          <>
            <PageHeader
              eyebrow="HISTORY"
              title="Your days, in perspective"
              description="Every small finish adds up to something meaningful."
              now={now}
            />
            <section className="history-overview">
              <div className="history-stat featured">
                <span className="section-icon">
                  <Icon name="sparkle" size={19} />
                </span>
                <div>
                  <span>Current streak</span>
                  <strong>
                    {streak} {streak === 1 ? "day" : "days"}
                  </strong>
                </div>
              </div>
              <div className="history-stat">
                <span>Last {historyRange} days</span>
                <strong>{rangePercentage}%</strong>
                <small>completion rate</small>
              </div>
              <div className="history-stat">
                <span>Tasks completed</span>
                <strong>{rangeCompleted}</strong>
                <small>in the last {historyRange} days</small>
              </div>
            </section>
            <section className="history-section">
              <div className="section-heading">
                <div>
                  <h2>Daily history</h2>
                  <span>Your last {historyRange} days at a glance</span>
                </div>
                <select
                  className="filter-button"
                  value={historyRange}
                  onChange={(event) => setHistoryRange(event.target.value)}
                  aria-label="History range"
                >
                  <option value="7">Last 7 days</option>
                  <option value="14">Last 14 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </div>
              <div className="history-list">
                {filteredHistory.map((item) => {
                  const percent = item.total
                    ? Math.round((item.completed / item.total) * 100)
                    : 0
                  const historyDate = dateFromKey(item.date)
                  const dayDifference = Math.round(
                    (new Date(
                      now.getFullYear(),
                      now.getMonth(),
                      now.getDate(),
                    ).getTime() -
                      historyDate.getTime()) /
                      86400000,
                  )
                  const dayLabel =
                    dayDifference === 0
                      ? "Today"
                      : dayDifference === 1
                        ? "Yesterday"
                        : new Intl.DateTimeFormat(undefined, {
                            weekday: "long",
                          }).format(historyDate)
                  const dateLabel = new Intl.DateTimeFormat(undefined, {
                    month: "short",
                    day: "numeric",
                  }).format(historyDate)
                  return (
                    <div className="history-row" key={item.date}>
                      <div className="history-date">
                        <strong>{dayLabel}</strong>
                        <span>{dateLabel}</span>
                      </div>
                      <div className="history-bar-wrap">
                        <div className="history-bar">
                          <span style={{ width: `${percent}%` }} />
                        </div>
                        <span>
                          {item.completed} of {item.total} completed
                        </span>
                      </div>
                      <div className="history-numbers">
                        <div>
                          <strong>{item.total}</strong>
                          <span>Total</span>
                        </div>
                        <div>
                          <strong>{item.completed}</strong>
                          <span>Done</span>
                        </div>
                        <div>
                          <strong>{item.total - item.completed}</strong>
                          <span>Left</span>
                        </div>
                      </div>
                      <div
                        className={`percent-pill ${
                          percent === 100 ? "perfect" : ""
                        }`}
                      >
                        {percent}%
                      </div>
                    </div>
                  )
                })}
                {filteredHistory.length === 0 && (
                  <EmptyState message="Complete your first day to begin your history." />
                )}
              </div>
            </section>
          </>
        )}

        {page === "settings" && (
          <>
            <PageHeader
              eyebrow="SETTINGS"
              title="Make DayLoop yours"
              description="Shape your routine to work the way you do."
              now={now}
            />
            <form className="settings-layout" onSubmit={saveSettings}>
              <section className="settings-card">
                <div className="settings-heading">
                  <span className="section-icon">
                    <Icon name="moon" size={19} />
                  </span>
                  <div>
                    <h2>End of day</h2>
                    <p>Choose when DayLoop should prompt your daily review.</p>
                  </div>
                </div>
                <label className="field">
                  <span>Review time</span>
                  <div className="input-with-icon">
                    <Icon name="clock" size={18} />
                    <input
                      type="time"
                      value={endTime}
                      onChange={(event) => setEndTime(event.target.value)}
                    />
                  </div>
                  <small>We’ll nudge you at this time each day.</small>
                </label>
                <label className="field">
                  <span>Focus session length</span>
                  <select
                    value={focusDuration}
                    onChange={(event) => {
                      const duration = Number(event.target.value)
                      setFocusDuration(duration)
                      if (!focusRunning) setFocusSeconds(duration * 60)
                    }}
                  >
                    <option value="15">15 minutes</option>
                    <option value="25">25 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                  </select>
                  <small>Used when you start a new focus session.</small>
                </label>
              </section>
              <section className="settings-card">
                <div className="settings-heading">
                  <span className="section-icon">
                    <Icon name="list" size={19} />
                  </span>
                  <div>
                    <h2>Your data</h2>
                    <p>
                      Back up, restore, or reset everything stored on this
                      device.
                    </p>
                  </div>
                </div>
                <div className="data-actions">
                  <button type="button" onClick={exportData}>
                    <Icon name="arrow" size={16} /> Export backup
                  </button>
                  <label>
                    <Icon name="plus" size={16} /> Import backup
                    <input
                      type="file"
                      accept="application/json,.json"
                      onChange={importData}
                    />
                  </label>
                  <button
                    type="button"
                    className="danger-action"
                    onClick={resetAppData}
                  >
                    <Icon name="trash" size={16} /> Reset app data
                  </button>
                </div>
                <p className="data-note">
                  DayLoop is local-first. Your tasks stay in this browser unless
                  you export a backup.
                </p>
              </section>
              <section className="settings-card">
                <div className="settings-heading">
                  <span className="section-icon coral">
                    <Icon name="bell" size={19} />
                  </span>
                  <div>
                    <h2>Task reminders</h2>
                    <p>Stay gently on track with timely reminders.</p>
                  </div>
                  <button
                    type="button"
                    className={`toggle ${reminders ? "on" : ""}`}
                    onClick={() => setReminders(!reminders)}
                    aria-label="Toggle reminders"
                  >
                    <span />
                  </button>
                </div>
                <label className={`field ${!reminders ? "disabled" : ""}`}>
                  <span>Remind me before</span>
                  <select
                    value={reminderTiming}
                    onChange={(event) => setReminderTiming(event.target.value)}
                    disabled={!reminders}
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="120">2 hours</option>
                  </select>
                  <small>For tasks that have a reminder time.</small>
                </label>
                <div className="preference-row">
                  <div>
                    <strong>Unfinished task reminder</strong>
                    <span>
                      Send a nudge when tasks remain before your daily review.
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`toggle small ${reminders ? "on" : ""}`}
                    onClick={() => setReminders(!reminders)}
                    aria-label="Toggle unfinished task reminders"
                  >
                    <span />
                  </button>
                </div>
                {typeof Notification !== "undefined" &&
                  Notification.permission !== "granted" && (
                    <div className="notification-permission">
                      <div>
                        <strong>Browser notifications are off</strong>
                        <span>
                          Allow notifications so reminders can reach you while
                          DayLoop is open.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void enableNotifications()}
                      >
                        Enable
                      </button>
                    </div>
                  )}
                <div className="notification-permission test-reminder">
                  <div>
                    <strong>Test your reminders</strong>
                    <span>
                      Send an in-app reminder now to make sure alerts are
                      visible.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setReminderAlert({
                        id: -1,
                        title: `${userName}, your reminders are working`,
                        completed: false,
                        reminder: new Intl.DateTimeFormat(undefined, {
                          hour: "numeric",
                          minute: "2-digit",
                        }).format(new Date()),
                      })
                    }
                  >
                    Test
                  </button>
                </div>
              </section>
              <div className="settings-footer">
                <span>
                  {savedMessage
                    ? "Your preferences have been saved."
                    : "Changes are saved to this device."}
                </span>
                <button className="primary-button" type="submit">
                  Save changes
                </button>
              </div>
            </form>
          </>
        )}

        {page === "profile" && (
          <>
            <PageHeader
              eyebrow="MY PROFILE"
              title={`${userName}’s dashboard`}
              description="Your progress, preferences, and DayLoop journey in one place."
              now={now}
            />
            <section className="profile-hero">
              <div className="profile-avatar-large">
                {userName.slice(0, 2).toUpperCase()}
              </div>
              <div className="profile-hero-copy">
                <span>LOCAL WORKSPACE</span>
                <h2>{userName}</h2>
                <p>
                  Building better days since{" "}
                  {new Intl.DateTimeFormat(undefined, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  }).format(
                    new Date(
                      localStorage.getItem("dayloop-joined") || Date.now(),
                    ),
                  )}
                </p>
              </div>
              <div className="profile-streak">
                <Icon name="sparkle" size={21} />
                <div>
                  <strong>{streak}</strong>
                  <span>day streak</span>
                </div>
              </div>
            </section>

            <section className="profile-metrics">
              <div>
                <span className="metric-icon">
                  <Icon name="check" size={18} />
                </span>
                <div>
                  <strong>
                    {historyRecords.reduce(
                      (sum, record) => sum + record.completed,
                      0,
                    )}
                  </strong>
                  <span>Tasks completed</span>
                </div>
              </div>
              <div>
                <span className="metric-icon coral">
                  <Icon name="list" size={18} />
                </span>
                <div>
                  <strong>
                    {historyRecords.reduce(
                      (sum, record) => sum + record.total,
                      0,
                    )}
                  </strong>
                  <span>Tasks created</span>
                </div>
              </div>
              <div>
                <span className="metric-icon sand">
                  <Icon name="chart" size={18} />
                </span>
                <div>
                  <strong>
                    {historyRecords.reduce(
                      (sum, record) => sum + record.total,
                      0,
                    )
                      ? Math.round(
                          (historyRecords.reduce(
                            (sum, record) => sum + record.completed,
                            0,
                          ) /
                            historyRecords.reduce(
                              (sum, record) => sum + record.total,
                              0,
                            )) *
                            100,
                        )
                      : 0}
                    %
                  </strong>
                  <span>Overall completion</span>
                </div>
              </div>
              <div>
                <span className="metric-icon">
                  <Icon name="sparkle" size={18} />
                </span>
                <div>
                  <strong>{longestStreak}</strong>
                  <span>Longest streak</span>
                </div>
              </div>
            </section>

            <div className="profile-dashboard-grid">
              <section className="profile-panel">
                <div className="section-heading">
                  <div>
                    <h2>Recent activity</h2>
                    <span>Your daily completion activity</span>
                  </div>
                </div>
                <div className="activity-chart">
                  {recentDays.map((day, index) => {
                    const date = new Date(now)
                    date.setDate(now.getDate() - (6 - index))
                    const record = recordsByDate.get(localDateKey(date))
                    const activity = record?.total
                      ? Math.round((record.completed / record.total) * 100)
                      : 0
                    return (
                      <div
                        className="activity-day"
                        key={`${day.label}-${index}`}
                      >
                        <div className="activity-track">
                          <span
                            style={{ height: `${Math.max(activity, 5)}%` }}
                            className={activity === 100 ? "complete" : ""}
                          />
                        </div>
                        <strong>{activity}%</strong>
                        <small>{day.label}</small>
                      </div>
                    )
                  })}
                </div>
              </section>

              <section className="profile-panel">
                <div className="section-heading">
                  <div>
                    <h2>Account details</h2>
                    <span>Keep your profile up to date</span>
                  </div>
                  <span className="profile-badge">
                    <Icon name="user" size={13} /> You
                  </span>
                </div>
                <form className="profile-form" onSubmit={saveProfile}>
                  <label>
                    <span>Display name</span>
                    <input
                      value={profileName}
                      onChange={(event) => setProfileName(event.target.value)}
                      placeholder={userName}
                    />
                  </label>
                  <div className="profile-status-row">
                    <div>
                      <span>Reminders</span>
                      <strong>{reminders ? "Active" : "Paused"}</strong>
                    </div>
                    <div>
                      <span>Daily review</span>
                      <strong>{formatTime(endTime)}</strong>
                    </div>
                  </div>
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={!profileName.trim()}
                  >
                    Save profile
                  </button>
                  {savedMessage && (
                    <small className="saved-inline">
                      Profile updated successfully.
                    </small>
                  )}
                </form>
              </section>
            </div>
          </>
        )}
      </main>

      {reviewPrompt && (
        <aside
          className="review-prompt"
          role="dialog"
          aria-label="End of day review reminder"
        >
          <span className="reminder-toast-icon">
            <Icon name="moon" size={19} />
          </span>
          <div>
            <p>It’s time to close the loop</p>
            <span>
              You have {remaining} unfinished{" "}
              {remaining === 1 ? "task" : "tasks"} to review.
            </span>
          </div>
          <button
            className="primary-button"
            onClick={() => {
              setReviewPrompt(false)
              setPage("review")
            }}
          >
            Review now
          </button>
          <button
            className="prompt-close"
            onClick={() => setReviewPrompt(false)}
            aria-label="Dismiss"
          >
            <Icon name="close" size={16} />
          </button>
        </aside>
      )}

      {reminderAlert && (
        <aside className="reminder-toast" role="alert" aria-live="assertive">
          <span className="reminder-toast-icon">
            <Icon name="bell" size={19} />
          </span>
          <div>
            <p>Task reminder</p>
            <strong>{reminderAlert.title}</strong>
            <span>Due at {reminderAlert.reminder}</span>
            <div className="reminder-actions">
              <button
                onClick={() => {
                  toggleTask(reminderAlert.id)
                  setReminderAlert(null)
                }}
              >
                Complete
              </button>
              <button onClick={() => snoozeReminder(10)}>Snooze 10m</button>
              <button
                onClick={() => {
                  startFocus(reminderAlert)
                  setReminderAlert(null)
                }}
              >
                Focus
              </button>
            </div>
          </div>
          <button
            onClick={() => setReminderAlert(null)}
            aria-label="Dismiss reminder"
          >
            <Icon name="close" size={17} />
          </button>
        </aside>
      )}

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navItems.map((item) => (
          <button
            key={item.page}
            className={page === item.page ? "active" : ""}
            onClick={() => setPage(item.page)}
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label === "End of Day" ? "Review" : item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
