import { useState } from 'react'
import { WEEKDAYS_SHORT, addDays, daysBetween, fa, weekStart } from '../lib/jalali.js'
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

  const start = () => setForm({ title: '', day: today, time_at: '', repeat: null })

  const toggleRepeatDay = (idx) => {
    setForm((f) => {
      const days = f.repeat.days.includes(idx)
        ? f.repeat.days.filter((d) => d !== idx)
        : [...f.repeat.days, idx].sort()
      return { ...f, repeat: { ...f.repeat, days } }
    })
  }

  const canSave = form && form.title.trim().length > 0 && (!form.repeat || form.repeat.days.length > 0)

  const save = () => {
    if (!canSave) return
    const title = form.title.trim()
    const base = { title, time_at: form.time_at || null, note: null, cancelled_at: null }

    if (form.repeat && form.repeat.days.length > 0) {
      const weekBase = weekStart(form.day)
      const weeks = Math.max(1, Number(form.repeat.weeks) || 1)
      let count = 0
      for (let w = 0; w < weeks; w++) {
        for (const wd of form.repeat.days) {
          insert('meetings', { ...base, day: addDays(weekBase, w * 7 + wd), created_at: new Date().toISOString() })
          count++
        }
      }
      toast(`${fa(count)} جلسه ثبت شد`)
    } else {
      insert('meetings', { ...base, day: form.day, created_at: new Date().toISOString() })
      toast('جلسه ثبت شد')
    }
    setForm(null)
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

          {form.repeat ? (
            <div style={{ marginBottom: 10 }}>
              <span className="small muted" style={{ display: 'block', marginBottom: 4 }}>
                تکرار در این روزها
              </span>
              <div className="chips" style={{ marginBottom: 8 }}>
                {WEEKDAYS_SHORT.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    className={'chip' + (form.repeat.days.includes(i) ? ' on neutral' : '')}
                    onClick={() => toggleRepeatDay(i)}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="row" style={{ gap: 10, alignItems: 'flex-end' }}>
                <label className="field grow" style={{ marginBottom: 0 }}>
                  <span>چند هفته؟</span>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={form.repeat.weeks}
                    onChange={(e) => setForm({ ...form, repeat: { ...form.repeat, weeks: e.target.value } })}
                  />
                </label>
                <button className="btn sm ghost" onClick={() => setForm({ ...form, repeat: null })}>
                  بدون تکرار
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn sm ghost"
              style={{ marginBottom: 10 }}
              onClick={() => setForm({ ...form, repeat: { days: [], weeks: 1 } })}
            >
              تکرار در چند روز هفته
            </button>
          )}

          <div className="row">
            <button className="btn primary grow" onClick={save} disabled={!canSave}>ثبت جلسه</button>
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
