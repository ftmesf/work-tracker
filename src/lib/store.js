// ---------------------------------------------------------------------------
// انبار داده — اول محلی، بعد Supabase.
//
// قانون: هر چیزی که تایپ می‌شود، همان لحظه و به‌صورت همزمان در حافظه‌ی مرورگر
// می‌نشیند. ارسال به Supabase بعداً و در پس‌زمینه اتفاق می‌افتد. اگر Supabase
// اصلاً تنظیم نشده باشد، اپ کامل و بدون خطا کار می‌کند.
//
// چون یک کاربر و یک دستگاه است، سینک عمداً ساده است: مجموعه‌ای از ردیف‌های
// «هنوز نفرستاده» نگه می‌داریم و هر بار همان ردیف‌ها را کامل upsert می‌کنیم.
// نه حل تعارض، نه merge — آخرین نوشته برنده است.
// ---------------------------------------------------------------------------
import { createClient } from '@supabase/supabase-js'
import { TABLES } from './backup.js'
import { todayISO } from './jalali.js'

const LS_DB = 'wt.db.v1'
const LS_DIRTY = 'wt.dirty.v1'
const LS_CFG = 'wt.supabase.v1'

// ترتیب مهم است: کلید خارجی. دسته و پروژه قبل از کار، کار قبل از زمان.
const PUSH_ORDER = ['categories', 'projects', 'tasks', 'time_logs', 'attendance', 'pinned_notes', 'blockers']
const CONFLICT_KEY = { attendance: 'day' }

export function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

const emptyDB = () => Object.fromEntries(TABLES.map((t) => [t, []]))

// ------------------------------------------------------------------ وضعیت
let db = emptyDB()
let dirty = Object.fromEntries(TABLES.map((t) => [t, new Set()]))
let listeners = new Set()
let sync = { configured: false, online: navigator.onLine, state: 'idle', pending: 0, lastSyncedAt: null, error: null }
let supabase = null
let flushTimer = null

const snapshot = () => ({ ...db, __sync: { ...sync } })
let current = snapshot()

export function getState() {
  return current
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function emit() {
  sync.pending = TABLES.reduce((s, t) => s + dirty[t].size, 0)
  current = snapshot()
  for (const fn of listeners) fn(current)
}

// ------------------------------------------------------------- ذخیره‌ی محلی
function saveLocal() {
  try {
    localStorage.setItem(LS_DB, JSON.stringify(db))
    localStorage.setItem(
      LS_DIRTY,
      JSON.stringify(Object.fromEntries(TABLES.map((t) => [t, [...dirty[t]]])))
    )
  } catch (e) {
    // اگر حافظه‌ی مرورگر پر شد، کاربر باید بفهمد — نباید بی‌صدا رد شود
    sync.error = 'حافظه‌ی مرورگر پر است — لطفاً بکاپ بگیرید'
    console.error('ذخیره‌ی محلی شکست خورد', e)
  }
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_DB)
    if (raw) {
      const parsed = JSON.parse(raw)
      db = { ...emptyDB(), ...parsed }
      for (const t of TABLES) if (!Array.isArray(db[t])) db[t] = []
    }
    const rawD = localStorage.getItem(LS_DIRTY)
    if (rawD) {
      const parsed = JSON.parse(rawD)
      for (const t of TABLES) dirty[t] = new Set(parsed[t] || [])
    }
  } catch (e) {
    console.error('خواندن داده‌ی محلی شکست خورد', e)
  }
}

const isEmpty = () => TABLES.every((t) => db[t].length === 0)

// ---------------------------------------------------------------- Supabase
export function getSupabaseConfig() {
  const envUrl = import.meta.env?.VITE_SUPABASE_URL
  const envKey = import.meta.env?.VITE_SUPABASE_ANON_KEY
  if (envUrl && envKey) return { url: envUrl, key: envKey, from: 'env' }
  try {
    const raw = localStorage.getItem(LS_CFG)
    if (raw) {
      const c = JSON.parse(raw)
      if (c.url && c.key) return { ...c, from: 'local' }
    }
  } catch {}
  return null
}

export function setSupabaseConfig(url, key) {
  if (!url || !key) localStorage.removeItem(LS_CFG)
  else localStorage.setItem(LS_CFG, JSON.stringify({ url: url.trim(), key: key.trim() }))
  connectSupabase()
  emit()
}

function connectSupabase() {
  const cfg = getSupabaseConfig()
  if (!cfg) {
    supabase = null
    sync.configured = false
    return
  }
  try {
    supabase = createClient(cfg.url, cfg.key, { auth: { persistSession: false } })
    sync.configured = true
    sync.error = null
  } catch (e) {
    supabase = null
    sync.configured = false
    sync.error = 'آدرس یا کلید Supabase درست نیست'
  }
}

const markDirty = (table, id) => dirty[table].add(id)

function scheduleFlush(delay = 800) {
  clearTimeout(flushTimer)
  flushTimer = setTimeout(() => flush(), delay)
}

export async function flush() {
  if (!supabase || !navigator.onLine) return
  if (sync.state === 'syncing') return
  const total = TABLES.reduce((s, t) => s + dirty[t].size, 0)
  if (!total) return

  sync.state = 'syncing'
  emit()
  try {
    for (const table of PUSH_ORDER) {
      const ids = [...dirty[table]]
      if (!ids.length) continue
      const byId = new Map(db[table].map((r) => [r.id, r]))
      const rows = ids.map((id) => byId.get(id)).filter(Boolean)
      if (!rows.length) {
        dirty[table].clear()
        continue
      }
      const opts = CONFLICT_KEY[table] ? { onConflict: CONFLICT_KEY[table] } : undefined
      const { error } = await supabase.from(table).upsert(rows, opts)
      if (error) throw Object.assign(new Error(error.message), { table })
      for (const id of ids) dirty[table].delete(id)
      saveLocal()
    }
    sync.state = 'idle'
    sync.error = null
    sync.lastSyncedAt = new Date().toISOString()
  } catch (e) {
    sync.state = 'error'
    sync.error = `ارسال به Supabase انجام نشد: ${e.message}`
    console.error(e)
    // داده‌ی محلی دست‌نخورده می‌ماند و دفعه‌ی بعد دوباره تلاش می‌شود
    setTimeout(() => scheduleFlush(15000), 0)
  }
  saveLocal()
  emit()
}

/** کشیدن کل داده از سرور و جایگزینی محلی. فقط وقتی صف خالی است. */
export async function pull() {
  if (!supabase || !navigator.onLine) return false
  if (TABLES.some((t) => dirty[t].size)) return false
  sync.state = 'syncing'
  emit()
  try {
    const next = emptyDB()
    for (const table of TABLES) {
      const { data, error } = await supabase.from(table).select('*')
      if (error) throw Object.assign(new Error(error.message), { table })
      next[table] = data || []
    }
    // اگر همین حین کشیدن داده، کاربر چیزی تایپ کرد (dirty شد)، آن را دور نریز —
    // جایگزینی کامل db همین الان آن ورودی تازه را پاک می‌کرد
    if (TABLES.some((t) => dirty[t].size)) {
      sync.state = 'idle'
      emit()
      return false
    }
    db = next
    sync.state = 'idle'
    sync.error = null
    sync.lastSyncedAt = new Date().toISOString()
    saveLocal()
    emit()
    return true
  } catch (e) {
    sync.state = 'error'
    sync.error = `خواندن از Supabase انجام نشد: ${e.message}`
    console.error(e)
    emit()
    return false
  }
}

// ------------------------------------------------------------------ نوشتن
export function insert(table, row) {
  const rec = { id: uid(), ...row }
  db[table] = [...db[table], rec]
  markDirty(table, rec.id)
  saveLocal()
  emit()
  scheduleFlush()
  return rec
}

export function update(table, id, patch) {
  let updated = null
  db[table] = db[table].map((r) => {
    if (r.id !== id) return r
    updated = { ...r, ...patch }
    return updated
  })
  if (updated) {
    markDirty(table, id)
    saveLocal()
    emit()
    scheduleFlush()
  }
  return updated
}

/** حضور بر اساس روز یکتاست — اگر بود به‌روزرسانی، اگر نبود ساخته می‌شود */
export function setAttendance(day, patch) {
  const existing = db.attendance.find((a) => a.day === day)
  if (existing) return update('attendance', existing.id, patch)
  return insert('attendance', { day, at_office: false, arrived_at: null, left_at: null, note: null, ...patch })
}

/** حذف نداریم — فقط بایگانی */
export function archiveTask(id) {
  return update('tasks', id, { archived_at: new Date().toISOString() })
}

export function unarchiveTask(id) {
  return update('tasks', id, { archived_at: null })
}

// --------------------------------------------------------------- عملیات‌ها
export function addTask({ title, bucket, category_id, project_id, minutes, done, date, note }) {
  const day = date || todayISO()
  const task = insert('tasks', {
    title: title.trim(),
    bucket,
    category_id,
    project_id: project_id || null,
    status: done ? 'done' : 'open',
    created_on: day,
    closed_on: done ? day : null,
    note: note || null,
    archived_at: null,
  })
  // زمان همیشه رکورد جدا می‌گیرد — حتی وقتی دقیقه خالی است
  addTimeLog(task.id, day, minutes, null)
  return task
}

export function addTimeLog(task_id, occurred_on, minutes, note) {
  const m = minutes === '' || minutes == null ? null : Number(minutes)
  return insert('time_logs', {
    task_id,
    occurred_on: occurred_on || todayISO(),
    minutes: Number.isFinite(m) && m > 0 ? Math.round(m) : null,
    note: note || null,
    created_at: new Date().toISOString(),
  })
}

export function setTaskStatus(id, status) {
  const patch = { status }
  const t = db.tasks.find((x) => x.id === id)
  if (status === 'open') patch.closed_on = null
  else if (t && !t.closed_on) patch.closed_on = todayISO()
  return update('tasks', id, patch)
}

export function replaceAll(next) {
  db = { ...emptyDB(), ...next }
  for (const t of TABLES) {
    dirty[t] = new Set(db[t].map((r) => r.id))
  }
  saveLocal()
  emit()
  scheduleFlush(200)
}

// ------------------------------------------------------------ داده‌ی اولیه
const SEED_CATEGORIES = [
  ['company', 'سایت، محتوا و ویژوال'],
  ['company', 'مارکتینگ، رشد و رسانه'],
  ['company', 'B2B، داده و BI'],
  ['company', 'تحقیق کاربر'],
  ['company', 'عملیات و زیرساخت'],
  ['company', 'پشتیبانی تیم و قطع‌شدن‌ها'],
  ['company', 'جلسه‌ها'],
  ['personal', 'نوشتن'],
  ['personal', 'تحقیق'],
  ['personal', 'مکاتبه و اداری'],
  ['learning', 'خواندن و تحقیق'],
  ['learning', 'دوره و آموزش'],
  ['learning', 'تمرین عملی'],
]

const SEED_PROJECTS = [
  ['personal', 'رزومه'],
  ['personal', 'اپلای'],
  ['personal', 'کارآموزی'],
]

export function seed() {
  let sort = 0
  let lastBucket = null
  for (const [bucket, name] of SEED_CATEGORIES) {
    if (bucket !== lastBucket) {
      sort = 0
      lastBucket = bucket
    }
    insert('categories', { name, bucket, sort: sort++, is_active: true })
  }
  for (const [bucket, name] of SEED_PROJECTS) {
    insert('projects', { name, bucket, status: 'active', started_on: null, ended_on: null })
  }
}

// -------------------------------------------------------------------- شروع
let started = false

export async function init() {
  if (started) return
  started = true

  loadLocal()
  connectSupabase()
  emit()

  window.addEventListener('online', () => {
    sync.online = true
    emit()
    scheduleFlush(300)
  })
  window.addEventListener('offline', () => {
    sync.online = false
    emit()
  })
  // اگر تب بسته/مخفی شد، هرچه در صف است همان لحظه برود
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
    else scheduleFlush(500)
  })
  setInterval(() => scheduleFlush(0), 60_000)

  if (supabase && navigator.onLine) {
    await flush()
    if (isEmpty()) await pull()
  }

  if (db.categories.length === 0) seed()
  emit()
}
