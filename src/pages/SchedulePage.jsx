import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { format, addMonths, subMonths } from 'date-fns'
import { db } from '../firebase/config'
import MonthCalendar from '../components/MonthCalendar'
import ShiftSidebar from '../components/ShiftSidebar'
import { SHIFT_META } from '../components/ShiftBlock'
import '../styles/Schedule.css'

function SchedulePage({ user, barista }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  // { [dateStr]: { opening: [{id, baristaId, baristaName}], closing: [...], shared: [...] } }
  const [confirmedByDate, setConfirmedByDate] = useState({})
  // { [dateStr]: { opening: true/false, closing: true/false, shared: true/false } }
  const [pendingShifts, setPendingShifts] = useState({})
  // Registered baristas list (scheduleUsers collection)
  const [baristas, setBaristas] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState(null) // { type: 'success'|'error', text }
  const [activeDragType, setActiveDragType] = useState(null) // for DragOverlay

  const monthKey = format(currentMonth, 'yyyy-MM')

  // ── Fetch confirmed schedule for the visible month ─────────────────────────
  const fetchSchedule = useCallback(async () => {
    setLoading(true)
    try {
      const q = query(
        collection(db, 'schedules'),
        where('month', '==', monthKey)
      )
      const snap = await getDocs(q)
      const byDate = {}
      snap.forEach((d) => {
        const data = d.data()
        const { date, shiftType, baristaId, baristaName } = data
        if (!byDate[date]) byDate[date] = {}
        if (!byDate[date][shiftType]) byDate[date][shiftType] = []
        byDate[date][shiftType].push({ id: d.id, baristaId, baristaName })
      })
      setConfirmedByDate(byDate)
    } catch (err) {
      console.error('Error fetching schedule:', err)
    } finally {
      setLoading(false)
    }
  }, [monthKey])

  // ── Fetch registered baristas (scheduleUsers) ──────────────────────────────
  const fetchBaristas = useCallback(async () => {
    setRefreshing(true)
    try {
      const snap = await getDocs(collection(db, 'scheduleUsers'))
      setBaristas(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    } catch (err) {
      console.error('Error fetching baristas:', err)
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchSchedule()
  }, [fetchSchedule])

  useEffect(() => {
    fetchBaristas()
  }, [fetchBaristas])

  // Clear pending when month changes
  useEffect(() => {
    setPendingShifts({})
  }, [monthKey])

  // ── Drag-and-drop handlers ─────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragStart = ({ active }) => {
    const shiftType = active.id.replace('drag-', '')
    setActiveDragType(shiftType)
  }

  const handleDragEnd = ({ active, over }) => {
    setActiveDragType(null)
    if (!over) return

    const shiftType = active.id.replace('drag-', '')   // 'opening' | 'closing' | 'shared'
    const dateStr   = over.id.replace('drop-', '')      // 'yyyy-MM-dd'

    // Validate the drop target looks like a date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return

    // Don't add if already confirmed by this user for this date+type
    const alreadyConfirmed = (confirmedByDate[dateStr]?.[shiftType] || []).some(
      (e) => e.baristaId === user.uid
    )
    if (alreadyConfirmed) return

    // Warn if shared shift on a non-preferred day (Mon–Thu)
    if (shiftType === 'shared') {
      const dropDate = new Date(dateStr + 'T12:00:00')
      const dow = dropDate.getDay() // 0=Sun, 5=Fri, 6=Sat
      if (![0, 5, 6].includes(dow)) {
        showStatus('error', 'Heads up: shared shifts are preferred on Fri, Sat & Sun.')
      }
    }

    setPendingShifts((prev) => {
      const dayPending = prev[dateStr] || {}
      if (dayPending[shiftType]) return prev  // already pending — no-op
      return { ...prev, [dateStr]: { ...dayPending, [shiftType]: true } }
    })
  }

  // ── Remove pending (before confirm) ───────────────────────────────────────
  const handleRemovePending = (dateStr, shiftType) => {
    setPendingShifts((prev) => {
      const updated = { ...prev }
      if (updated[dateStr]) {
        const { [shiftType]: _, ...rest } = updated[dateStr]
        if (Object.keys(rest).length === 0) {
          delete updated[dateStr]
        } else {
          updated[dateStr] = rest
        }
      }
      return updated
    })
  }

  // ── Remove confirmed shift (own only) ─────────────────────────────────────
  const handleRemoveConfirmed = async (scheduleDocId) => {
    try {
      await deleteDoc(doc(db, 'schedules', scheduleDocId))
      await fetchSchedule()
    } catch (err) {
      console.error('Error removing shift:', err)
      showStatus('error', 'Could not remove shift. Please try again.')
    }
  }

  // ── Confirm: write all pending shifts to Firestore in a batch ─────────────
  const handleConfirm = async () => {
    const entries = []
    for (const [dateStr, shifts] of Object.entries(pendingShifts)) {
      for (const [shiftType, isPending] of Object.entries(shifts)) {
        if (!isPending) continue
        entries.push({ dateStr, shiftType })
      }
    }

    if (entries.length === 0) {
      showStatus('error', 'No pending shifts to confirm.')
      return
    }

    setSaving(true)
    try {
      const batch = writeBatch(db)
      for (const { dateStr, shiftType } of entries) {
        const newRef = doc(collection(db, 'schedules'))
        batch.set(newRef, {
          date: dateStr,
          month: dateStr.substring(0, 7),
          shiftType,
          baristaId: user.uid,
          baristaName: barista.baristaName,
          status: 'confirmed',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }
      await batch.commit()
      setPendingShifts({})
      await fetchSchedule()
      showStatus('success', `${entries.length} shift${entries.length > 1 ? 's' : ''} confirmed!`)
    } catch (err) {
      console.error('Error confirming schedule:', err)
      showStatus('error', 'Could not save schedule. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const showStatus = (type, text) => {
    setStatusMsg({ type, text })
    setTimeout(() => setStatusMsg(null), 4000)
  }

  const pendingCount = Object.values(pendingShifts).reduce(
    (sum, day) => sum + Object.values(day).filter(Boolean).length,
    0
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="schedule-layout">
        <ShiftSidebar
          baristas={baristas}
          onRefresh={fetchBaristas}
          refreshing={refreshing}
        />

        <main className="schedule-main">
          {/* Month navigation */}
          <div className="schedule-nav">
            <button
              className="nav-btn"
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              aria-label="Previous month"
            >
              ‹
            </button>
            <h2 className="schedule-month-title">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <button
              className="nav-btn"
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          {/* Calendar */}
          {loading ? (
            <div className="schedule-loading">Loading schedule…</div>
          ) : (
            <MonthCalendar
              currentMonth={currentMonth}
              confirmedByDate={confirmedByDate}
              pendingShifts={pendingShifts}
              currentUserId={user.uid}
              onRemovePending={handleRemovePending}
              onRemoveConfirmed={handleRemoveConfirmed}
            />
          )}

          {/* Confirm bar */}
          <div className="schedule-confirm-bar">
            {statusMsg && (
              <span className={`status-msg status-msg--${statusMsg.type}`}>
                {statusMsg.text}
              </span>
            )}
            <button
              className="btn-confirm"
              onClick={handleConfirm}
              disabled={saving || pendingCount === 0}
            >
              {saving
                ? 'Saving…'
                : pendingCount > 0
                ? `Confirm ${pendingCount} shift${pendingCount > 1 ? 's' : ''}`
                : 'Confirm Schedule'}
            </button>
          </div>
        </main>
      </div>

      {/* Drag overlay — ghost block following the cursor */}
      <DragOverlay>
        {activeDragType ? (
          <div className={`shift-block shift-block--${activeDragType} shift-block--overlay`}>
            <span className="shift-block__emoji">{SHIFT_META[activeDragType].emoji}</span>
            <span className="shift-block__label">{SHIFT_META[activeDragType].label}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export default SchedulePage
