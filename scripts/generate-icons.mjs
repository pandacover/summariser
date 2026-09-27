/**
 * Writes tiny PNG/ICO tray assets without extra image libraries.
 * Idle = amber disc, busy = blue disc, app icon = amber disc with inner ring.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'resources')
mkdirSync(outDir, { recursive: true })

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  return ~c >>> 0
}

function chunk(tag, data) {
  const t = Buffer.from(tag)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}

function png32(pixels, size) {
  const raw = Buffer.alloc(size * (1 + size * 4))
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4)
    raw[rowStart] = 0
    pixels.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function disc(size, fill, ring) {
  const px = Buffer.alloc(size * size * 4)
  const cx = (size - 1) / 2
  const r = size * 0.42
  const inner = ring ? size * 0.22 : 0
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx, y - cx)
      const i = (y * size + x) * 4
      let a = 0
      if (d <= r) {
        a = d > r - 1 ? Math.round(255 * (r - d)) : 255
        if (inner && d < inner) a = d > inner - 1 ? Math.round(255 * (d - (inner - 1))) : 0
      }
      px[i] = fill[0]
      px[i + 1] = fill[1]
      px[i + 2] = fill[2]
      px[i + 3] = a
    }
  }
  return png32(px, size)
}

function icoFromPng(png) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)
  const entry = Buffer.alloc(16)
  entry[0] = 32
  entry[1] = 32
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(png.length, 8)
  entry.writeUInt32LE(22, 12)
  return Buffer.concat([header, entry, png])
}

const idle = disc(32, [245, 158, 11], false)
const busy = disc(32, [59, 130, 246], false)
const app = disc(32, [245, 158, 11], true)

writeFileSync(join(outDir, 'tray-idle.png'), idle)
writeFileSync(join(outDir, 'tray-busy.png'), busy)
writeFileSync(join(outDir, 'icon.png'), app)
writeFileSync(join(outDir, 'icon.ico'), icoFromPng(app))
console.log('Wrote tray and app icons to resources/')
