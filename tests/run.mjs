// تست‌های سبک بدون هیچ کتابخانه‌ای:  node tests/run.mjs
import assert from 'node:assert/strict'
import * as J from '../src/lib/jalali.js'
import { buildReport, coldCategories, bucketSplit, dailyBreakdown, toMarkdown } from '../src/lib/report.js'
import { toCSV } from '../src/lib/backup.js'

let pass = 0
let fail = 0
function test(name, fn) {
  try {
    fn()
    pass++
    console.log('  ✓ ' + name)
  } catch (e) {
    fail++
    console.log('  ✗ ' + name + '\n      ' + e.message)
  }
}
function group(name) {
  console.log('\n' + name)
}

// ---------------------------------------------------------------- تقویم شمسی
group('تقویم شمسی')

test('تبدیل تاریخ‌های شناخته‌شده به شمسی', () => {
  assert.deepEqual(J.isoToJalali('2026-08-20'), { jy: 1405, jm: 5, jd: 29 })
  assert.deepEqual(J.isoToJalali('2026-03-21'), { jy: 1405, jm: 1, jd: 1 })
  assert.deepEqual(J.isoToJalali('2025-03-21'), { jy: 1404, jm: 1, jd: 1 })
  assert.deepEqual(J.isoToJalali('2024-03-20'), { jy: 1403, jm: 1, jd: 1 })
  assert.deepEqual(J.isoToJalali('1979-02-11'), { jy: 1357, jm: 11, jd: 22 })
})

test('رفت‌وبرگشت شمسی ↔ میلادی برای ۵۰۰۰ روز پیاپی', () => {
  let iso = '2015-01-01'
  for (let i = 0; i < 5000; i++) {
    const { jy, jm, jd } = J.isoToJalali(iso)
    assert.equal(J.jalaliToISO(jy, jm, jd), iso, `شکست در ${iso}`)
    iso = J.addDays(iso, 1)
  }
})

test('هم‌خوانی کامل با Intl (تقویم فارسی مرورگر) برای ۳۰۰۰ روز', () => {
  const fmt = new Intl.DateTimeFormat('en-u-ca-persian', {
    year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC',
  })
  let iso = '2018-06-15'
  for (let i = 0; i < 3000; i++) {
    const parts = fmt.formatToParts(new Date(iso + 'T00:00:00Z'))
    const get = (t) => Number(parts.find((p) => p.type === t).value)
    const mine = J.isoToJalali(iso)
    assert.deepEqual(
      [mine.jy, mine.jm, mine.jd],
      [get('year'), get('month'), get('day')],
      `اختلاف در ${iso}`
    )
    iso = J.addDays(iso, 1)
  }
})

test('طول ماه‌ها و سال کبیسه', () => {
  assert.equal(J.jalaliMonthLength(1403, 1), 31)
  assert.equal(J.jalaliMonthLength(1403, 7), 30)
  assert.equal(J.isLeapJalaliYear(1403), true)   // ۱۴۰۳ کبیسه است
  assert.equal(J.jalaliMonthLength(1403, 12), 30)
  assert.equal(J.isLeapJalaliYear(1404), false)
  assert.equal(J.jalaliMonthLength(1404, 12), 29)
})

test('هفته از شنبه شروع می‌شود و ۷ روز است', () => {
  // 2026-08-20 پنج‌شنبه است
  assert.equal(J.weekdayIndex('2026-08-20'), 5)
  assert.equal(J.WEEKDAYS[J.weekdayIndex('2026-08-20')], 'پنج‌شنبه')
  const w = J.weekRange('2026-08-20')
  assert.equal(w.from, '2026-08-15')                 // شنبه
  assert.equal(J.WEEKDAYS[J.weekdayIndex(w.from)], 'شنبه')
  assert.equal(w.to, '2026-08-21')                   // جمعه
  assert.equal(J.WEEKDAYS[J.weekdayIndex(w.to)], 'جمعه')
  assert.equal(J.eachDay(w.from, w.to).length, 7)
})

test('هفته‌ی هر روزی، شنبه‌ی همان هفته را می‌دهد', () => {
  let iso = '2026-01-01'
  for (let i = 0; i < 400; i++) {
    const { from, to } = J.weekRange(iso)
    assert.equal(J.weekdayIndex(from), 0)
    assert.equal(J.weekdayIndex(to), 6)
    assert.equal(J.daysBetween(from, to), 6)
    assert.ok(from <= iso && iso <= to)
    iso = J.addDays(iso, 1)
  }
})

test('بازه‌ی ماه شمسی', () => {
  const m = J.monthRange('2026-08-20') // مرداد ۱۴۰۵
  assert.equal(m.from, '2026-07-23')
  assert.equal(m.to, '2026-08-22')
  assert.equal(J.isoToJalali(m.from).jd, 1)
  assert.equal(J.isoToJalali(m.to).jd, 31)
})

test('جابه‌جایی ماه از مرز سال رد می‌شود', () => {
  assert.deepEqual(J.shiftMonth(1405, 1, -1), { jy: 1404, jm: 12 })
  assert.deepEqual(J.shiftMonth(1404, 12, 1), { jy: 1405, jm: 1 })
  assert.deepEqual(J.shiftMonth(1405, 5, -6), { jy: 1404, jm: 11 })
})

test('شمارش روز و برچسب‌ها', () => {
  assert.equal(J.daysBetween('2026-08-15', '2026-08-20'), 5)
  assert.equal(J.daysBetween('2026-08-20', '2026-08-15'), -5)
  assert.equal(J.formatShort('2026-08-20'), '۱۴۰۵/۰۵/۲۹')
  assert.equal(J.formatDate('2026-08-20', { weekday: true }), 'پنج‌شنبه ۲۹ مرداد ۱۴۰۵')
  assert.equal(J.rangeLabel('2026-07-23', '2026-08-22'), 'مرداد ۱۴۰۵')
  assert.equal(J.rangeLabel('2026-08-15', '2026-08-21'), '۲۴ تا ۳۰ مرداد ۱۴۰۵')
})

test('تبدیل دقیقه به ساعت', () => {
  assert.equal(J.minutesToHM(90), '۱:۳۰')
  assert.equal(J.minutesToHM(60), '۱ ساعت')
  assert.equal(J.minutesToHM(45), '۴۵ دقیقه')
  assert.equal(J.minutesToHM(null), '—')
  assert.equal(J.minutesToHMPlain(605), '10:05')
  assert.equal(J.timeToMinutes('09:30'), 570)
  assert.equal(J.timeToMinutes(''), null)
})

// ------------------------------------------------------------------ گزارش‌ها
group('گزارش‌ها')

const cats = [
  { id: 'c1', name: 'سایت', bucket: 'company', is_active: true, sort: 0 },
  { id: 'c2', name: 'جلسه‌ها', bucket: 'company', is_active: true, sort: 1 },
  { id: 'c3', name: 'نوشتن', bucket: 'personal', is_active: true, sort: 0 },
  { id: 'c4', name: 'خواندن', bucket: 'learning', is_active: true, sort: 0 },
  { id: 'c5', name: 'غیرفعال', bucket: 'company', is_active: false, sort: 9 },
]
const projects = [{ id: 'p1', name: 'رزومه', bucket: 'personal', status: 'active' }]
const tasks = [
  { id: 't1', title: 'ریدیزاین صفحه‌ی اصلی', bucket: 'company', category_id: 'c1', project_id: null, status: 'open', created_on: '2026-08-15' },
  { id: 't2', title: 'جلسه‌ی هفتگی', bucket: 'company', category_id: 'c2', project_id: null, status: 'done', created_on: '2026-08-16', closed_on: '2026-08-16' },
  { id: 't3', title: 'بازنویسی رزومه', bucket: 'personal', category_id: 'c3', project_id: 'p1', status: 'open', created_on: '2026-08-17' },
  { id: 't4', title: 'کار لغوشده', bucket: 'learning', category_id: 'c4', project_id: null, status: 'cancelled', created_on: '2026-08-17' },
  { id: 't5', title: 'کار بایگانی‌شده', bucket: 'company', category_id: 'c1', project_id: null, status: 'done', created_on: '2026-08-18', archived_at: '2026-08-19T10:00:00Z' },
  { id: 't6', title: 'خارج از بازه', bucket: 'company', category_id: 'c1', project_id: null, status: 'done', created_on: '2026-07-01', closed_on: '2026-07-01' },
]
const logs = [
  { id: 'l1', task_id: 't1', occurred_on: '2026-08-15', minutes: 120 },
  { id: 'l2', task_id: 't1', occurred_on: '2026-08-16', minutes: 60 },
  { id: 'l3', task_id: 't2', occurred_on: '2026-08-16', minutes: 45 },
  { id: 'l4', task_id: 't3', occurred_on: '2026-08-17', minutes: 90 },
  { id: 'l5', task_id: 't4', occurred_on: '2026-08-17', minutes: 30 },
  { id: 'l6', task_id: 't1', occurred_on: '2026-08-18', minutes: null }, // بدون دقیقه
  { id: 'l7', task_id: 't6', occurred_on: '2026-07-01', minutes: 999 },  // خارج از بازه
]
const db = { categories: cats, projects, tasks, time_logs: logs, attendance: [], pinned_notes: [], blockers: [] }
const range = { from: '2026-08-15', to: '2026-08-21' }

test('جمع دقیقه فقط از رکوردهای داخل بازه', () => {
  const r = buildReport(db, range)
  assert.equal(r.totalMinutes, 120 + 60 + 45 + 90 + 30) // ۹۹۹ خارج بازه حساب نشود
})

test('کار لغوشده در آمار می‌ماند', () => {
  const r = buildReport(db, range)
  const learning = r.byBucket.find((b) => b.bucket === 'learning')
  assert.equal(learning.minutes, 30)
  assert.equal(learning.taskCount, 1)
})

test('کار بایگانی‌شده از آمار حذف می‌شود ولی داده‌اش پاک نشده', () => {
  const r = buildReport(db, range)
  assert.ok(!r.tasks.some((t) => t.id === 't5'))
  assert.ok(db.tasks.some((t) => t.id === 't5')) // هنوز در دیتابیس هست
})

test('تقسیم سه‌تایی سطل‌ها — هم تعداد هم دقیقه', () => {
  const s = bucketSplit(db, range)
  assert.equal(s.totalMinutes, 345)
  assert.equal(s.totalTasks, 4)
  const company = s.rows.find((x) => x.bucket === 'company')
  assert.equal(company.minutes, 225)
  assert.equal(company.taskCount, 2)
  assert.equal(Math.round(company.minutesPct), Math.round((225 / 345) * 100))
  assert.equal(s.rows.length, 3) // همیشه هر سه سطل، حتی خالی
})

test('تفکیک روزانه‌ی زمان یک کار', () => {
  const d = dailyBreakdown(db, 't1')
  assert.deepEqual(d.map((x) => [x.occurred_on, x.minutes]), [
    ['2026-08-15', 120],
    ['2026-08-16', 60],
    ['2026-08-18', null],
  ])
})

test('دقیقه‌ی خالی، رکورد را حذف نمی‌کند', () => {
  const r = buildReport(db, range)
  const t1 = r.tasks.find((t) => t.id === 't1')
  assert.equal(t1.minutes, 180)
  assert.equal(t1.logCount, 3)   // هر سه رکورد شمرده می‌شوند
  assert.equal(t1.noMinutesCount, 1)
})

test('زمان به تفکیک دسته و پروژه', () => {
  const r = buildReport(db, range)
  const site = r.byCategory.find((c) => c.id === 'c1')
  assert.equal(site.minutes, 180)
  const proj = r.byProject.find((p) => p.id === 'p1')
  assert.equal(proj.minutes, 90)
  const noProj = r.byProject.find((p) => p.id === null)
  assert.equal(noProj.minutes, 255)
})

test('دسته‌های سرد: فقط دسته‌های فعالِ بدون رکورد در بازه', () => {
  const cold = coldCategories(db, range, '2026-08-21')
  const names = cold.map((c) => c.name)
  assert.ok(!names.includes('سایت'))
  assert.ok(!names.includes('غیرفعال'))     // غیرفعال‌ها نمایش داده نمی‌شوند
  assert.ok(names.includes('نوشتن') === false) // نوشتن رکورد دارد
  assert.equal(cold.length, 0)
})

test('دسته‌ی سرد با شمارش روزهای لمس‌نشده', () => {
  const cold = coldCategories(db, { from: '2026-08-19', to: '2026-08-21' }, '2026-08-21')
  const site = cold.find((c) => c.name === 'سایت')
  assert.ok(site, 'سایت باید سرد باشد')
  assert.equal(site.lastTouched, '2026-08-18')
  assert.equal(site.daysUntouched, 3)
  const never = cold.find((c) => c.name === 'غیرفعال')
  assert.equal(never, undefined)
})

test('خروجی مارک‌داون: گروه‌بندی، جمع زمان، علامت تعهد باز', () => {
  const md = toMarkdown(db, range)
  assert.ok(md.includes('## کارهای شرکت'))
  assert.ok(md.includes('## کارهای خودم'))
  assert.ok(md.includes('### سایت'))
  assert.ok(md.includes('ریدیزاین صفحه‌ی اصلی'))
  assert.ok(md.includes('**باز**'), 'تعهد باز باید علامت بخورد')
  assert.ok(!md.includes('کار بایگانی‌شده'))
  assert.ok(md.includes('۱۴۰۵'), 'تاریخ باید شمسی باشد')
})

// -------------------------------------------------------------------- بکاپ
group('بکاپ')

test('CSV با کاما و کوتیشن و خط جدید درست فرار می‌کند', () => {
  const csv = toCSV([{ a: 'x,y', b: 'او گفت "سلام"', c: 'خط\nدوم', d: null, e: 5 }])
  const lines = csv.split('\n')
  assert.equal(lines[0], 'a,b,c,d,e')
  assert.ok(csv.includes('"x,y"'))
  assert.ok(csv.includes('"او گفت ""سلام"""'))
  assert.ok(csv.includes('"خط\ndوم"') || csv.includes('"خط\nدوم"'))
})

test('CSV خالی کرش نمی‌کند', () => {
  assert.equal(toCSV([]), '')
})

console.log(`\n${pass} تست موفق، ${fail} ناموفق\n`)
process.exit(fail ? 1 : 0)
