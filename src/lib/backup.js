// خروجی گرفتن برای بکاپ — JSON کامل و CSV هر جدول
export const TABLES = [
  'categories',
  'projects',
  'tasks',
  'time_logs',
  'attendance',
  'pinned_notes',
  'blockers',
  'meetings',
]

export const TABLE_LABELS = {
  categories: 'دسته‌ها',
  projects: 'پروژه‌ها',
  tasks: 'کارها',
  time_logs: 'زمان‌ها',
  attendance: 'حضور',
  pinned_notes: 'یادداشت‌های پین‌شده',
  blockers: 'موانع',
  meetings: 'جلسه‌ها',
}

export function toCSV(rows) {
  if (!rows || !rows.length) return ''
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))]
  const cell = (v) => {
    if (v == null) return ''
    const s = String(v)
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const lines = [cols.join(',')]
  for (const r of rows) lines.push(cols.map((c) => cell(r[c])).join(','))
  return lines.join('\n')
}

export function download(filename, text, mime = 'text/plain;charset=utf-8') {
  // BOM تا اکسل فارسی را درست باز کند
  const blob = new Blob([mime.startsWith('text/csv') ? '﻿' + text : text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function stamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

export function exportJSON(db) {
  const payload = { exported_at: new Date().toISOString(), version: 1 }
  for (const t of TABLES) payload[t] = db[t] || []
  return JSON.stringify(payload, null, 2)
}

export function validateImport(text) {
  const data = JSON.parse(text)
  if (!data || typeof data !== 'object') throw new Error('فایل معتبر نیست')
  const out = {}
  for (const t of TABLES) {
    if (data[t] != null && !Array.isArray(data[t])) throw new Error(`جدول ${t} در فایل خراب است`)
    out[t] = data[t] || []
  }
  return out
}
