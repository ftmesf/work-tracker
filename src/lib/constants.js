// سه سطل اصلی — ستون فقرات کل اپ
export const BUCKETS = [
  { id: 'company', label: 'کارهای شرکت', short: 'شرکت', color: '#2563eb', soft: '#dbeafe' },
  { id: 'personal', label: 'کارهای خودم', short: 'خودم', color: '#c2410c', soft: '#ffedd5' },
  { id: 'learning', label: 'یادگیری', short: 'یادگیری', color: '#15803d', soft: '#dcfce7' },
]

export const BUCKET_IDS = BUCKETS.map((b) => b.id)

export function bucketOf(id) {
  return BUCKETS.find((b) => b.id === id) || BUCKETS[0]
}

export const STATUSES = [
  { id: 'open', label: 'باز' },
  { id: 'done', label: 'تمام شد' },
  { id: 'blocked', label: 'گیر کرده' },
  { id: 'cancelled', label: 'لغو شد' },
]

export function statusLabel(id) {
  return (STATUSES.find((s) => s.id === id) || {}).label || id
}

export const PROJECT_STATUSES = [
  { id: 'active', label: 'فعال' },
  { id: 'paused', label: 'متوقف' },
  { id: 'done', label: 'تمام‌شده' },
]
