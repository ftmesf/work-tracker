import { bucketOf } from '../lib/constants.js'
import { fa, formatDate, rangeLabel } from '../lib/jalali.js'
import { coldCategories } from '../lib/report.js'
import { Fold } from '../ui.jsx'

export default function ColdCategories({ db, range, today }) {
  const cold = coldCategories(db, range, today)

  return (
    <Fold
      n={8}
      id="cold"
      title={`دسته‌های سرد${cold.length ? ` — ${fa(cold.length)}` : ''}`}
    >
      <div className="small muted" style={{ marginBottom: 8 }}>
        دسته‌هایی که در {rangeLabel(range.from, range.to)} هیچ رکوردی ندارند.
      </div>
      {cold.length === 0 ? (
        <div className="empty">همه‌ی دسته‌ها در این بازه رکورد دارند.</div>
      ) : (
        <table className="tbl">
          <tbody>
            {cold.map((c) => (
              <tr key={c.id}>
                <td className="name">
                  <span className="dot" style={{ background: bucketOf(c.bucket).color, marginInlineEnd: 6 }} />
                  {c.name}
                </td>
                <td className="num muted">
                  {c.daysUntouched == null
                    ? 'هیچ‌وقت'
                    : c.daysUntouched === 0
                      ? 'امروز'
                      : `${fa(c.daysUntouched)} روز`}
                </td>
                <td className="num faint small">
                  {c.lastTouched ? formatDate(c.lastTouched, { year: false }) : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Fold>
  )
}
