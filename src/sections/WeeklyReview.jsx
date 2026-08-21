import { useEffect, useMemo, useState } from 'react'
import { fa, minutesToHM, rangeLabel } from '../lib/jalali.js'
import { buildReport, categoryComparison, coldCategories } from '../lib/report.js'
import { insert, update } from '../lib/store.js'
import { Fold, toast } from '../ui.jsx'

export default function WeeklyReview({ db, range, today }) {
  const existing = (db.reviews || []).find(
    (r) => r.range_from === range.from && r.range_to === range.to
  )
  const [wins, setWins] = useState(existing?.wins || '')
  const [stuck, setStuck] = useState(existing?.stuck || '')
  const [next, setNext] = useState(existing?.next || '')

  useEffect(() => {
    setWins(existing?.wins || '')
    setStuck(existing?.stuck || '')
    setNext(existing?.next || '')
  }, [range.from, range.to])

  const r = useMemo(() => buildReport(db, range), [db.tasks, db.time_logs, db.categories, db.projects, range.from, range.to])
  const cmp = useMemo(() => categoryComparison(db, range), [db.tasks, db.time_logs, db.categories, range.from, range.to])
  const mover = cmp.rows.find((x) => x.prevMinutes > 0 && x.curMinutes > 0)
  const cold = useMemo(() => coldCategories(db, range, today), [db.categories, db.tasks, db.time_logs, range.from, range.to, today])
  const openBlockers = (db.blockers || []).filter((b) => !b.resolved_on)
  const topCats = r.byCategory.slice(0, 3)

  const save = () => {
    if (existing) {
      update('reviews', existing.id, { wins, stuck, next })
    } else {
      insert('reviews', {
        range_from: range.from,
        range_to: range.to,
        wins,
        stuck,
        next,
        created_at: new Date().toISOString(),
      })
    }
    toast('مرور ذخیره شد')
  }

  return (
    <Fold n={12} id="review" title={`مرور — ${rangeLabel(range.from, range.to)}`}>
      <div className="review-context">
        <div className="small muted">
          جمع این بازه: {minutesToHM(r.totalMinutes)} · {fa(r.totalTasks)} کار
        </div>
        {topCats.length > 0 && (
          <div className="small">بیشترین زمان: {topCats.map((c) => c.name).join('، ')}</div>
        )}
        {mover && (
          <div className="small">
            {mover.name} نسبت به بازه‌ی قبل {mover.delta > 0 ? '+' : ''}
            {fa(Math.round(mover.pct))}٪ تغییر کرد
          </div>
        )}
        {cold.length > 0 && <div className="small">{fa(cold.length)} دسته‌ی فعال، سرد مانده</div>}
        {openBlockers.length > 0 && <div className="small">{fa(openBlockers.length)} مانع باز</div>}
      </div>

      <label className="field" style={{ marginTop: 12 }}>
        <span>چی خوب پیش رفت؟</span>
        <textarea rows={2} value={wins} onChange={(e) => setWins(e.target.value)} />
      </label>
      <label className="field">
        <span>کجا گیر کردیم؟</span>
        <textarea rows={2} value={stuck} onChange={(e) => setStuck(e.target.value)} />
      </label>
      <label className="field">
        <span>هفته‌ی بعد چی؟</span>
        <textarea rows={2} value={next} onChange={(e) => setNext(e.target.value)} />
      </label>

      <button className="btn primary full" onClick={save}>
        {existing ? 'به‌روزرسانی مرور' : 'ذخیره‌ی مرور'}
      </button>
    </Fold>
  )
}
