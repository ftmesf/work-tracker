import { useEffect, useRef, useState } from 'react'
import {
  JALALI_MONTHS, WEEKDAYS_SHORT, addDays, fa, formatDate, isoToJalali,
  jalaliMonthLength, jalaliToISO, shiftMonth, todayISO, weekdayIndex,
} from './lib/jalali.js'
import { ArrowLeft, ArrowRight, ChevronDown } from './icons.jsx'
import { usePersisted } from './useStore.js'

export function Card({ n, title, right, children, className = '', id }) {
  return (
    <section className={'card ' + className} id={id}>
      {title && (
        <h2>
          {n != null && <span className="n">{fa(n)}</span>}
          <span>{title}</span>
          <span className="grow" />
          {right}
        </h2>
      )}
      {children}
    </section>
  )
}

/** کارت تاشو — باز/بسته بودنش یادش می‌ماند */
export function Fold({ n, title, id, right, defaultOpen = false, children }) {
  const [open, setOpen] = usePersisted('wt.fold.' + id, defaultOpen)
  return (
    <section className={'card collapsible' + (open ? ' open' : '')}>
      <h2 onClick={() => setOpen(!open)}>
        {n != null && <span className="n">{fa(n)}</span>}
        <span>{title}</span>
        <span className="grow" />
        {/* کلیک روی دکمه‌های داخل سربرگ نباید کارت را ببندد */}
        {open && right && <span onClick={(e) => e.stopPropagation()}>{right}</span>}
        <span className="caret"><ChevronDown /></span>
      </h2>
      {open && children}
    </section>
  )
}

export function Bar({ pct, color, thin }) {
  return (
    <div className={'bar' + (thin ? ' thin' : '')}>
      <i style={{ width: Math.max(0, Math.min(100, pct || 0)) + '%', background: color }} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// انتخاب تاریخ شمسی. تقویم آیفون میلادی است، پس تقویم خودمان را می‌سازیم.
// ---------------------------------------------------------------------------
export function DateField({ value, onChange, label }) {
  const [open, setOpen] = useState(false)
  const today = todayISO()
  const yesterday = addDays(today, -1)

  return (
    <div>
      {label && <span className="small muted" style={{ display: 'block', marginBottom: 4 }}>{label}</span>}
      <div className="chips">
        <button
          type="button"
          className={'chip' + (value === today ? ' on neutral' : '')}
          onClick={() => { onChange(today); setOpen(false) }}
        >
          امروز
        </button>
        <button
          type="button"
          className={'chip' + (value === yesterday ? ' on neutral' : '')}
          onClick={() => { onChange(yesterday); setOpen(false) }}
        >
          دیروز
        </button>
        <button
          type="button"
          className={'chip' + (value !== today && value !== yesterday ? ' on neutral' : '')}
          onClick={() => setOpen((o) => !o)}
        >
          {value !== today && value !== yesterday ? formatDate(value, { weekday: true }) : 'روز دیگر…'}
        </button>
      </div>
      {open && (
        <JalaliCalendar
          value={value}
          onPick={(iso) => { onChange(iso); setOpen(false) }}
        />
      )}
    </div>
  )
}

export function JalaliCalendar({ value, onPick }) {
  const sel = isoToJalali(value || todayISO())
  const [view, setView] = useState({ jy: sel.jy, jm: sel.jm })
  const today = todayISO()

  const len = jalaliMonthLength(view.jy, view.jm)
  const first = jalaliToISO(view.jy, view.jm, 1)
  const lead = weekdayIndex(first) // شنبه = ۰
  const cells = [...Array(lead).fill(null), ...Array.from({ length: len }, (_, i) => i + 1)]

  return (
    <div style={{ marginTop: 8, border: '1px solid var(--line)', borderRadius: 12, padding: 10 }}>
      <div className="range-nav" style={{ marginBottom: 6 }}>
        <button type="button" className="btn arrow" aria-label="ماه قبل" onClick={() => setView(shiftMonth(view.jy, view.jm, -1))}><ArrowRight /></button>
        <div className="label">{JALALI_MONTHS[view.jm - 1]} {fa(view.jy)}</div>
        <button type="button" className="btn arrow" aria-label="ماه بعد" onClick={() => setView(shiftMonth(view.jy, view.jm, 1))}><ArrowLeft /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
        {WEEKDAYS_SHORT.map((d, i) => (
          <div key={i} className="small faint" style={{ textAlign: 'center', paddingBottom: 2 }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          if (d == null) return <div key={'e' + i} />
          const iso = jalaliToISO(view.jy, view.jm, d)
          const isSel = iso === value
          const isToday = iso === today
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onPick(iso)}
              style={{
                border: isToday && !isSel ? '1.5px solid var(--brand)' : '1px solid var(--line)',
                background: isSel ? 'var(--brand)' : '#fff',
                color: isSel ? '#fff' : 'inherit',
                borderRadius: 9,
                padding: '8px 0',
                fontSize: 13.5,
                minHeight: 38,
                fontWeight: isSel || isToday ? 700 : 400,
                cursor: 'pointer',
              }}
            >
              {fa(d)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------- پیام
let pushToast = () => {}
export function toast(msg) {
  pushToast(msg)
}

export function Toaster() {
  const [msg, setMsg] = useState(null)
  const timer = useRef()
  useEffect(() => {
    pushToast = (m) => {
      setMsg(m)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setMsg(null), 2200)
    }
    return () => { pushToast = () => {} }
  }, [])
  if (!msg) return null
  return (
    <div className="toast"><div>{msg}</div></div>
  )
}
