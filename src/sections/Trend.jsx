import { useMemo } from 'react'
import { BUCKETS } from '../lib/constants.js'
import { JALALI_MONTHS, fa, isoToJalali, jalaliMonthRange, minutesToHM, shiftMonth } from '../lib/jalali.js'
import { trend } from '../lib/report.js'
import { Fold } from '../ui.jsx'
import { usePersisted } from '../useStore.js'

export default function Trend({ db, today }) {
  const [count, setCount] = usePersisted('wt.trendMonths', 6)
  const [by, setBy] = usePersisted('wt.trendBy', 'minutes')

  const now = isoToJalali(today)
  const months = useMemo(() => {
    const arr = []
    for (let i = count - 1; i >= 0; i--) {
      const m = shiftMonth(now.jy, now.jm, -i)
      arr.push({ ...m, label: `${JALALI_MONTHS[m.jm - 1]} ${fa(m.jy)}`, ...jalaliMonthRange(m.jy, m.jm) })
    }
    return arr
  }, [now.jy, now.jm, count])
  const data = useMemo(() => trend(db, months), [db.tasks, db.time_logs, months])
  const total = (row) => (by === 'minutes' ? row.totalMinutes : row.totalTasks)
  const bVal = (b) => (by === 'minutes' ? b.minutes : b.taskCount)

  return (
    <Fold
      n={10}
      id="trend"
      title="روند سه سطل"
      right={
        <div className="chips">
          {[3, 6, 12].map((c) => (
            <button
              key={c}
              className={'chip' + (count === c ? ' on neutral' : '')}
              style={{ minHeight: 28, padding: '2px 9px', fontSize: 12 }}
              onClick={(e) => { e.stopPropagation(); setCount(c) }}
            >
              {fa(c)}
            </button>
          ))}
        </div>
      }
    >
      <div className="chips" style={{ marginBottom: 10 }}>
        <button
          className={'chip' + (by === 'minutes' ? ' on neutral' : '')}
          style={{ minHeight: 30, padding: '2px 12px', fontSize: 12.5 }}
          onClick={() => setBy('minutes')}
        >
          دقیقه
        </button>
        <button
          className={'chip' + (by === 'count' ? ' on neutral' : '')}
          style={{ minHeight: 30, padding: '2px 12px', fontSize: 12.5 }}
          onClick={() => setBy('count')}
        >
          تعداد کار
        </button>
      </div>

      {data.map((m) => {
        const t = total(m)
        return (
          <div className="trend-row" key={m.jy + '-' + m.jm}>
            <span className="m">{m.label}</span>
            <span className="grow">
              <div className="split-bar" style={{ marginBottom: 0, height: 10 }}>
                {t === 0 ? (
                  <i style={{ width: '100%', background: 'var(--line-soft)' }} />
                ) : (
                  m.buckets.map((b) => (
                    <i key={b.bucket} style={{ width: (bVal(b) / t) * 100 + '%', background: b.color }} />
                  ))
                )}
              </div>
            </span>
            <span className="v">{t === 0 ? '—' : by === 'minutes' ? minutesToHM(t) : fa(t)}</span>
          </div>
        )
      })}

      <div className="legend" style={{ marginTop: 10 }}>
        {BUCKETS.map((b) => (
          <span key={b.id}>
            <i className="dot" style={{ background: b.color }} />
            {b.label}
          </span>
        ))}
      </div>
    </Fold>
  )
}
