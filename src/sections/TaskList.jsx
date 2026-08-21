import { useMemo, useState } from 'react'
import { BUCKETS, STATUSES, statusLabel } from '../lib/constants.js'
import { fa, formatDate, minutesToHM, rangeLabel, todayISO } from '../lib/jalali.js'
import { buildReport, dailyBreakdown, liveTasks, taskTotalMinutes } from '../lib/report.js'
import { addTimeLog, archiveTask, setTaskStatus, unarchiveTask, update } from '../lib/store.js'
import { Plus } from '../icons.jsx'
import { Card, toast } from '../ui.jsx'
import { usePersisted } from '../useStore.js'

export default function TaskList({ db, range, today }) {
  const [f, setF] = usePersisted('wt.filters', {
    bucket: '', category: '', project: '', status: '', showOpen: true, showArchived: false,
  })
  const [openId, setOpenId] = useState(null)
  const [logFor, setLogFor] = useState(null)
  const [logMin, setLogMin] = useState('')

  const catById = useMemo(() => new Map((db.categories || []).map((c) => [c.id, c])), [db.categories])
  const projById = useMemo(() => new Map((db.projects || []).map((p) => [p.id, p])), [db.projects])

  const rows = useMemo(() => {
    const rep = buildReport(db, range)
    const map = new Map(rep.tasks.map((t) => [t.id, t]))

    // کارهای بازِ خارج از بازه هم دیده شوند، وگرنه گم می‌شوند
    if (f.showOpen) {
      for (const t of liveTasks(db)) {
        if (t.status === 'open' && !map.has(t.id)) {
          map.set(t.id, { ...t, minutes: 0, logCount: 0, dayCount: 0, outside: true })
        }
      }
    }
    if (f.showArchived) {
      for (const t of db.tasks || []) {
        if (t.archived_at && !map.has(t.id)) {
          map.set(t.id, { ...t, minutes: 0, logCount: 0, dayCount: 0, outside: true })
        }
      }
    }

    return [...map.values()].filter((t) => {
      if (f.bucket && t.bucket !== f.bucket) return false
      if (f.category && t.category_id !== f.category) return false
      if (f.project && (t.project_id || '') !== f.project) return false
      if (f.status && t.status !== f.status) return false
      return true
    })
  }, [db, range, f])

  const catsForFilter = (db.categories || []).filter(
    (c) => c.is_active !== false && (!f.bucket || c.bucket === f.bucket)
  )
  const projsForFilter = (db.projects || []).filter(
    (p) => p.status !== 'done' && (!f.bucket || p.bucket === f.bucket)
  )

  const doLog = (taskId) => {
    addTimeLog(taskId, today, logMin, null)
    setLogFor(null)
    setLogMin('')
    toast('زمان امروز ثبت شد')
  }

  return (
    <Card n={7} title="کارها" right={<span className="small faint">{fa(rows.length)}</span>}>
      <div className="chips" style={{ marginBottom: 8 }}>
        <button
          className={'chip' + (!f.bucket ? ' on neutral' : '')}
          onClick={() => setF({ ...f, bucket: '', category: '', project: '' })}
        >
          همه
        </button>
        {BUCKETS.map((b) => (
          <button
            key={b.id}
            className={'chip' + (f.bucket === b.id ? ' on ' + b.id : '')}
            onClick={() => setF({ ...f, bucket: f.bucket === b.id ? '' : b.id, category: '', project: '' })}
          >
            {b.short}
          </button>
        ))}
      </div>

      <div className="cols3" style={{ marginBottom: 8 }}>
        <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          <option value="">همه‌ی دسته‌ها</option>
          {f.bucket
            ? catsForFilter.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))
            : BUCKETS.map((b) => {
                const bCats = catsForFilter.filter((c) => c.bucket === b.id)
                if (!bCats.length) return null
                return (
                  <optgroup key={b.id} label={b.label}>
                    {bCats.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </optgroup>
                )
              })}
        </select>
        <select value={f.project} onChange={(e) => setF({ ...f, project: e.target.value })}>
          <option value="">همه‌ی پروژه‌ها</option>
          {f.bucket
            ? projsForFilter.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))
            : BUCKETS.map((b) => {
                const bProjs = projsForFilter.filter((p) => p.bucket === b.id)
                if (!bProjs.length) return null
                return (
                  <optgroup key={b.id} label={b.label}>
                    {bProjs.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </optgroup>
                )
              })}
        </select>
        <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
          <option value="">همه‌ی وضعیت‌ها</option>
          {STATUSES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="row wrap" style={{ marginBottom: 10, gap: 14 }}>
        <label className="check small">
          <input
            type="checkbox"
            checked={f.showOpen}
            onChange={(e) => setF({ ...f, showOpen: e.target.checked })}
          />
          کارهای بازِ خارج از بازه
        </label>
        <label className="check small">
          <input
            type="checkbox"
            checked={f.showArchived}
            onChange={(e) => setF({ ...f, showArchived: e.target.checked })}
          />
          بایگانی‌شده‌ها
        </label>
      </div>

      {rows.length === 0 && (
        <div className="empty">در {rangeLabel(range.from, range.to)} کاری نیست.</div>
      )}

      {BUCKETS.map((b) => {
        const bRows = rows.filter((t) => t.bucket === b.id)
        if (!bRows.length) return null
        const bMin = bRows.reduce((s, t) => s + t.minutes, 0)
        const catIds = [...new Set(bRows.map((t) => t.category_id))].sort((x, y) => {
          const sx = bRows.filter((t) => t.category_id === x).reduce((s, t) => s + t.minutes, 0)
          const sy = bRows.filter((t) => t.category_id === y).reduce((s, t) => s + t.minutes, 0)
          return sy - sx
        })

        return (
          <div key={b.id}>
            <div className="group-head" style={{ background: b.soft, color: b.color }}>
              <span>{b.label}</span>
              <span className="grow" />
              <span className="val">{minutesToHM(bMin)} · {fa(bRows.length)}</span>
            </div>

            {catIds.map((cid) => {
              const cRows = bRows.filter((t) => t.category_id === cid)
              const cMin = cRows.reduce((s, t) => s + t.minutes, 0)
              const cat = catById.get(cid)
              return (
                <div key={cid || 'none'}>
                  <div className="cat-head">
                    <span>{cat ? cat.name : 'بدون دسته'}</span>
                    <span className="grow" />
                    <span className="nums">{minutesToHM(cMin)}</span>
                  </div>

                  {cRows
                    .sort((a, z) => z.minutes - a.minutes || (a.created_on < z.created_on ? 1 : -1))
                    .map((t) => {
                      const expanded = openId === t.id
                      const breakdown = expanded ? dailyBreakdown(db, t.id) : []
                      const allTime = expanded ? taskTotalMinutes(db, t.id) : null
                      const proj = t.project_id ? projById.get(t.project_id) : null

                      return (
                        <div className="task" key={t.id}>
                          <div className="task-top">
                            <div className="grow" style={{ minWidth: 0 }}>
                              <div className={'task-title ' + (t.status === 'done' ? 'done' : t.status === 'cancelled' ? 'cancelled' : '')}>
                                {t.title}
                              </div>
                              <div className="task-meta">
                                <span className={'pill ' + t.status}>{statusLabel(t.status)}</span>
                                {proj && <span>{proj.name}</span>}
                                {t.dayCount > 1 && <span>{fa(t.dayCount)} روز</span>}
                                {t.outside && <span>خارج از بازه</span>}
                                {t.archived_at && <span>بایگانی</span>}
                                <span>ساخته: {formatDate(t.created_on, { year: false })}</span>
                              </div>
                              {t.note && <div className="note-inline">{t.note}</div>}
                            </div>
                            <div style={{ textAlign: 'left' }}>
                              <div className="task-min">{t.minutes ? minutesToHM(t.minutes) : '—'}</div>
                            </div>
                          </div>

                          <div className="task-actions">
                            {logFor === t.id ? (
                              <>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  autoFocus
                                  value={logMin}
                                  placeholder="دقیقه (اختیاری)"
                                  onChange={(e) => setLogMin(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') doLog(t.id) }}
                                  style={{ width: 130, minHeight: 34, padding: '4px 9px', fontSize: 14 }}
                                />
                                <button className="btn sm primary" onClick={() => doLog(t.id)}>ثبت امروز</button>
                                <button className="btn sm ghost" onClick={() => { setLogFor(null); setLogMin('') }}>لغو</button>
                              </>
                            ) : (
                              <button className="btn sm" onClick={() => { setLogFor(t.id); setLogMin('') }}>
                                <Plus size={13} /> امروز هم روش وقت گذاشتم
                              </button>
                            )}
                            <button className="btn sm ghost" onClick={() => setOpenId(expanded ? null : t.id)}>
                              {expanded ? 'بستن' : 'جزئیات'}
                            </button>
                          </div>

                          {expanded && (
                            <div className="days">
                              <div className="row small muted" style={{ marginBottom: 4 }}>
                                <span className="grow">تفکیک روزانه</span>
                                <span className="nums">کل: {minutesToHM(allTime)}</span>
                              </div>
                              {breakdown.length === 0 && <div className="faint small">زمانی ثبت نشده.</div>}
                              {breakdown.map((l) => (
                                <div className="d" key={l.id}>
                                  <span>{formatDate(l.occurred_on, { weekday: true, year: false })}</span>
                                  <span className="grow" />
                                  <span className="v">{l.minutes ? minutesToHM(l.minutes) : 'بدون زمان'}</span>
                                </div>
                              ))}

                              <div className="hr" />
                              <div className="row wrap" style={{ gap: 6 }}>
                                {STATUSES.map((s) => (
                                  <button
                                    key={s.id}
                                    className={'chip' + (t.status === s.id ? ' on neutral' : '')}
                                    style={{ minHeight: 30, padding: '2px 11px', fontSize: 12.5 }}
                                    onClick={() => setTaskStatus(t.id, s.id)}
                                  >
                                    {s.label}
                                  </button>
                                ))}
                              </div>

                              <input
                                type="text"
                                placeholder="یادداشت این کار"
                                defaultValue={t.note || ''}
                                onBlur={(e) => {
                                  const v = e.target.value.trim() || null
                                  if (v !== (t.note || null)) update('tasks', t.id, { note: v })
                                }}
                                style={{ marginTop: 8, minHeight: 38, padding: '7px 10px', fontSize: 14 }}
                              />

                              <div style={{ marginTop: 8 }}>
                                {t.archived_at ? (
                                  <button className="btn sm" onClick={() => unarchiveTask(t.id)}>
                                    برگرداندن از بایگانی
                                  </button>
                                ) : (
                                  <button
                                    className="btn sm danger"
                                    onClick={() => { archiveTask(t.id); toast('بایگانی شد — داده پاک نشد') }}
                                  >
                                    بایگانی
                                  </button>
                                )}
                                <span className="small faint" style={{ marginInlineStart: 8 }}>
                                  حذف نداریم؛ بایگانی فقط از لیست برش می‌دارد.
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              )
            })}
          </div>
        )
      })}
    </Card>
  )
}
