import { bucketOf } from '../lib/constants.js'
import { fa, minutesToHM, rangeLabel } from '../lib/jalali.js'
import { buildReport, categoryComparison } from '../lib/report.js'
import { Card } from '../ui.jsx'
import { usePersisted } from '../useStore.js'

function Table({ rows, total, showBucketDot }) {
  if (!rows.length) return <div className="empty">چیزی نیست.</div>
  const max = Math.max(...rows.map((r) => r.minutes), 1)
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>نام</th>
          <th className="num">زمان</th>
          <th className="num">کار</th>
          <th className="num">سهم</th>
          <th className="wbar" />
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const color = r.bucket ? bucketOf(r.bucket).color : '#94a3b8'
          return (
            <tr key={String(r.id ?? r.bucket)}>
              <td className="name">
                {showBucketDot && (
                  <span className="dot" style={{ background: color, marginInlineEnd: 6 }} />
                )}
                {r.name || r.label}
              </td>
              <td className="num">{r.minutes ? minutesToHM(r.minutes) : '—'}</td>
              <td className="num muted">{fa(r.taskCount)}</td>
              <td className="num muted">{total ? fa(Math.round((r.minutes / total) * 100)) + '٪' : '—'}</td>
              <td className="wbar">
                <div className="bar thin">
                  <i style={{ width: (r.minutes / max) * 100 + '%', background: color }} />
                </div>
              </td>
            </tr>
          )
        })}
        <tr className="total">
          <td>جمع</td>
          <td className="num">{minutesToHM(total)}</td>
          <td className="num" />
          <td className="num" />
          <td className="wbar" />
        </tr>
      </tbody>
    </table>
  )
}

function CompareTable({ rows, prevRange }) {
  const withData = rows.filter((r) => r.curMinutes || r.prevMinutes)
  if (!withData.length) return <div className="empty">داده‌ای برای مقایسه نیست.</div>
  return (
    <>
      <div className="small faint" style={{ marginBottom: 8 }}>
        نسبت به {rangeLabel(prevRange.from, prevRange.to)}
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th>دسته</th>
            <th className="num">این بازه</th>
            <th className="num">بازه‌ی قبل</th>
            <th className="num">تغییر</th>
          </tr>
        </thead>
        <tbody>
          {withData.map((r) => (
            <tr key={r.id}>
              <td className="name">{r.name}</td>
              <td className="num">{r.curMinutes ? minutesToHM(r.curMinutes) : '—'}</td>
              <td className="num muted">{r.prevMinutes ? minutesToHM(r.prevMinutes) : '—'}</td>
              <td className="num">
                {r.prevMinutes
                  ? (r.delta > 0 ? '+' : '') + fa(Math.round(r.pct)) + '٪'
                  : r.curMinutes
                    ? 'جدید'
                    : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

export default function TimeReport({ db, range }) {
  const [view, setView] = usePersisted('wt.reportView', 'category')
  const r = buildReport(db, range)
  const cmp = view === 'compare' ? categoryComparison(db, range) : null

  const views = {
    bucket: { label: 'سطل', rows: r.byBucket.filter((b) => b.minutes || b.taskCount) },
    category: { label: 'دسته', rows: r.byCategory },
    project: { label: 'پروژه', rows: r.byProject },
    compare: { label: 'مقایسه' },
  }

  return (
    <Card
      n={8}
      title={`زمان — ${rangeLabel(range.from, range.to)}`}
      right={
        <div className="chips">
          {Object.entries(views).map(([k, v]) => (
            <button
              key={k}
              className={'chip' + (view === k ? ' on neutral' : '')}
              style={{ minHeight: 28, padding: '2px 10px', fontSize: 12 }}
              onClick={() => setView(k)}
            >
              {v.label}
            </button>
          ))}
        </div>
      }
    >
      {view === 'compare' ? (
        <CompareTable rows={cmp.rows} prevRange={cmp.prevRange} />
      ) : (
        <Table rows={views[view].rows} total={r.totalMinutes} showBucketDot={view !== 'bucket'} />
      )}
      {view !== 'compare' && r.tasks.some((t) => t.noMinutesCount > 0) && (
        <div className="small faint" style={{ marginTop: 8 }}>
          بعضی رکوردها دقیقه ندارند — در تعداد هستند، در جمع زمان نه.
        </div>
      )}
    </Card>
  )
}
