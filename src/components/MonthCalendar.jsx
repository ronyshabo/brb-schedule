import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
} from 'date-fns'
import CalendarCell from './CalendarCell'

const DAY_LABELS = [
  { long: 'Mon', short: 'M' },
  { long: 'Tue', short: 'T' },
  { long: 'Wed', short: 'W' },
  { long: 'Thu', short: 'T' },
  { long: 'Fri', short: 'F' },
  { long: 'Sat', short: 'S' },
  { long: 'Sun', short: 'S' },
]

function MonthCalendar({
  currentMonth,
  confirmedByDate,
  pendingShifts,
  currentUserId,
  onRemovePending,
  onRemoveConfirmed,
}) {
  const monthStart  = startOfMonth(currentMonth)
  const monthEnd    = endOfMonth(currentMonth)
  // Start grid on Monday (weekStartsOn: 1)
  const gridStart   = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd     = endOfWeek(monthEnd,   { weekStartsOn: 1 })
  const days        = eachDayOfInterval({ start: gridStart, end: gridEnd })

  return (
    <div className="month-calendar">
      {/* Day-of-week header */}
      <div className="calendar-header">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="calendar-header__cell">
            <span className="day-label-long">{d.long}</span>
            <span className="day-label-short">{d.short}</span>
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="calendar-grid">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const confirmed = confirmedByDate[dateStr] || {}
          const pending   = pendingShifts[dateStr]   || {}

          return (
            <CalendarCell
              key={dateStr}
              date={day}
              dateStr={dateStr}
              isCurrentMonth={isSameMonth(day, currentMonth)}
              confirmedShifts={confirmed}
              pendingShifts={pending}
              currentUserId={currentUserId}
              onRemovePending={onRemovePending}
              onRemoveConfirmed={onRemoveConfirmed}
            />
          )
        })}
      </div>
    </div>
  )
}

export default MonthCalendar
