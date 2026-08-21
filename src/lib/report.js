// همه‌ی محاسبه‌های گزارشی. هیچ‌جا داده تغییر نمی‌کند — فقط خوانده می‌شود.
import { BUCKETS, bucketOf, statusLabel } from './constants.js'
import { addDays, daysBetween, fa, formatDate, minutesToHM, rangeLabel } from './jalali.js'

const inRange = (d, r) => !!d && d >= r.from && d <= r.to

/** کارهایی که بایگانی نشده‌اند */
export function liveTasks(db) {
  return (db.tasks || []).filter((t) => !t.archived_at)
}

/**
 * یک کار وقتی «در بازه» است که یا در بازه ساخته شده باشد،
 * یا در بازه رویش زمان ثبت شده باشد.
 */
export function buildReport(db, range) {
  const tasks = liveTasks(db)
  const taskById = new Map(tasks.map((t) => [t.id, t]))
  const logs = (db.time_logs || []).filter(
    (l) => inRange(l.occurred_on, range) && taskById.has(l.task_id)
  )

  const perTask = new Map()
  const touch = (t) => {
    if (!perTask.has(t.id)) {
      perTask.set(t.id, { ...t, minutes: 0, logCount: 0, noMinutesCount: 0, days: new Set() })
    }
    return perTask.get(t.id)
  }

  for (const t of tasks) if (inRange(t.created_on, range)) touch(t)
  for (const l of logs) {
    const row = touch(taskById.get(l.task_id))
    row.minutes += l.minutes || 0
    row.logCount += 1
    row.days.add(l.occurred_on)
    if (l.minutes == null) row.noMinutesCount += 1
  }

  const rows = [...perTask.values()].map((r) => ({ ...r, dayCount: r.days.size }))
  const totalMinutes = logs.reduce((s, l) => s + (l.minutes || 0), 0)

  const catById = new Map((db.categories || []).map((c) => [c.id, c]))
  const projById = new Map((db.projects || []).map((p) => [p.id, p]))

  const sum = (arr) => arr.reduce((s, r) => s + r.minutes, 0)

  const byBucket = BUCKETS.map((b) => {
    const rs = rows.filter((r) => r.bucket === b.id)
    return {
      bucket: b.id,
      label: b.label,
      color: b.color,
      minutes: sum(rs),
      taskCount: rs.length,
      openCount: rs.filter((r) => r.status === 'open').length,
    }
  })

  // یک پاس روی rows به‌جای filter جدا به ازای هر دسته/پروژه — O(rows) به‌جای O(دسته×rows)
  const catAgg = new Map()
  const projAgg = new Map()
  for (const r of rows) {
    if (r.category_id) {
      const a = catAgg.get(r.category_id) || { minutes: 0, taskCount: 0 }
      a.minutes += r.minutes
      a.taskCount += 1
      catAgg.set(r.category_id, a)
    }
    const pid = r.project_id || null
    const p = projAgg.get(pid) || { minutes: 0, taskCount: 0 }
    p.minutes += r.minutes
    p.taskCount += 1
    projAgg.set(pid, p)
  }

  const byCategory = [...catAgg.entries()]
    .map(([id, a]) => {
      const c = catById.get(id)
      return { id, name: c ? c.name : 'بدون دسته', bucket: c ? c.bucket : null, ...a }
    })
    .sort((a, b) => b.minutes - a.minutes)

  const byProject = [...projAgg.entries()]
    .map(([pid, a]) => {
      const p = pid ? projById.get(pid) : null
      return { id: pid, name: p ? p.name : 'بدون پروژه', bucket: p ? p.bucket : null, ...a }
    })
    .sort((a, b) => b.minutes - a.minutes)

  return {
    range,
    tasks: rows,
    logs,
    totalMinutes,
    totalTasks: rows.length,
    byBucket,
    byCategory,
    byProject,
  }
}

export function bucketSplit(db, range) {
  const r = buildReport(db, range)
  const rows = r.byBucket.map((b) => ({
    ...b,
    minutesPct: r.totalMinutes ? (b.minutes / r.totalMinutes) * 100 : 0,
    taskPct: r.totalTasks ? (b.taskCount / r.totalTasks) * 100 : 0,
  }))
  return { rows, totalMinutes: r.totalMinutes, totalTasks: r.totalTasks }
}

/** تفکیک روزانه‌ی زمانِ یک کار — همیشه کل تاریخچه، نه فقط بازه */
export function dailyBreakdown(db, taskId) {
  return (db.time_logs || [])
    .filter((l) => l.task_id === taskId)
    .slice()
    .sort((a, b) => (a.occurred_on < b.occurred_on ? -1 : a.occurred_on > b.occurred_on ? 1 : 0))
}

export function taskTotalMinutes(db, taskId) {
  return (db.time_logs || [])
    .filter((l) => l.task_id === taskId)
    .reduce((s, l) => s + (l.minutes || 0), 0)
}

/** آخرین روزی که روی این دسته کاری ثبت شده — در کل تاریخچه */
export function lastTouchedByCategory(db) {
  const tasks = liveTasks(db)
  const taskById = new Map(tasks.map((t) => [t.id, t]))
  const map = new Map()
  const bump = (catId, day) => {
    if (!day) return
    const cur = map.get(catId)
    if (!cur || day > cur) map.set(catId, day)
  }
  for (const t of tasks) bump(t.category_id, t.created_on)
  for (const l of db.time_logs || []) {
    const t = taskById.get(l.task_id)
    if (t) bump(t.category_id, l.occurred_on)
  }
  return map
}

/** دسته‌های فعالی که در بازه هیچ رکوردی ندارند */
export function coldCategories(db, range, today) {
  const r = buildReport(db, range)
  const active = new Set(r.byCategory.map((c) => c.id))
  const last = lastTouchedByCategory(db)

  return (db.categories || [])
    .filter((c) => c.is_active !== false && !active.has(c.id))
    .map((c) => {
      const lastTouched = last.get(c.id) || null
      return {
        ...c,
        lastTouched,
        daysUntouched: lastTouched ? daysBetween(lastTouched, today) : null,
      }
    })
    .sort((a, b) => (b.daysUntouched ?? 1e9) - (a.daysUntouched ?? 1e9))
}

/** تعهدهای باز و معوق — قدیمی‌ترین اول */
export function openCommitments(db, today) {
  return liveTasks(db)
    .filter((t) => t.status === 'open')
    .map((t) => ({ ...t, daysOpen: daysBetween(t.created_on, today) }))
    .sort((a, b) => b.daysOpen - a.daysOpen)
}

/** حضور: جمع دقیقه‌های حضور در یک بازه */
export function attendanceSummary(db, range) {
  const rows = (db.attendance || [])
    .filter((a) => inRange(a.day, range))
    .slice()
    .sort((a, b) => (a.day < b.day ? -1 : 1))
  let minutes = 0
  let officeDays = 0
  let withHours = 0
  for (const a of rows) {
    if (a.at_office) officeDays += 1
    if (a.arrived_at && a.left_at) {
      const [h1, m1] = a.arrived_at.split(':').map(Number)
      const [h2, m2] = a.left_at.split(':').map(Number)
      const d = h2 * 60 + m2 - (h1 * 60 + m1)
      if (d > 0) {
        minutes += d
        withHours += 1
      }
    }
  }
  return { rows, minutes, officeDays, withHours }
}

/** روند سهم سه سطل در چند ماه شمسیِ گذشته */
export function trend(db, months) {
  return months.map((m) => {
    const r = buildReport(db, { from: m.from, to: m.to })
    return {
      ...m,
      totalMinutes: r.totalMinutes,
      totalTasks: r.totalTasks,
      buckets: r.byBucket,
    }
  })
}

/** مجموعه‌ی روزهایی که فعالیت دارند — یک پاس، برای استفاده‌ی تکراری (استریک) */
function activityDaySet(db) {
  const tasks = liveTasks(db)
  const days = new Set()
  const ids = new Set()
  for (const t of tasks) {
    ids.add(t.id)
    if (t.created_on) days.add(t.created_on)
  }
  for (const l of db.time_logs || []) {
    if (ids.has(l.task_id)) days.add(l.occurred_on)
  }
  return days
}

/** آیا امروز اصلاً چیزی ثبت شده؟ */
export function hasActivityOn(db, day) {
  return activityDaySet(db).has(day)
}

/**
 * چند روز پیاپی (تا امروز یا تا دیروز) چیزی ثبت شده. قبلاً به ازای هر روزِ
 * استریک دوباره کل tasks/time_logs اسکن می‌شد (O(روز × رکورد)) — حالا مجموعه‌ی
 * روزها یک‌بار ساخته می‌شود و هر چک فقط یک Set.has است.
 */
export function streakInfo(db, today) {
  const days = activityDaySet(db)
  const includesToday = days.has(today)
  let day = includesToday ? today : addDays(today, -1)
  let count = 0
  while (days.has(day)) {
    count += 1
    day = addDays(day, -1)
  }
  return { days: count, includesToday }
}

/** مقایسه‌ی زمان هر دسته با بازه‌ی هم‌طولِ درست قبل از این بازه */
export function categoryComparison(db, range) {
  const len = daysBetween(range.from, range.to) + 1
  const prevTo = addDays(range.from, -1)
  const prevFrom = addDays(prevTo, -(len - 1))
  const prevRange = { from: prevFrom, to: prevTo }

  const cur = buildReport(db, range)
  const prev = buildReport(db, prevRange)
  const curById = new Map(cur.byCategory.map((c) => [c.id, c]))
  const prevById = new Map(prev.byCategory.map((c) => [c.id, c]))
  const ids = new Set([...curById.keys(), ...prevById.keys()])

  const rows = [...ids]
    .map((id) => {
      const curMinutes = curById.get(id)?.minutes || 0
      const prevMinutes = prevById.get(id)?.minutes || 0
      const delta = curMinutes - prevMinutes
      const pct = prevMinutes ? (delta / prevMinutes) * 100 : curMinutes ? 100 : 0
      return {
        id,
        name: (curById.get(id) || prevById.get(id)).name,
        curMinutes,
        prevMinutes,
        delta,
        pct,
      }
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  return { rows, prevRange }
}

// ----------------------------------------------------------------- مارک‌داون
export function toMarkdown(db, range) {
  const r = buildReport(db, range)
  const catById = new Map((db.categories || []).map((c) => [c.id, c]))
  const projById = new Map((db.projects || []).map((p) => [p.id, p]))
  const out = []

  out.push(`# گزارش ${rangeLabel(range.from, range.to)}`)
  out.push('')
  out.push(
    `جمع کل: ${minutesToHM(r.totalMinutes)} · ${fa(r.totalTasks)} کار` +
      ` · ${fa(r.tasks.filter((t) => t.status === 'open').length)} تعهد باز`
  )

  for (const b of BUCKETS) {
    const rows = r.tasks.filter((t) => t.bucket === b.id)
    if (!rows.length) continue
    const bMin = rows.reduce((s, t) => s + t.minutes, 0)
    out.push('')
    out.push(`## ${b.label} — ${bMin ? minutesToHM(bMin) + ' · ' : ''}${fa(rows.length)} کار`)

    const catIds = [...new Set(rows.map((t) => t.category_id))].sort((x, y) => {
      const a = rows.filter((t) => t.category_id === y).reduce((s, t) => s + t.minutes, 0)
      const c = rows.filter((t) => t.category_id === x).reduce((s, t) => s + t.minutes, 0)
      return a - c
    })

    for (const cid of catIds) {
      const cat = catById.get(cid)
      const crows = rows.filter((t) => t.category_id === cid)
      const cMin = crows.reduce((s, t) => s + t.minutes, 0)
      out.push('')
      out.push(`### ${cat ? cat.name : 'بدون دسته'}${cMin ? ' — ' + minutesToHM(cMin) : ''}`)
      for (const t of crows.sort((a, b2) => b2.minutes - a.minutes)) {
        const bits = []
        if (t.minutes) bits.push(minutesToHM(t.minutes))
        if (t.dayCount > 1) bits.push(`${fa(t.dayCount)} روز`)
        if (t.project_id && projById.get(t.project_id)) bits.push(projById.get(t.project_id).name)
        if (t.status === 'open') bits.push('**باز**')
        else if (t.status !== 'done') bits.push(statusLabel(t.status))
        out.push(`- ${t.title}${bits.length ? ' — ' + bits.join(' · ') : ''}`)
        if (t.note) out.push(`  - ${t.note}`)
      }
    }
  }

  const att = attendanceSummary(db, range)
  if (att.rows.length) {
    out.push('')
    out.push(`## حضور — ${minutesToHM(att.minutes)} در ${fa(att.officeDays)} روز شرکت`)
    for (const a of att.rows) {
      const t = a.arrived_at && a.left_at ? ` ${a.arrived_at}–${a.left_at}` : ''
      out.push(`- ${formatDate(a.day, { weekday: true })}: ${a.at_office ? 'شرکت' : 'نبودم'}${t}`)
    }
  }

  const openBlockers = (db.blockers || []).filter((b) => !b.resolved_on)
  if (openBlockers.length) {
    out.push('')
    out.push('## موانع باز')
    for (const b of openBlockers) {
      out.push(`- ${b.title}${b.needs_decision ? ` — نیاز به تصمیم: ${b.needs_decision}` : ''}`)
    }
  }

  return out.join('\n')
}

// ------------------------------------------------------- پیشنهاد کار تکراری
const normalize = (s) =>
  (s || '')
    .replace(/[يﻱ]/g, 'ی')
    .replace(/[كﻙ]/g, 'ک')
    .replace(/[‌‏‎]/g, ' ')
    .replace(/[ً-ْ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

/** کارهای بازِ شبیه به عنوانی که دارد تایپ می‌شود */
export function similarOpenTasks(db, title, bucket) {
  const q = normalize(title)
  if (q.length < 3) return []
  return liveTasks(db)
    .filter((t) => t.status === 'open' && (!bucket || t.bucket === bucket))
    .map((t) => {
      const n = normalize(t.title)
      let score = 0
      if (n === q) score = 100
      else if (n.startsWith(q) || q.startsWith(n)) score = 80
      else if (n.includes(q) || q.includes(n)) score = 60
      else {
        const qw = new Set(q.split(' ').filter((w) => w.length > 2))
        const nw = n.split(' ').filter((w) => w.length > 2)
        const hit = nw.filter((w) => qw.has(w)).length
        if (hit && qw.size) score = (hit / Math.max(qw.size, nw.length)) * 55
      }
      return { task: t, score }
    })
    .filter((x) => x.score >= 45)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.task)
}
