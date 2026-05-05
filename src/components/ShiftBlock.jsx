import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

const SHIFT_META = {
  opening: { label: 'Opening', emoji: '🌅', color: 'var(--shift-opening)' },
  closing: { label: 'Closing', emoji: '🌙', color: 'var(--shift-closing)' },
  shared:  { label: 'Shared',  emoji: '☀️',  color: 'var(--shift-shared)' },
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
      <span className="shift-block__label">{meta.label}</span>
    </div>
  )
}

export default ShiftBlock
export { SHIFT_META }
