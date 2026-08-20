import { useEffect, useState } from 'react'
import { fa, formatDate } from './lib/jalali.js'
import { flush } from './lib/store.js'
import { CloudSync } from './icons.jsx'
import { Toaster } from './ui.jsx'
import { useRange, useStore, useToday } from './useStore.js'

import Reminders from './sections/Reminders.jsx'
import QuickAdd from './sections/QuickAdd.jsx'
import Attendance from './sections/Attendance.jsx'
import RangeBar from './sections/RangeBar.jsx'
import BucketSplit from './sections/BucketSplit.jsx'
import TaskList from './sections/TaskList.jsx'
import TimeReport from './sections/TimeReport.jsx'
import ColdCategories from './sections/ColdCategories.jsx'
import Trend from './sections/Trend.jsx'
import Blockers from './sections/Blockers.jsx'
import Manage from './sections/Manage.jsx'
import TextExport from './sections/TextExport.jsx'
import Backup from './sections/Backup.jsx'
import SyncSettings from './sections/SyncSettings.jsx'

function SyncBadge({ sync }) {
  let cls = 'sync'
  let text = 'فقط این دستگاه'
  if (!sync.configured) {
    // Supabase تنظیم نشده — صف معنایی ندارد، همه‌چیز محلی است
  } else if (!sync.online) {
    cls += ' pending'
    text = sync.pending ? `آفلاین · ${fa(sync.pending)} در صف` : 'آفلاین'
  } else if (sync.state === 'error') {
    cls += ' err'
    text = 'خطای ارسال'
  } else if (sync.pending > 0) {
    cls += ' pending'
    text = `${fa(sync.pending)} در صف`
  } else if (sync.configured) {
    cls += ' ok'
    text = 'ذخیره شد'
  }
  return (
    <button
      className={cls}
      onClick={() => {
        flush()
        document.getElementById('sync-anchor')?.scrollIntoView({ behavior: 'smooth' })
      }}
    >
      {sync.configured && <CloudSync />}
      {text}
    </button>
  )
}

export default function App() {
  const db = useStore()
  const [range, setRange] = useRange()
  const today = useToday()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="app">
      <header className={'topbar' + (scrolled ? ' scrolled' : '')}>
        <h1>
          ردیاب کار
          <div className="today">{formatDate(today, { weekday: true })}</div>
        </h1>
        <SyncBadge sync={db.__sync} />
      </header>

      <Reminders db={db} today={today} />
      <QuickAdd db={db} today={today} />
      <Attendance db={db} today={today} range={range} />
      <BucketSplit db={db} range={range} />
      <RangeBar range={range} setRange={setRange} />
      <TaskList db={db} range={range} today={today} />
      <TimeReport db={db} range={range} />
      <ColdCategories db={db} range={range} today={today} />
      <Trend db={db} today={today} />
      <Blockers db={db} />
      <Manage db={db} />
      <TextExport db={db} range={range} />
      <div id="sync-anchor" />
      <Backup db={db} />
      <SyncSettings sync={db.__sync} />

      <Toaster />
    </div>
  )
}
