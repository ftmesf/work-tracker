import { useMemo } from 'react'
import {
  WEEKDAYS_SHORT, addDays, fa, formatDate, isoToJalali, minutesToHM, weekStart,
} from '../lib/jalali.js'
import { Fold } from '../ui.jsx'

const WEEKS = 18

function levelOf(minutes, max) {
  if (!minutes || !max) return 0
  const r = minutes / max
  if (r > 0.75) return 4
  if (r > 0.5) return 3
  if (r > 0.25) return 2
  return 1
}

export default function Heatmap({ db, today }) {
  const { weeks, minutesByDay, max, totalMinutes, activeDays, realDayCount } = useMemo(() => {
    const start = weekStart(addDays(today, -(WEEKS - 1) * 7))
    const end = addDays(weekStart(today), 6)

    const minutesByDay = new Map()
    for (const l of db.time_logs || []) {
      if (l.occurred_on < start || l.occurred_on > today) continue
      minutesByDay.set(l.occurred_on, (minutesByDay.get(l.occurred_on) || 0) + (l.minutes || 0))
    }

    const days = []
    for (let d = start; d <= end; d = addDays(d, 1)) days.push(d)
    const weeks = []
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))

    const max = Math.max(0, ...minutesByDay.values())
    let totalMinutes = 0
    let activeDays = 0
    for (const v of minutesByDay.values()) { totalMinutes += v; if (v > 0) activeDays += 1 }
    const realDayCount = days.filter((d) => d <= today).length

    return { weeks, minutesByDay, max, totalMinutes, activeDays, realDayCount }
  }, [db.time_logs, today])

  let lastMonth = null

  return (
    <Fold n={11} id="heatmap" title="نقشهٔ فعالیت">
      <div className="small muted" style={{ marginBottom: 10 }}>
        {fa(activeDays)} روز فعال از {fa(realDayCount)} روز اخیر · {minutesToHM(totalMinutes)}
      </div>

      <div className="hm-wrap">
        <div className="hm-week hm-labels">
          <div className="hm-mlabel" />
          {WEEKDAYS_SHORT.map((d, i) => (
            <div key={i} className="hm-daylabel">{d}</div>
          ))}
        </div>

        {weeks.map((week, wi) => {
          const jm = isoToJalali(week[0]).jm
          const showLabel = jm !== lastMonth
          lastMonth = jm
          return (
            <div className="hm-week" key={wi}>
              <div className="hm-mlabel">{showLabel ? MONTH_SHORT(week[0]) : ''}</div>
              {week.map((d) => {
                if (d > today) return <div key={d} className="hm-cell empty" />
                const minutes = minutesByDay.get(d) || 0
                const level = levelOf(minutes, max)
                return (
                  <div
                    key={d}
                    className="hm-cell"
                    data-level={level}
                    title={`${formatDate(d, { weekday: true })} — ${minutes ? minutesToHM(minutes) : 'بدون فعالیت'}`}
                  />
                )
              })}
            </div>
          )
        })}
      </div>

      <div className="hm-legend">
        <span>کمتر</span>
        {[0, 1, 2, 3, 4].map((lv) => (
          <div key={lv} className="hm-cell" data-level={lv} />
        ))}
        <span>بیشتر</span>
      </div>
    </Fold>
  )
}

const JALALI_MONTHS_SHORT = [
  'فرو', 'ارد', 'خرد', 'تیر', 'مرد', 'شهر', 'مهر', 'آبا', 'آذر', 'دی', 'بهم', 'اسف',
]
function MONTH_SHORT(iso) {
  return JALALI_MONTHS_SHORT[isoToJalali(iso).jm - 1]
}
