// تبدیل تقویم میلادی ↔ شمسی (الگوریتم jalaali-js، MIT)
// ذخیره‌سازی همیشه میلادی/ISO است؛ فقط نمایش شمسی است.

const div = (a, b) => ~~(a / b)
const mod = (a, b) => a - ~~(a / b) * b

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
  1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178,
]

function jalCal(jy) {
  const bl = BREAKS.length
  const gy = jy + 621
  let leapJ = -14
  let jp = BREAKS[0]
  let jm, jump, leap, n, i

  if (jy < jp || jy >= BREAKS[bl - 1]) throw new Error('سال شمسی نامعتبر: ' + jy)

  for (i = 1; i < bl; i += 1) {
    jm = BREAKS[i]
    jump = jm - jp
    if (jy < jm) break
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4)
    jp = jm
  }
  n = jy - jp

  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4)
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150
  const march = 20 + leapJ - leapG

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33
  leap = mod(mod(n + 1, 33) - 1, 4)
  if (leap === -1) leap = 4

  return { leap, gy, march }
}

function g2d(gy, gm, gd) {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752
  return d
}

function d2g(jdn) {
  let j = 4 * jdn + 139361631
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908
  const i = div(mod(j, 1461), 4) * 5 + 308
  const gd = div(mod(i, 153), 5) + 1
  const gm = mod(div(i, 153), 12) + 1
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6)
  return { gy, gm, gd }
}

function j2d(jy, jm, jd) {
  const r = jalCal(jy)
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1
}

function d2j(jdn) {
  const gy = d2g(jdn).gy
  let jy = gy - 621
  const r = jalCal(jy)
  const jdn1f = g2d(gy, 3, r.march)
  let k = jdn - jdn1f
  let jm, jd

  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + div(k, 31)
      jd = mod(k, 31) + 1
      return { jy, jm, jd }
    }
    k -= 186
  } else {
    jy -= 1
    k += 179
    if (r.leap === 1) k += 1
  }
  jm = 7 + div(k, 30)
  jd = mod(k, 30) + 1
  return { jy, jm, jd }
}

export function isLeapJalaliYear(jy) {
  return jalCal(jy).leap === 0
}

export function jalaliMonthLength(jy, jm) {
  if (jm <= 6) return 31
  if (jm <= 11) return 30
  return isLeapJalaliYear(jy) ? 30 : 29
}

// ---------------------------------------------------------------------------
// ISO string helpers. تاریخ همه‌جا به شکل 'YYYY-MM-DD' میلادی نگهداری می‌شود.
// ---------------------------------------------------------------------------

export function toISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO() {
  return toISO(new Date())
}

export function addDays(iso, n) {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export function daysBetween(fromISO, toISOStr) {
  const a = g2d(...fromISO.split('-').map(Number))
  const b = g2d(...toISOStr.split('-').map(Number))
  return b - a
}

// ---------------------------------------------------------------------------
// تبدیل‌ها
// ---------------------------------------------------------------------------

export function isoToJalali(iso) {
  const [gy, gm, gd] = iso.split('-').map(Number)
  return d2j(g2d(gy, gm, gd))
}

export function jalaliToISO(jy, jm, jd) {
  const { gy, gm, gd } = d2g(j2d(jy, jm, jd))
  return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// نمایش
// ---------------------------------------------------------------------------

export const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
]

// شنبه = 0 … جمعه = 6
export const WEEKDAYS = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه']
export const WEEKDAYS_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

export function fa(n) {
  return String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d])
}

/** شنبه=0 … جمعه=6 */
export function weekdayIndex(iso) {
  // getDay(): یک‌شنبه=0 … شنبه=6  →  شنبه=0 … جمعه=6
  return (parseISO(iso).getDay() + 1) % 7
}

export function formatDate(iso, opts = {}) {
  const { jy, jm, jd } = isoToJalali(iso)
  const parts = []
  if (opts.weekday) parts.push(WEEKDAYS[weekdayIndex(iso)])
  parts.push(`${fa(jd)} ${JALALI_MONTHS[jm - 1]}`)
  if (opts.year !== false) parts.push(fa(jy))
  return parts.join(' ')
}

export function formatShort(iso) {
  const { jy, jm, jd } = isoToJalali(iso)
  return `${fa(jy)}/${fa(String(jm).padStart(2, '0'))}/${fa(String(jd).padStart(2, '0'))}`
}

export function formatDayLabel(iso) {
  const { jm, jd } = isoToJalali(iso)
  return `${WEEKDAYS[weekdayIndex(iso)]} ${fa(jd)} ${JALALI_MONTHS[jm - 1]}`
}

// ---------------------------------------------------------------------------
// بازه‌ها — هفته از شنبه شروع می‌شود و هفت‌روزه است (جمعه هم داخلش است)
// ---------------------------------------------------------------------------

export function weekStart(iso) {
  return addDays(iso, -weekdayIndex(iso))
}

export function weekRange(anyDayISO) {
  const from = weekStart(anyDayISO)
  return { from, to: addDays(from, 6) }
}

export function monthRange(anyDayISO) {
  const { jy, jm } = isoToJalali(anyDayISO)
  return jalaliMonthRange(jy, jm)
}

export function jalaliMonthRange(jy, jm) {
  return {
    from: jalaliToISO(jy, jm, 1),
    to: jalaliToISO(jy, jm, jalaliMonthLength(jy, jm)),
  }
}

export function shiftMonth(jy, jm, delta) {
  let total = jy * 12 + (jm - 1) + delta
  return { jy: Math.floor(total / 12), jm: (((total % 12) + 12) % 12) + 1 }
}

export function rangeLabel(from, to) {
  const a = isoToJalali(from)
  const b = isoToJalali(to)
  const m = jalaliMonthRange(a.jy, a.jm)
  if (m.from === from && m.to === to) return `${JALALI_MONTHS[a.jm - 1]} ${fa(a.jy)}`
  if (from === to) return formatDate(from, { weekday: true })
  if (a.jy === b.jy && a.jm === b.jm) {
    return `${fa(a.jd)} تا ${fa(b.jd)} ${JALALI_MONTHS[a.jm - 1]} ${fa(a.jy)}`
  }
  if (a.jy === b.jy) {
    return `${fa(a.jd)} ${JALALI_MONTHS[a.jm - 1]} تا ${fa(b.jd)} ${JALALI_MONTHS[b.jm - 1]} ${fa(a.jy)}`
  }
  return `${formatShort(from)} تا ${formatShort(to)}`
}

export function eachDay(from, to) {
  const out = []
  let cur = from
  let guard = 0
  while (cur <= to && guard++ < 4000) {
    out.push(cur)
    cur = addDays(cur, 1)
  }
  return out
}

// ---------------------------------------------------------------------------
// ساعت
// ---------------------------------------------------------------------------

export function minutesToHM(min) {
  if (min == null) return '—'
  const m = Math.round(min)
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h === 0) return `${fa(r)} دقیقه`
  if (r === 0) return `${fa(h)} ساعت`
  return `${fa(h)}:${fa(String(r).padStart(2, '0'))}`
}

export function minutesToHMPlain(min) {
  const m = Math.round(min || 0)
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
}

/** 'HH:MM' → دقیقه از نیمه‌شب */
export function timeToMinutes(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}
