import { useState } from 'react'
import { daysBetween, fa } from '../lib/jalali.js'
import { insert, update } from '../lib/store.js'
import { Plus } from '../icons.jsx'
import { Card, DateField, toast } from '../ui.jsx'

function relLabel(today, day) {
  const n = daysBetween(today, day)
  if (n === 0) return 'امروز'
  if (n === 1) return 'فردا'
  if (n === 2) return 'پس‌فردا'
  return `${fa(n)} روز دیگر`
}

export default function Meetings({ db, today }) {
  const [form, setForm] = useState(null)

  const upcoming = (db.meetings || [])
    .filter((m) => !m.cancelled_at && m.day >= today)
    .slice()
    .sort((a, b) => (a.day + (a.time_at || '')).localeCompare(b.day + (b.time_at || '')))

  const start = () => setForm({ title: '', day: today, time_at: '' })

  const save = () => {
    const title = form.title.trim()
    if (!title) return
    insert('meetings', {
      title,
      day: form.day,
      time_at: form.time_at || null,
      note: null,
      created_at: new Date().toISOString(),
      cancelled_at: null,
    })
    setForm(null)
    toast('جلسه ثبت شد')
  }

  const cancel = (m) => {
    update('meetings', m.id, { cancelled_at: new Date().toISOString() })
    toast('جلسه لغو شد')
  }

  return (
    <Card n={2} title="جلسه‌ها" right={upcoming.length > 0 && <span className="small faint">{fa(upcoming.length)}</span>}>
      {upcoming.length === 0 && !form && <div className="empty">جلسه‌ی پیش‌رویی ثبت نشده.</div>}

      {upcoming.map((m) => (
        <div className="commit" key={m.id}>
          <span className="t">
            {m.title}
            {m.time_at && <span className="faint"> · {m.time_at}</span>}
          </span>
          <span className="age">{relLabel(today, m.day)}</span>
          <button className="btn sm" onClick={() => cancel(m)}>لغو</button>
        </div>
      ))}

      {form ? (
        <div style={{ marginTop: 8 }}>
          <label className="field">
            <span>موضوع جلسه</span>
            <input
              type="text"
              autoFocus
              value={form.title}
              placeholder="جلسه با چه کسی/درباره‌ی چه؟"
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') save() }}
            />
          </label>
          <div style={{ marginBottom: 10 }}>
            <DateField
              label="چه روزی؟"
              value={form.day}
              onChange={(day) => setForm({ ...form, day })}
            />
          </div>
          <label className="field">
            <span>ساعت (اختیاری)</span>
            <input
              type="time"
              value={form.time_at}
              onChange={(e) => setForm({ ...form, time_at: e.target.value })}
            />
          </label>
          <div className="row">
            <button className="btn primary grow" onClick={save}>ثبت جلسه</button>
            <button className="btn ghost" onClick={() => setForm(null)}>لغو</button>
          </div>
        </div>
      ) : (
        <button className="btn sm" style={{ marginTop: upcoming.length ? 8 : 0 }} onClick={start}>
          <Plus size={13} /> جلسه‌ی جدید
        </button>
      )}
    </Card>
  )
}
