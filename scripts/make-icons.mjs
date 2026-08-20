// ساخت آیکون‌های PNG بدون هیچ کتابخانه‌ای (فقط zlib داخلی نود)
import zlib from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'

const OUT = path.join(process.cwd(), 'public')

function crc32(buf) {
  let table = crc32.table
  if (!table) {
    table = crc32.table = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c
    }
  }
  let crc = -1
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff]
  return (crc ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const stride = w * 4
  const raw = Buffer.alloc((stride + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const hex = (s) => [
  parseInt(s.slice(1, 3), 16),
  parseInt(s.slice(3, 5), 16),
  parseInt(s.slice(5, 7), 16),
]

function makeCanvas(w, h, bg) {
  const buf = Buffer.alloc(w * h * 4)
  const [r, g, b] = hex(bg)
  for (let i = 0; i < w * h; i++) {
    buf[i * 4] = r
    buf[i * 4 + 1] = g
    buf[i * 4 + 2] = b
    buf[i * 4 + 3] = 255
  }
  return buf
}

/** مستطیل گِرد با ضدپله (۳×۳ نمونه در هر پیکسل) */
function roundRect(buf, w, x0, y0, rw, rh, radius, color) {
  const [r, g, b] = hex(color)
  const inside = (px, py) => {
    const dx = Math.max(x0 + radius - px, 0, px - (x0 + rw - radius))
    const dy = Math.max(y0 + radius - py, 0, py - (y0 + rh - radius))
    if (px < x0 || px > x0 + rw || py < y0 || py > y0 + rh) return false
    return dx * dx + dy * dy <= radius * radius
  }
  const x1 = Math.floor(x0), x2 = Math.ceil(x0 + rw)
  const y1 = Math.floor(y0), y2 = Math.ceil(y0 + rh)
  for (let y = y1; y < y2; y++) {
    for (let x = x1; x < x2; x++) {
      let hits = 0
      for (let sy = 0; sy < 3; sy++)
        for (let sx = 0; sx < 3; sx++)
          if (inside(x + (sx + 0.5) / 3, y + (sy + 0.5) / 3)) hits++
      if (!hits) continue
      const a = hits / 9
      const i = (y * w + x) * 4
      buf[i] = Math.round(buf[i] * (1 - a) + r * a)
      buf[i + 1] = Math.round(buf[i + 1] * (1 - a) + g * a)
      buf[i + 2] = Math.round(buf[i + 2] * (1 - a) + b * a)
    }
  }
}

// سه ستون = سه سطل: شرکت (آبی) · خودم (نارنجی) · یادگیری (سبز)
function icon(size, maskable) {
  const bg = '#0f172a'
  const buf = makeCanvas(size, size, bg)
  const s = size / 512
  const pad = maskable ? 128 * s : 96 * s // نسخه‌ی maskable حاشیه‌ی امن بیشتری دارد
  const usable = size - pad * 2
  const gap = usable * 0.1
  const barW = (usable - gap * 2) / 3
  const cols = ['#3b82f6', '#fb923c', '#4ade80']
  const heights = [1.0, 0.72, 0.46]
  for (let i = 0; i < 3; i++) {
    const bh = usable * heights[i]
    roundRect(buf, size, pad + i * (barW + gap), pad + (usable - bh), barW, bh, barW / 2.6, cols[i])
  }
  return encodePNG(size, size, buf)
}

fs.mkdirSync(OUT, { recursive: true })
const files = [
  ['icon-192.png', icon(192, false)],
  ['icon-512.png', icon(512, false)],
  ['icon-maskable-512.png', icon(512, true)],
  ['apple-touch-icon.png', icon(180, false)],
  ['favicon-32.png', icon(32, false)],
]
for (const [name, data] of files) {
  fs.writeFileSync(path.join(OUT, name), data)
  console.log('نوشته شد:', name, data.length, 'بایت')
}
