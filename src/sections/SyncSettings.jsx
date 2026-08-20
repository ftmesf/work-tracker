import { useState } from 'react'
import { fa } from '../lib/jalali.js'
import { flush, getSupabaseConfig, pull, setSupabaseConfig } from '../lib/store.js'
import { Fold, toast } from '../ui.jsx'

export default function SyncSettings({ sync }) {
  const cfg = getSupabaseConfig()
  const [url, setUrl] = useState(cfg?.url || '')
  const [key, setKey] = useState(cfg?.key || '')
  const [busy, setBusy] = useState(false)

  const save = () => {
    setSupabaseConfig(url, key)
    toast(url && key ? 'ذخیره شد' : 'اتصال برداشته شد')
  }

  return (
    <Fold n={null} id="sync" title="اتصال به Supabase">
      <div className="small muted" style={{ marginBottom: 10 }}>
        اپ بدون Supabase هم کامل کار می‌کند — همه‌چیز در همین مرورگر ذخیره می‌شود.
        Supabase فقط نسخه‌ی پشتیبان روی سرور است تا اگر گوشی یا مرورگر پاک شد، داده نپرد.
      </div>

      <div className="stat-row" style={{ marginBottom: 12 }}>
        <div className="stat">
          <div className="v">{sync.online ? 'آنلاین' : 'آفلاین'}</div>
          <div className="k">اینترنت</div>
        </div>
        <div className="stat">
          <div className="v">{fa(sync.pending)}</div>
          <div className="k">در صف ارسال</div>
        </div>
        <div className="stat">
          <div className="v">{sync.configured ? (sync.state === 'error' ? 'خطا' : 'وصل') : 'خاموش'}</div>
          <div className="k">وضعیت</div>
        </div>
      </div>

      {sync.error && (
        <div className="small" style={{ color: 'var(--danger)', marginBottom: 10 }}>{sync.error}</div>
      )}

      {cfg?.from === 'env' ? (
        <div className="small muted">
          آدرس و کلید از تنظیمات Vercel خوانده شده‌اند و از داخل اپ قابل تغییر نیستند.
        </div>
      ) : (
        <>
          <label className="field">
            <span>Project URL</span>
            <input
              type="text"
              dir="ltr"
              value={url}
              placeholder="https://xxxx.supabase.co"
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
          <label className="field">
            <span>anon public key</span>
            <input
              type="text"
              dir="ltr"
              value={key}
              placeholder="eyJhbGciOi…"
              onChange={(e) => setKey(e.target.value)}
            />
          </label>
          <button className="btn primary full" onClick={save}>ذخیره</button>
        </>
      )}

      {sync.configured && (
        <div className="row" style={{ marginTop: 10 }}>
          <button
            className="btn grow"
            disabled={busy}
            onClick={async () => { setBusy(true); await flush(); setBusy(false); toast('صف خالی شد') }}
          >
            الان بفرست
          </button>
          <button
            className="btn grow"
            disabled={busy || sync.pending > 0}
            onClick={async () => {
              if (!confirm('داده‌ی این دستگاه با نسخه‌ی سرور جایگزین می‌شود. ادامه؟')) return
              setBusy(true)
              const ok = await pull()
              setBusy(false)
              toast(ok ? 'از سرور خوانده شد' : 'خواندن انجام نشد')
            }}
          >
            از سرور بخوان
          </button>
        </div>
      )}
      {sync.pending > 0 && (
        <div className="small faint" style={{ marginTop: 6 }}>
          تا وقتی چیزی در صف است، «از سرور بخوان» غیرفعال می‌ماند تا داده‌ی نفرستاده پاک نشود.
        </div>
      )}
    </Fold>
  )
}
