import ShiftBlock from './ShiftBlock'

function ShiftSidebar({ baristas, onRefresh, refreshing }) {
  return (
    <aside className="shift-sidebar">
      <h3 className="sidebar-title">Shift Types</h3>
      <p className="sidebar-hint">Drag a block onto any day</p>

      <div className="shift-blocks">
        <ShiftBlock shiftType="opening" />
        <ShiftBlock shiftType="closing" />
        <ShiftBlock shiftType="shared" />
      </div>

      <div className="sidebar-divider" />

      <div className="sidebar-baristas">
        <div className="sidebar-baristas__header">
          <h3 className="sidebar-title">Baristas</h3>
          <button
            className="refresh-btn"
            onClick={onRefresh}
            disabled={refreshing}
            title="Refresh barista list"
            aria-label="Refresh barista list"
          >
            {refreshing ? '…' : '↻'}
          </button>
        </div>

        {baristas.length === 0 ? (
          <p className="no-baristas">No baristas found</p>
        ) : (
          <ul className="barista-list">
            {baristas.map((b) => (
              <li key={b.id} className="barista-list__item">
                <span
                  className="barista-avatar"
                  style={{ background: nameToColor(b.baristaName) }}
                >
                  {b.baristaName.charAt(0).toUpperCase()}
                </span>
                {b.baristaName}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}

// Deterministic colour from a name string
function nameToColor(name) {
  const palette = [
    '#b45309', '#92400e', '#065f46', '#1e40af',
    '#6d28d9', '#be185d', '#0e7490', '#4d7c0f',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return palette[Math.abs(hash) % palette.length]
}

export default ShiftSidebar
export { nameToColor }
