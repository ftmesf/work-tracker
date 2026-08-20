import { useState } from 'react'
import { fa, formatDate, todayISO } from '../lib/jalali.js'
import { insert, update } from '../lib/store.js'
import { Plus } from '../icons.jsx'
import { Fold, toast } from '../ui.jsx'

export default function Blockers({ db }) {
  const [showResolved, setShowResolved] = useState(false)
  const [form, setForm] = useState(null)

  const all = db.blockers || []
  const open = all.filter((b) => !b.resolved_on)
  const resolved = all.filter((b) => b.resolved_on)

  const save = () => {
    const title = (form.title || '').trim()
    if (!title) return
    insert('blockers', {
      title,
      detail: form.detail?.trim() || null,
      needs_decision: form.needs_decision?.trim() || null,
      opened_on: todayISO(),
      resolved_on: null,
    })
    setForm(null)
    toast('مانع اضافه شد')
  }

  const Row = ({ b }) => (
    <div className={'blocker' + (b.resolved_on ? ' resolved' : '')}>
      <div className="row">
        <span className="bt grow">{b.title}</span>
        <button
          className="btn sm"
          onClick={() =>
            update('blockers', b.id, { resolved_on: b.resolved_on ? null : todayISO() })
          }
        >
          {b.resolved_on ? 'باز کن' : 'حل شد'}
        </button>
      </div>
      {b.detail && <div className="small muted" style={{ marginTop: 3 }}>{b.detail}</div>}
      {b.needs_decision && <div className="need">نیاز به تصمیم: {b.needs_decision}</div>}
      <div className="small faint" style={{ marginTop: 4 }}>
        باز شد: {formatDate(b.opened_on, { year: false })}
        {b.resolved_on && ` · حل شد: ${formatDate(b.resolved_on, { year: false })}`}
      </div>
    </div>
  )

  return (
    <Fold n={10} id="blockers" title={`موانع${open.length ? ` — ${fa(open.length)} باز` : ''}`}>
      {open.length === 0 && <div className="empty">مانع بازی نیست.</div>}
      {open.map((b) => <Row key={b.id} b={b} />)}

      {form ? (
        <div style={{ marginTop: 8 }}>
          <label className="field">
            <span>مانع چیست؟</span>
            <input
              type="text"
              autoFocus
              value={form.title || ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label className="field">
            <span>توضیح (اختیاری)</span>
            <input
              type="text"
              value={form.detail || ''}
              onChange={(e) => setForm({ ...form, detail: e.target.value })}
            />
          </label>
          <label className="field">
            <span>نیاز به تصمیم (اختیاری)</span>
            <input
              type="text"
              value={form.needs_decision || ''}
              onChange={(e) => setForm({ ...form, needs_decision: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') save() }}
            />
          </label>
          <div className="row">
            <button className="btn primary grow" onClick={save}>اضافه کن</button>
            <button className="btn ghost" onClick={() => setForm(null)}>لغو</button>
          </div>
        </div>
      ) : (
        <button className="btn sm" style={{ marginTop: 8 }} onClick={() => setForm({})}>
          <Plus size={13} /> مانع جدید
        </button>
      )}

      {resolved.length > 0 && (
        <>
          <div className="hr" />
          <button className="btn ghost sm" onClick={() => setShowResolved(!showResolved)}>
            {showResolved ? 'پنهان کن' : `${fa(resolved.length)} مانع حل‌شده`}
          </button>
          {showResolved && <div style={{ marginTop: 8 }}>{resolved.map((b) => <Row key={b.id} b={b} />)}</div>}
        </>
      )}
    </Fold>
  )
}
