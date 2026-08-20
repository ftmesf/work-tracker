import { useEffect, useState, useSyncExternalStore } from 'react'
import { getState, subscribe } from './lib/store.js'
import { todayISO, weekRange } from './lib/jalali.js'

export function useStore() {
  return useSyncExternalStore(subscribe, getState, getState)
}

/** چیزی که در localStorage می‌ماند و با رفرش یا بستن اپ ریست نمی‌شود */
export function usePersisted(key, initial) {
  const [v, setV] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw != null) return JSON.parse(raw)
    } catch {}
    return typeof initial === 'function' ? initial() : initial
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(v))
    } catch {}
  }, [key, v])
  return [v, setV]
}

/** بازه‌ی انتخاب‌شده — پیش‌فرض هفته‌ی جاری، و هیچ‌وقت خودبه‌خود ریست نمی‌شود */
export function useRange() {
  return usePersisted('wt.range.v1', () => ({ mode: 'week', ...weekRange(todayISO()) }))
}

/** ساعت را می‌خواند تا اگر اپ باز ماند و نیمه‌شب شد، «امروز» درست بماند */
export function useToday() {
  const [d, setD] = useState(todayISO)
  useEffect(() => {
    const id = setInterval(() => {
      const t = todayISO()
      setD((prev) => (prev === t ? prev : t))
    }, 60_000)
    const onVis = () => setD(todayISO())
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])
  return d
}
