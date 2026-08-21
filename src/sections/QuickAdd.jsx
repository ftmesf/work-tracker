import { useEffect, useMemo, useRef, useState } from 'react'
import { BUCKETS } from '../lib/constants.js'
import { formatDate, minutesToHM, todayISO } from '../lib/jalali.js'
import { similarOpenTasks } from '../lib/report.js'
import { addTask, addTimeLog, insert } from '../lib/store.js'
import { Card, DateField, toast } from '../ui.jsx'
import { usePersisted } from '../useStore.js'

export default function QuickAdd({ db, today }) {
  const [bucket, setBucket] = usePersisted('wt.lastBucket', 'company')
  const [lastCat, setLastCat] = usePersisted('wt.lastCat', {})
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [minutes, setMinutes] = useState('')
  const [notDone, setNotDone] = useState(false)
  const [date, setDate] = useState(today)
  const titleRef = useRef(null)

  const cats = useMemo(
    () =>
      (db.categories || [])
        .filter((c) => c.bucket === bucket && c.is_active !== false)
        .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name, 'fa')),
    [db.categories, bucket]
  )
  const projects = useMemo(
    () => (db.projects || []).filter((p) => p.bucket === bucket && p.status !== 'done'),
    [db.projects, bucket]
  )
  const templates = useMemo(
    () => (db.task_templates || []).filter((t) => t.bucket === bucket && t.is_active !== false),
    [db.task_templates, bucket]
  )

  // با عوض‌شدن سطل، دسته‌ی همان سطل برمی‌گردد (آخرین چیزی که انتخاب کرده بود)
  useEffect(() => {
    const remembered = lastCat[bucket]
    const valid = cats.some((c) => c.id === remembered)
    setCategoryId(valid ? remembered : cats[0]?.id || '')
    setProjectId('')
  }, [bucket, cats])

  // اگر تاریخ روی «امروز» بود و نیمه‌شب شد، خودش جلو بیاید
  useEffect(() => { setDate((d) => (d < today ? d : today)) }, [today])

  const similar = useMemo(
    () => similarOpenTasks(db, title, bucket),
    [db.tasks, title, bucket]
  )

  const reset = () => {
    setTitle('')
    setMinutes('')
    setNotDone(false)
    // سطل، دسته و تاریخ عمداً می‌مانند تا بشود پشت‌سرهم چند تا ثبت کرد
    setTimeout(() => titleRef.current?.focus(), 0)
  }

  const submit = () => {
    const t = title.trim()
    if (!t || !categoryId) return
    setLastCat({ ...lastCat, [bucket]: categoryId })
    addTask({
      title: t,
      bucket,
      category_id: categoryId,
      project_id: projectId || null,
      minutes,
      done: !notDone,
      date,
    })
    toast(`ثبت شد${minutes ? ' · ' + minutesToHM(Number(minutes)) : ''}`)
    reset()
  }

  const appendTo = (task) => {
    addTimeLog(task.id, date, minutes, null)
    toast(`به «${task.title}» اضافه شد`)
    reset()
  }

  const useTemplate = (t) => {
    setTitle(t.title)
    setCategoryId(cats.some((c) => c.id === t.category_id) ? t.category_id : cats[0]?.id || '')
    setProjectId(projects.some((p) => p.id === t.project_id) ? t.project_id : '')
    titleRef.current?.focus()
  }

  const saveAsTemplate = () => {
    insert('task_templates', {
      title: title.trim(),
      bucket,
      category_id: categoryId,
      project_id: projectId || null,
      is_active: true,
      created_at: new Date().toISOString(),
    })
    toast('الگو ذخیره شد')
  }

  const canSubmit = title.trim().length > 0 && !!categoryId

  return (
    <Card n={3} title="ثبت سریع">
      <div className="chips" style={{ marginBottom: 8 }}>
        {BUCKETS.map((b) => (
          <button
            key={b.id}
            className={'chip' + (bucket === b.id ? ' on ' + b.id : '')}
            onClick={() => setBucket(b.id)}
          >
            {b.label}
          </button>
        ))}
      </div>

      {templates.length > 0 && (
        <div className="chips" style={{ marginBottom: 8 }}>
          {templates.map((t) => (
            <button key={t.id} type="button" className="chip" onClick={() => useTemplate(t)}>
              {t.title}
            </button>
          ))}
        </div>
      )}

      <input
        ref={titleRef}
        type="text"
        value={title}
        placeholder="چه کار کردی؟"
        enterKeyHint="done"
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
        style={{ marginBottom: 8 }}
      />

      {title.trim() && categoryId && (
        <button
          type="button"
          className="btn sm ghost"
          style={{ marginBottom: 8 }}
          onClick={saveAsTemplate}
        >
          ذخیره به‌عنوان الگو
        </button>
      )}

      {similar.length > 0 && (
        <div className="suggest">
          <div className="q">همین الان باز است — به همان اضافه شود؟</div>
          {similar.map((t) => (
            <div className="opt" key={t.id}>
              <span className="t">{t.title}</span>
              <button className="btn sm primary" onClick={() => appendTo(t)}>اضافه کن</button>
            </div>
          ))}
        </div>
      )}

      <div className="cols2" style={{ marginBottom: 8 }}>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {cats.length === 0 && <option value="">دسته‌ای نیست</option>}
          {cats.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          step="5"
          value={minutes}
          placeholder="دقیقه (اختیاری)"
          onChange={(e) => setMinutes(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
        />
      </div>

      {projects.length > 0 && (
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          style={{ marginBottom: 8 }}
        >
          <option value="">بدون پروژه</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}

      <div style={{ marginBottom: 10 }}>
        <DateField value={date} onChange={setDate} />
      </div>

      <div className="row" style={{ gap: 10 }}>
        <label className="check grow">
          <input type="checkbox" checked={notDone} onChange={(e) => setNotDone(e.target.checked)} />
          هنوز تمام نشده
        </label>
        <button className="btn primary" onClick={submit} disabled={!canSubmit}>ثبت</button>
      </div>

      {date !== todayISO() && (
        <div className="small muted" style={{ marginTop: 6 }}>
          روی تاریخ {formatDate(date, { weekday: true })} ثبت می‌شود.
        </div>
      )}
    </Card>
  )
}
