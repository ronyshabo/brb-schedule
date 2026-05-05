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

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

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
        {DAY_LABELS.map((d) => (
          <div key={d} className="calendar-header__cell">
            {d}
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
