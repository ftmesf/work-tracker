import { useState } from 'react'
import {
  eachDay, fa, formatDate, minutesToHM, monthRange, rangeLabel, weekRange,
} from '../lib/jalali.js'
import { attendanceSummary } from '../lib/report.js'
import { setAttendance } from '../lib/store.js'
import { Card } from '../ui.jsx'

export default function Attendance({ db, today, range }) {
  const [editing, setEditing] = useState(today)

  const week = attendanceSummary(db, weekRange(today))
  const month = attendanceSummary(db, monthRange(today))
  const inRange = attendanceSummary(db, range)

  const byDay = new Map((db.attendance || []).map((a) => [a.day, a]))
  const days = eachDay(range.from, range.to)
  const list = days.length <= 40 ? days : days.filter((d) => byDay.has(d) || d === today)
  if (!list.includes(today)) list.unshift(today)

  return (
    <Card n={4} title="حضور">
      <div className="stat-row" style={{ marginBottom: 12 }}>
        <div className="stat">
          <div className="v">{minutesToHM(week.minutes)}</div>
          <div className="k">این هفته</div>
        </div>
        <div className="stat">
          <div className="v">{minutesToHM(month.minutes)}</div>
          <div className="k">این ماه</div>
        </div>
        <div className="stat">
          <div className="v">{minutesToHM(inRange.minutes)}</div>
          <div className="k">بازه‌ی انتخابی</div>
        </div>
      </div>

      {list.map((d) => {
        const rec = byDay.get(d)
        const open = editing === d
        const hours =
          rec?.arrived_at && rec?.left_at
            ? attendanceSummary(db, { from: d, to: d }).minutes
            : null
        return (
          <div key={d}>
            <div className={'att-day' + (d === today ? ' today' : '')}>
              <span className="dname">{d === today ? 'امروز' : formatDate(d, { weekday: true, year: false })}</span>
              <span className="grow">
                {rec ? (
                  <span className={'pill ' + (rec.at_office ? 'done' : '')}>
                    {rec.at_office ? 'شرکت بودم' : 'نبودم'}
                  </span>
                ) : (
                  <span className="faint small">ثبت نشده</span>
                )}
                {hours != null && (
                  <span className="small muted nums" style={{ marginInlineStart: 8 }}>
                    {minutesToHM(hours)}
                  </span>
                )}
              </span>
              <button className="btn sm ghost" onClick={() => setEditing(open ? null : d)}>
                {open ? 'بستن' : 'ویرایش'}
              </button>
            </div>

            {open && (
              <div style={{ padding: '8px 0 12px' }}>
                <div className="chips" style={{ marginBottom: 8 }}>
                  <button
                    className={'chip' + (rec?.at_office === true ? ' on company' : '')}
                    onClick={() => setAttendance(d, { at_office: true })}
                  >
                    شرکت بودم
                  </button>
                  <button
                    className={'chip' + (rec?.at_office === false ? ' on neutral' : '')}
                    onClick={() => setAttendance(d, { at_office: false })}
                  >
                    نبودم
                  </button>
                </div>
                <div className="cols2">
                  <label className="field">
                    <span>ساعت ورود</span>
                    <input
                      type="time"
                      value={rec?.arrived_at?.slice(0, 5) || ''}
                      onChange={(e) => setAttendance(d, { arrived_at: e.target.value || null })}
                    />
                  </label>
                  <label className="field">
                    <span>ساعت خروج</span>
                    <input
                      type="time"
                      value={rec?.left_at?.slice(0, 5) || ''}
                      onChange={(e) => setAttendance(d, { left_at: e.target.value || null })}
                    />
                  </label>
                </div>
                {rec?.arrived_at && rec?.left_at && rec.left_at <= rec.arrived_at && (
                  <div className="small" style={{ color: 'var(--danger)', margin: '6px 0' }}>
                    ساعت خروج باید بعد از ساعت ورود باشد — این روز در جمع ساعت‌ها حساب نمی‌شود.
                  </div>
                )}
                <input
                  type="text"
                  placeholder="یادداشت (اختیاری)"
                  value={rec?.note || ''}
                  onChange={(e) => setAttendance(d, { note: e.target.value || null })}
                />
              </div>
            )}
          </div>
        )
      })}

      <div className="small faint" style={{ marginTop: 8 }}>
        روزهای {rangeLabel(range.from, range.to)} · {fa(inRange.officeDays)} روز شرکت
      </div>
    </Card>
  )
}
