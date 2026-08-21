import { useEffect, useState } from 'react'
import { BUCKETS, PROJECT_STATUSES } from '../lib/constants.js'
import { fa } from '../lib/jalali.js'
import { insert, mergeCategories, update } from '../lib/store.js'
import { ArrowDown, ArrowUp } from '../icons.jsx'
import { Fold, toast } from '../ui.jsx'

export default function Manage({ db }) {
  const [tab, setTab] = useState('categories')
  const [bucket, setBucket] = useState('company')
  const [newName, setNewName] = useState('')
  const [newTmplTitle, setNewTmplTitle] = useState('')
  const [newTmplCat, setNewTmplCat] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const cats = (db.categories || [])
    .filter((c) => c.bucket === bucket)
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name, 'fa'))
  const projs = (db.projects || []).filter((p) => p.bucket === bucket)
  const templates = (db.task_templates || []).filter((t) => t.bucket === bucket)
  const catById = new Map((db.categories || []).map((c) => [c.id, c]))

  const activeCats = cats.filter((c) => c.is_active !== false)
  const visibleCats = showInactive ? cats : activeCats
  const visibleTemplates = showInactive ? templates : templates.filter((t) => t.is_active !== false)

  const usageCount = (catId) => (db.tasks || []).filter((t) => t.category_id === catId).length
  const projUsage = (pid) => (db.tasks || []).filter((t) => t.project_id === pid).length

  // دسته‌های هم‌نامِ فعال در همین سطل — معمولاً مانده‌ی seed دوباره روی یک
  // دستگاه/مرورگر دیگر قبل از اولین sync؛ فقط فعال‌ها را می‌بینیم چون بعد از
  // ادغام، نسخه‌ی اضافی غیرفعال می‌شود و دیگر نباید دوباره پیشنهاد شود
  const dupGroups = Object.values(
    cats
      .filter((c) => c.is_active !== false)
      .reduce((acc, c) => {
        const key = c.name.trim().toLowerCase()
        ;(acc[key] ||= []).push(c)
        return acc
      }, {})
  ).filter((g) => g.length > 1)

  const mergeDuplicates = () => {
    let merged = 0
    for (const group of dupGroups) {
      const [keep, ...rest] = [...group].sort(
        (a, b) => usageCount(b.id) - usageCount(a.id) || (a.sort ?? 0) - (b.sort ?? 0)
      )
      mergeCategories(keep.id, rest.map((c) => c.id))
      merged += rest.length
    }
    toast(`${fa(merged)} دسته‌ی تکراری با نسخه‌ی اصلی ادغام شد`)
  }

  const add = () => {
    const name = newName.trim()
    if (!name) return
    if (tab === 'categories') {
      insert('categories', { name, bucket, sort: cats.length, is_active: true })
    } else {
      insert('projects', { name, bucket, status: 'active', started_on: null, ended_on: null })
    }
    setNewName('')
    toast('اضافه شد')
  }

  const addTemplate = () => {
    const title = newTmplTitle.trim()
    if (!title || !newTmplCat) return
    insert('task_templates', {
      title,
      bucket,
      category_id: newTmplCat,
      project_id: null,
      is_active: true,
      created_at: new Date().toISOString(),
    })
    setNewTmplTitle('')
    toast('الگو اضافه شد')
  }

  useEffect(() => {
    setNewTmplCat((c) => (activeCats.some((x) => x.id === c) ? c : activeCats[0]?.id || ''))
  }, [bucket, activeCats])

  // کل لیست را دوباره شماره‌گذاری می‌کند (نه فقط دو تای جابه‌جاشده) تا اگر
  // sort قبلاً به‌خاطر اضافه/غیرفعال‌شدن ردیف‌ها پیاپی نبود، خودش را درست کند
  const move = (list, i, dir) => {
    const j = i + dir
    if (j < 0 || j >= list.length) return
    const reordered = list.slice()
    const [item] = reordered.splice(i, 1)
    reordered.splice(j, 0, item)
    reordered.forEach((c, idx) => {
      if (c.sort !== idx) update('categories', c.id, { sort: idx })
    })
  }

  return (
    <Fold n={14} id="manage" title="دسته‌ها و پروژه‌ها">
      <div className="chips" style={{ marginBottom: 8 }}>
        <button
          className={'chip' + (tab === 'categories' ? ' on neutral' : '')}
          onClick={() => setTab('categories')}
        >
          دسته‌ها
        </button>
        <button
          className={'chip' + (tab === 'projects' ? ' on neutral' : '')}
          onClick={() => setTab('projects')}
        >
          پروژه‌ها
        </button>
        <button
          className={'chip' + (tab === 'templates' ? ' on neutral' : '')}
          onClick={() => setTab('templates')}
        >
          الگوها
        </button>
      </div>

      <div className="chips" style={{ marginBottom: 10 }}>
        {BUCKETS.map((b) => (
          <button
            key={b.id}
            className={'chip' + (bucket === b.id ? ' on ' + b.id : '')}
            onClick={() => setBucket(b.id)}
          >
            {b.short}
          </button>
        ))}
        {tab !== 'projects' && (
          <button
            className={'chip' + (showInactive ? ' on neutral' : '')}
            onClick={() => setShowInactive((v) => !v)}
          >
            {showInactive ? 'مخفی کردن غیرفعال‌ها' : 'نمایش غیرفعال‌ها'}
          </button>
        )}
      </div>

      {tab === 'categories' && dupGroups.length > 0 && (
        <div className="remind" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span className="small">
            {fa(dupGroups.length)} دسته‌ی هم‌نام در این سطل پیدا شد — احتمالاً از یک sync قبلی مانده.
          </span>
          <button className="btn sm primary" onClick={mergeDuplicates}>ادغام تکراری‌ها</button>
        </div>
      )}

      {tab === 'categories' ? (
        visibleCats.length === 0 ? (
          <div className="empty">
            {showInactive ? 'دسته‌ای در این سطل نیست.' : 'دسته‌ی فعالی در این سطل نیست.'}
          </div>
        ) : (
          visibleCats.map((c, i) => (
            <div className={'manage-row' + (c.is_active === false ? ' off' : '')} key={c.id}>
              <input
                className="grow"
                type="text"
                defaultValue={c.name}
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  if (v && v !== c.name) update('categories', c.id, { name: v })
                  else e.target.value = c.name
                }}
              />
              <span className="small faint nums" style={{ width: 42, textAlign: 'center' }}>
                {fa(usageCount(c.id))}
              </span>
              <button className="btn sm ghost" aria-label="بالاتر" onClick={() => move(visibleCats, i, -1)} disabled={i === 0}><ArrowUp /></button>
              <button className="btn sm ghost" aria-label="پایین‌تر" onClick={() => move(visibleCats, i, 1)} disabled={i === visibleCats.length - 1}><ArrowDown /></button>
              <button
                className="btn sm"
                onClick={() => update('categories', c.id, { is_active: c.is_active === false })}
              >
                {c.is_active === false ? 'فعال' : 'غیرفعال'}
              </button>
            </div>
          ))
        )
      ) : tab === 'projects' ? (
        projs.length === 0 ? (
          <div className="empty">پروژه‌ای در این سطل نیست.</div>
        ) : (
          projs.map((p) => (
            <div className={'manage-row' + (p.status === 'done' ? ' off' : '')} key={p.id}>
              <input
                className="grow"
                type="text"
                defaultValue={p.name}
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  if (v && v !== p.name) update('projects', p.id, { name: v })
                  else e.target.value = p.name
                }}
              />
              <span className="small faint nums" style={{ width: 42, textAlign: 'center' }}>
                {fa(projUsage(p.id))}
              </span>
              <select
                value={p.status}
                onChange={(e) => {
                  const status = e.target.value
                  update('projects', p.id, {
                    status,
                    ended_on: status === 'done' ? p.ended_on || new Date().toISOString().slice(0, 10) : null,
                  })
                }}
                style={{ width: 110, minHeight: 36, padding: '5px 8px', fontSize: 13.5 }}
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
          ))
        )
      ) : visibleTemplates.length === 0 ? (
        <div className="empty">
          {showInactive ? 'الگویی در این سطل نیست.' : 'الگوی فعالی در این سطل نیست.'}
        </div>
      ) : (
        visibleTemplates.map((t) => (
          <div className={'manage-row' + (t.is_active === false ? ' off' : '')} key={t.id}>
            <input
              className="grow"
              type="text"
              defaultValue={t.title}
              onBlur={(e) => {
                const v = e.target.value.trim()
                if (v && v !== t.title) update('task_templates', t.id, { title: v })
                else e.target.value = t.title
              }}
            />
            <span className="small faint" style={{ minWidth: 90, textAlign: 'center' }}>
              {catById.get(t.category_id)?.name || '—'}
            </span>
            <button
              className="btn sm"
              onClick={() => update('task_templates', t.id, { is_active: t.is_active === false })}
            >
              {t.is_active === false ? 'فعال' : 'غیرفعال'}
            </button>
          </div>
        ))
      )}

      {tab === 'templates' ? (
        <div className="row" style={{ marginTop: 12 }}>
          <input
            className="grow"
            type="text"
            value={newTmplTitle}
            placeholder="عنوان الگو"
            onChange={(e) => setNewTmplTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addTemplate() }}
          />
          <select
            value={newTmplCat}
            onChange={(e) => setNewTmplCat(e.target.value)}
            style={{ width: 140, minHeight: 46 }}
          >
            {activeCats.length === 0 && <option value="">دسته‌ای نیست</option>}
            {activeCats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button className="btn primary" onClick={addTemplate} disabled={!newTmplTitle.trim() || !newTmplCat}>
            اضافه
          </button>
        </div>
      ) : (
        <div className="row" style={{ marginTop: 12 }}>
          <input
            className="grow"
            type="text"
            value={newName}
            placeholder={tab === 'categories' ? 'دسته‌ی جدید' : 'پروژه‌ی جدید'}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add() }}
          />
          <button className="btn primary" onClick={add} disabled={!newName.trim()}>اضافه</button>
        </div>
      )}
      <div className="small faint" style={{ marginTop: 6 }}>
        {tab === 'templates'
          ? 'الگوها فقط برای پرکردن سریع فرم ثبتن — خودشان زمان نمی‌گیرند. غیرفعال کردن، الگو را از چیپ‌های ثبت سریع برمی‌دارد.'
          : 'عدد کنار هر ردیف یعنی چند کار به آن وصل است. غیرفعال کردن، داده‌ی قدیمی را پاک نمی‌کند — فقط از فرم ثبت برداشته می‌شود.'}
      </div>
    </Fold>
  )
}
