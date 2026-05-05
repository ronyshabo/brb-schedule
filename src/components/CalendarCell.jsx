import { useDroppable } from '@dnd-kit/core'
import { nameToColor } from './ShiftSidebar'
import { SHIFT_META } from './ShiftBlock'

function CalendarCell({ date, dateStr, isCurrentMonth, confirmedShifts, pendingShifts, currentUserId, onRemovePending, onRemoveConfirmed }) {
  const { isOver, setNodeRef } = useDroppable({ id: `drop-${dateStr}` })

  const today = new Date()
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()

  const shiftOrder = ['opening', 'closing', 'shared']

  return (
    <div
      ref={setNodeRef}
      className={[
        'calendar-cell',
        !isCurrentMonth && 'calendar-cell--outside',
        isToday && 'calendar-cell--today',
        isOver && 'calendar-cell--over',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="calendar-cell__day">{date.getDate()}</span>

      <div className="calendar-cell__chips">
        {shiftOrder.map((shiftType) => {
          const confirmed = (confirmedShifts[shiftType] || [])
          const isPending = pendingShifts[shiftType] === true

          return (
            <div key={shiftType} className="chip-row">
              {/* Confirmed chips */}
              {confirmed.map((entry) => (
                <ShiftChip
                  key={entry.id}
                  shiftType={shiftType}
                  name={entry.baristaName}
                  isPending={false}
                  canRemove={entry.baristaId === currentUserId}
                  onRemove={() => onRemoveConfirmed(entry.id)}
                />
              ))}

              {/* Pending chip (current user's unconfirmed pick) */}
              {isPending && (
                <ShiftChip
                  shiftType={shiftType}
                  name="You"
                  isPending={true}
                  canRemove={true}
                  onRemove={() => onRemovePending(dateStr, shiftType)}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ShiftChip({ shiftType, name, isPending, canRemove, onRemove }) {
  const meta = SHIFT_META[shiftType]
  return (
    <div
      className={[
        'shift-chip',
        `shift-chip--${shiftType}`,
        isPending && 'shift-chip--pending',
      ]
        .filter(Boolean)
        .join(' ')}
      title={`${meta.label}: ${name}`}
    >
      <span className="shift-chip__emoji">{meta.emoji}</span>
      <span
        className="shift-chip__avatar"
        style={{ background: nameToColor(name) }}
      >
        {name.charAt(0).toUpperCase()}
      </span>
      {canRemove && (
        <button
          className="shift-chip__remove"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          aria-label={`Remove ${shiftType} shift`}
        >
          ×
        </button>
      )}
    </div>
  )
}

export default CalendarCell
