import { useState } from 'react'
import { BUCKETS, PROJECT_STATUSES } from '../lib/constants.js'
import { fa } from '../lib/jalali.js'
import { insert, update } from '../lib/store.js'
import { ArrowDown, ArrowUp } from '../icons.jsx'
import { Fold, toast } from '../ui.jsx'

export default function Manage({ db }) {
  const [tab, setTab] = useState('categories')
  const [bucket, setBucket] = useState('company')
  const [newName, setNewName] = useState('')

  const cats = (db.categories || [])
    .filter((c) => c.bucket === bucket)
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name, 'fa'))
  const projs = (db.projects || []).filter((p) => p.bucket === bucket)

  const usageCount = (catId) => (db.tasks || []).filter((t) => t.category_id === catId).length
  const projUsage = (pid) => (db.tasks || []).filter((t) => t.project_id === pid).length

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

  const move = (list, i, dir) => {
    const j = i + dir
    if (j < 0 || j >= list.length) return
    update('categories', list[i].id, { sort: j })
    update('categories', list[j].id, { sort: i })
  }

  return (
    <Fold n={11} id="manage" title="دسته‌ها و پروژه‌ها">
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
      </div>

      {tab === 'categories' ? (
        cats.length === 0 ? (
          <div className="empty">دسته‌ای در این سطل نیست.</div>
        ) : (
          cats.map((c, i) => (
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
              <button className="btn sm ghost" aria-label="بالاتر" onClick={() => move(cats, i, -1)} disabled={i === 0}><ArrowUp /></button>
              <button className="btn sm ghost" aria-label="پایین‌تر" onClick={() => move(cats, i, 1)} disabled={i === cats.length - 1}><ArrowDown /></button>
              <button
                className="btn sm"
                onClick={() => update('categories', c.id, { is_active: c.is_active === false })}
              >
                {c.is_active === false ? 'فعال' : 'غیرفعال'}
              </button>
            </div>
          ))
        )
      ) : projs.length === 0 ? (
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
      )}

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
      <div className="small faint" style={{ marginTop: 6 }}>
        عدد کنار هر ردیف یعنی چند کار به آن وصل است. غیرفعال کردن، داده‌ی قدیمی را پاک نمی‌کند —
        فقط از فرم ثبت برداشته می‌شود.
      </div>
    </Fold>
  )
}
