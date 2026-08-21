import { useState } from 'react'
import { fa, formatDate } from '../lib/jalali.js'
import { hasActivityOn, openCommitments } from '../lib/report.js'
import { bucketOf } from '../lib/constants.js'
import { insert, setTaskStatus, update } from '../lib/store.js'
import { Clock, Pin as PinIcon, Plus } from '../icons.jsx'
import { toast } from '../ui.jsx'

export default function Reminders({ db, today }) {
  const [showAll, setShowAll] = useState(false)
  const [note, setNote] = useState('')
  const [adding, setAdding] = useState(false)

  const commitments = openCommitments(db, today)
  const pins = (db.pinned_notes || []).filter((p) => !p.dismissed_at)
  const todaysMeetings = (db.meetings || [])
    .filter((m) => !m.cancelled_at && m.day === today)
    .slice()
    .sort((a, b) => (a.time_at || '').localeCompare(b.time_at || ''))
  const nothingToday = !hasActivityOn(db, today)
  const shown = showAll ? commitments : commitments.slice(0, 5)
  const quiet = !nothingToday && !commitments.length && !pins.length

  const addNote = () => {
    const t = note.trim()
    if (!t) return
    insert('pinned_notes', { text: t, created_at: new Date().toISOString(), dismissed_at: null })
    setNote('')
    setAdding(false)
    toast('یادداشت پین شد')
  }

  return (
    <section className={'remind' + (quiet ? ' remind-empty' : '')}>
      <h2>یادآور</h2>

      {todaysMeetings.length > 0 && (
        <>
          <div className="sub">جلسه‌های امروز</div>
          {todaysMeetings.map((m) => (
            <div className="meeting-today" key={m.id}>
              {m.time_at && (
                <span className="tm"><Clock size={12} />{m.time_at}</span>
              )}
              <span className="t">{m.title}</span>
            </div>
          ))}
        </>
      )}

      {nothingToday && (
        <div className="nothing-today">
          امروز هنوز چیزی ثبت نکردی — {formatDate(today, { weekday: true })}
        </div>
      )}

      {quiet && (
        <div className="small" style={{ color: '#166534' }}>
          تعهد بازی نداری و امروز هم ثبت کرده‌ای.
        </div>
      )}

      {commitments.length > 0 && (
        <>
          <div className="sub">
            تعهدهای باز — {fa(commitments.length)} تا
          </div>
          {shown.map((t) => {
            const b = bucketOf(t.bucket)
            return (
              <div className="commit" key={t.id}>
                <span className="dot" style={{ background: b.color }} title={b.label} />
                <span className="t">{t.title}</span>
                <span className={'age' + (t.daysOpen >= 7 ? ' hot' : '')}>
                  {t.daysOpen <= 0 ? 'امروز' : `${fa(t.daysOpen)} روز`}
                </span>
                <button
                  className="btn sm"
                  onClick={() => { setTaskStatus(t.id, 'done'); toast('بسته شد') }}
                >
                  بستن
                </button>
              </div>
            )
          })}
          {commitments.length > 5 && (
            <button className="btn ghost sm" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'کمتر' : `${fa(commitments.length - 5)} تای دیگر`}
            </button>
          )}
        </>
      )}

      {pins.length > 0 && <div className="sub">یادداشت‌های پین‌شده</div>}
      {pins.map((p) => (
        <div className="pin" key={p.id}>
          <PinIcon className="faint" size={14} />
          <span className="t">{p.text}</span>
          <button
            className="btn sm"
            onClick={() => update('pinned_notes', p.id, { dismissed_at: new Date().toISOString() })}
          >
            برداشتن
          </button>
        </div>
      ))}

      <div style={{ marginTop: 10 }}>
        {adding ? (
          <div className="row">
            <input
              className="grow"
              type="text"
              autoFocus
              value={note}
              placeholder="چیزی که باید یادم بماند…"
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addNote()
                if (e.key === 'Escape') { setAdding(false); setNote('') }
              }}
            />
            <button className="btn primary" onClick={addNote}>پین</button>
          </div>
        ) : (
          <button className="btn sm" onClick={() => setAdding(true)}><Plus size={13} /> یادداشت پین‌شده</button>
        )}
      </div>
    </section>
  )
}
