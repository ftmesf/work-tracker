import { useRef } from 'react'
import { TABLES, TABLE_LABELS, download, exportJSON, stamp, toCSV, validateImport } from '../lib/backup.js'
import { fa } from '../lib/jalali.js'
import { replaceAll } from '../lib/store.js'
import { Fold, toast } from '../ui.jsx'

export default function Backup({ db }) {
  const fileRef = useRef(null)

  const importFile = async (file) => {
    if (!file) return
    try {
      const next = validateImport(await file.text())
      const counts = TABLES.map((t) => `${TABLE_LABELS[t]}: ${next[t].length}`).join('\n')
      if (!confirm(`همه‌ی داده‌ی فعلی با محتوای این فایل جایگزین می‌شود.\n\n${counts}\n\nادامه؟`)) return
      replaceAll(next)
      toast('بازیابی شد')
    } catch (e) {
      alert('فایل خوانده نشد: ' + e.message)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const total = TABLES.reduce((s, t) => s + (db[t]?.length || 0), 0)

  return (
    <Fold n={null} id="backup" title="بکاپ و بازیابی">
      <div className="small muted" style={{ marginBottom: 10 }}>
        هر چند وقت یک بار JSON را بگیر و جایی نگه دار. همین یک فایل، همه‌چیز است.
      </div>

      <button
        className="btn primary full"
        onClick={() => {
          download(`work-tracker-${stamp()}.json`, exportJSON(db), 'application/json')
          toast('فایل JSON دانلود شد')
        }}
      >
        دانلود بکاپ کامل (JSON) — {fa(total)} رکورد
      </button>

      <div className="hr" />
      <div className="small muted" style={{ marginBottom: 6 }}>CSV هر جدول جدا (برای اکسل):</div>
      <div className="chips">
        {TABLES.map((t) => (
          <button
            key={t}
            className="chip"
            disabled={!db[t]?.length}
            onClick={() => {
              download(`${t}-${stamp()}.csv`, toCSV(db[t]), 'text/csv;charset=utf-8')
              toast(TABLE_LABELS[t] + ' دانلود شد')
            }}
          >
            {TABLE_LABELS[t]} ({fa(db[t]?.length || 0)})
          </button>
        ))}
      </div>

      <div className="hr" />
      <div className="small muted" style={{ marginBottom: 6 }}>
        بازیابی از فایل JSON — داده‌ی فعلی جایگزین می‌شود.
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={(e) => importFile(e.target.files?.[0])}
        style={{ fontSize: 13, padding: 8 }}
      />
    </Fold>
  )
}
