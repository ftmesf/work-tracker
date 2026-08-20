import { useState } from 'react'
import {
  addDays, eachDay, fa, isoToJalali, jalaliMonthRange, monthRange, rangeLabel,
  shiftMonth, todayISO, weekRange,
} from '../lib/jalali.js'
import { ArrowLeft, ArrowRight } from '../icons.jsx'
import { Card, JalaliCalendar } from '../ui.jsx'

export default function RangeBar({ range, setRange }) {
  const [picking, setPicking] = useState(null) // 'from' | 'to' | null
  const today = todayISO()
  const days = eachDay(range.from, range.to).length

  const step = (dir) => {
    if (range.mode === 'week') {
      const from = addDays(range.from, dir * 7)
      setRange({ mode: 'week', from, to: addDays(from, 6) })
    } else if (range.mode === 'month') {
      const { jy, jm } = isoToJalali(range.from)
      const n = shiftMonth(jy, jm, dir)
      setRange({ mode: 'month', ...jalaliMonthRange(n.jy, n.jm) })
    } else {
      const len = days
      setRange({ ...range, from: addDays(range.from, dir * len), to: addDays(range.to, dir * len) })
    }
  }

  const isCurrent =
    (range.mode === 'week' && range.from === weekRange(today).from) ||
    (range.mode === 'month' && range.from === monthRange(today).from)

  return (
    <Card n={5} title="بازه" id="range">
      <div className="chips" style={{ marginBottom: 10 }}>
        <button
          className={'chip' + (range.mode === 'week' ? ' on neutral' : '')}
          onClick={() => setRange({ mode: 'week', ...weekRange(today) })}
        >
          هفته
        </button>
        <button
          className={'chip' + (range.mode === 'month' ? ' on neutral' : '')}
          onClick={() => setRange({ mode: 'month', ...monthRange(today) })}
        >
          ماه
        </button>
        <button
          className={'chip' + (range.mode === 'custom' ? ' on neutral' : '')}
          onClick={() => setRange({ ...range, mode: 'custom' })}
        >
          دلخواه
        </button>
        {!isCurrent && range.mode !== 'custom' && (
          <button
            className="chip"
            onClick={() =>
              setRange(
                range.mode === 'week'
                  ? { mode: 'week', ...weekRange(today) }
                  : { mode: 'month', ...monthRange(today) }
              )
            }
          >
            برگرد به حالا
          </button>
        )}
      </div>

      <div className="range-nav">
        {/* در RTL اولین فرزند سمت راست می‌نشیند = گذشته */}
        <button className="btn arrow" onClick={() => step(-1)} aria-label="بازه‌ی قبلی"><ArrowRight /></button>
        <div className="label">{rangeLabel(range.from, range.to)}</div>
        <button className="btn arrow" onClick={() => step(1)} aria-label="بازه‌ی بعدی"><ArrowLeft /></button>
      </div>

      <div className="small muted" style={{ textAlign: 'center' }}>
        {fa(days)} روز
        {range.mode === 'week' && ' · از شنبه تا جمعه'}
      </div>

      {range.mode === 'custom' && (
        <div style={{ marginTop: 10 }}>
          <div className="cols2">
            <button
              className={'btn' + (picking === 'from' ? ' primary' : '')}
              onClick={() => setPicking(picking === 'from' ? null : 'from')}
            >
              از: {rangeLabel(range.from, range.from)}
            </button>
            <button
              className={'btn' + (picking === 'to' ? ' primary' : '')}
              onClick={() => setPicking(picking === 'to' ? null : 'to')}
            >
              تا: {rangeLabel(range.to, range.to)}
            </button>
          </div>
          {picking && (
            <JalaliCalendar
              value={picking === 'from' ? range.from : range.to}
              onPick={(iso) => {
                const next = { ...range, mode: 'custom', [picking]: iso }
                if (next.from > next.to) {
                  if (picking === 'from') next.to = iso
                  else next.from = iso
                }
                setRange(next)
                setPicking(null)
              }}
            />
          )}
        </div>
      )}
    </Card>
  )
}
