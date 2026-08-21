// آیکون‌های SVG دستی — سبک، بدون وابستگی، هم‌ضخامت (stroke 1.75)
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' }

export function ChevronDown({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export function ArrowRight({ size = 18, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export function ArrowLeft({ size = 18, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  )
}

export function ArrowUp({ size = 14, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  )
}

export function ArrowDown({ size = 14, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  )
}

export function Plus({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function Check({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  )
}

export function Pin({ size = 15, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 17v5M8 3h8l-1 6 3 3v2H6v-2l3-3-1-6z" />
    </svg>
  )
}

export function Clock({ size = 14, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </svg>
  )
}

export function CloudSync({ size = 14, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M7 18a4.5 4.5 0 01-.5-8.98A5.5 5.5 0 0117 8.5a4 4 0 01-.5 7.98" />
      <path d="M12 12v6M9.5 15.5L12 18l2.5-2.5" />
    </svg>
  )
}
