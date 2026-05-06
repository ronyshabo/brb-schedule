import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

const SHIFT_META = {
  opening: {
    label: 'Opening',
    emoji: '🌅',
    color: 'var(--shift-opening)',
    // Mon–Fri 8am–2pm, Sat–Sun 9am–2pm
    getTime: (dow) => (dow === 0 || dow === 6) ? '9am – 2pm' : '8am – 2pm',
    sidebarTime: 'M–F 8am–2pm · Sat–Sun 9am–2pm',
  },
  closing: {
    label: 'Closing',
    emoji: '🌙',
    color: 'var(--shift-closing)',
    getTime: () => '2pm – 9pm',
    sidebarTime: '2pm – 9pm',
  },
  shared: {
    label: 'Shared',
    emoji: '☀️',
    color: 'var(--shift-shared)',
    // Preferred Fri–Sun
    getTime: () => '12pm – 6pm',
    sidebarTime: 'Fri–Sun 12pm–6pm',
    preferredDays: [0, 5, 6], // Sun, Fri, Sat
  },
}

function ShiftBlock({ shiftType }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `drag-${shiftType}`,
    data: { shiftType },
  })

  const meta = SHIFT_META[shiftType]

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`shift-block shift-block--${shiftType}`}
      {...listeners}
      {...attributes}
      aria-label={`Drag ${meta.label} shift to a calendar day`}
    >
      <span className="shift-block__emoji">{meta.emoji}</span>
      <div className="shift-block__info">
        <span className="shift-block__label">{meta.label}</span>
        <span className="shift-block__time">{meta.sidebarTime}</span>
      </div>
    </div>
  )
}

export default ShiftBlock
export { SHIFT_META }
