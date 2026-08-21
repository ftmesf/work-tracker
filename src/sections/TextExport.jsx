import { useRef, useState } from 'react'
import { rangeLabel } from '../lib/jalali.js'
import { toMarkdown } from '../lib/report.js'
import { Fold, toast } from '../ui.jsx'

export default function TextExport({ db, range }) {
  const [text, setText] = useState('')
  const ref = useRef(null)

  const build = () => {
    const md = toMarkdown(db, range)
    setText(md)
    return md
  }

  const copy = async () => {
    const md = text || build()
    // روی آیفون کلیپ‌بورد گاهی بدون تعامل مستقیم کار نمی‌کند — انتخاب متن پشتیبان است
    try {
      await navigator.clipboard.writeText(md)
      toast('کپی شد')
      return
    } catch {}
    const el = ref.current
    if (el) {
      el.focus()
      el.setSelectionRange(0, el.value.length)
      try {
        document.execCommand('copy')
        toast('کپی شد')
        return
      } catch {}
    }
    toast('متن انتخاب شد — دستی کپی کن')
  }

  return (
    <Fold n={14} id="export" title="خروجی متنی">
      <div className="small muted" style={{ marginBottom: 8 }}>
        {rangeLabel(range.from, range.to)} — گروه‌بندی بر اساس سطل و دسته، با جمع زمان هر بخش.
      </div>
      <div className="row" style={{ marginBottom: 8 }}>
        <button className="btn primary grow" onClick={build}>بساز</button>
        <button className="btn grow" onClick={copy} disabled={!text}>کپی</button>
      </div>
      <textarea
        ref={ref}
        className="out"
        value={text}
        readOnly
        placeholder="دکمه‌ی «بساز» را بزن…"
        onFocus={(e) => e.target.setSelectionRange(0, e.target.value.length)}
      />
    </Fold>
  )
}
