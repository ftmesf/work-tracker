import { fa, minutesToHM, rangeLabel } from '../lib/jalali.js'
import { bucketSplit } from '../lib/report.js'
import { ArrowDown } from '../icons.jsx'
import { Bar, Card } from '../ui.jsx'
import { usePersisted } from '../useStore.js'

export default function BucketSplit({ db, range }) {
  const [by, setBy] = usePersisted('wt.splitBy', 'minutes')
  const { rows, totalMinutes, totalTasks } = bucketSplit(db, range)
  const empty = totalMinutes === 0 && totalTasks === 0

  const val = (r) => (by === 'minutes' ? r.minutes : r.taskCount)
  const pct = (r) => (by === 'minutes' ? r.minutesPct : r.taskPct)
  const fmt = (r) => (by === 'minutes' ? minutesToHM(r.minutes) : `${fa(r.taskCount)} کار`)

  return (
    <Card
      n={5}
      title="تقسیم سه‌تایی"
      right={
        <div className="chips">
          <button
            className={'chip' + (by === 'minutes' ? ' on neutral' : '')}
            style={{ minHeight: 28, padding: '2px 10px', fontSize: 12 }}
            onClick={() => setBy('minutes')}
          >
            دقیقه
          </button>
          <button
            className={'chip' + (by === 'count' ? ' on neutral' : '')}
            style={{ minHeight: 28, padding: '2px 10px', fontSize: 12 }}
            onClick={() => setBy('count')}
          >
            تعداد
          </button>
        </div>
      }
    >
      <div className="row small muted" style={{ marginBottom: 10 }}>
        <span className="grow">{rangeLabel(range.from, range.to)}</span>
        <button
          className="btn ghost sm"
          onClick={() => document.getElementById('range')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
        >
          تغییر بازه <ArrowDown size={12} />
        </button>
      </div>

      {empty ? (
        <div className="empty">در این بازه رکوردی نیست.</div>
      ) : (
        <>
          <div className="split-bar">
            {rows.map((r) => (
              <i key={r.bucket} style={{ width: pct(r) + '%', background: r.color }} />
            ))}
          </div>

          {rows.map((r) => (
            <div className="bucket-row" key={r.bucket}>
              <div className="bucket-head">
                <span className="dot" style={{ background: r.color }} />
                <span className="name">{r.label}</span>
                <span className="grow" />
                <span className="val">{fmt(r)}</span>
                <span className="pct">{fa(Math.round(pct(r)))}٪</span>
              </div>
              <Bar pct={pct(r)} color={r.color} />
              {r.openCount > 0 && (
                <div className="small faint" style={{ marginTop: 3 }}>
                  {fa(r.openCount)} تعهد باز
                </div>
              )}
            </div>
          ))}

          <div className="hr" />
          <div className="row small muted">
            <span className="grow">جمع {rangeLabel(range.from, range.to)}</span>
            <span className="nums">{minutesToHM(totalMinutes)} · {fa(totalTasks)} کار</span>
          </div>
        </>
      )}
    </Card>
  )
}
