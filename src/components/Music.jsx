import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Upload,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Trash2,
  X,
  ChevronDown,
  Music as MusicIcon,
} from 'lucide-react'

/* ==================================================================
   MY MUSIC  —  two ways to add songs
   ------------------------------------------------------------------
   A) "Add songs" button in the app
      Songs are saved in your browser (IndexedDB) for your account,
      so they stay after refresh and after logout / login.
      You can delete them with the trash icon.

   B) Songs that are already on your computer (permanent, in code)
      1. Copy your MP3 files into the folder:   public/music/
      2. Add one line per song in the list below.
           name   = what shows in the app
           file   = the path, always starting with  /music/
           artist = (optional) small text under the name
           cover  = (optional) a picture, e.g. /music/covers/my-song.jpg
                    If you skip it, the app reads the cover inside the
                    MP3 file. If there is none, it shows a colored square.
      These cannot be deleted from the app (remove the line to remove them).
   ================================================================== */
export const MY_SONGS = [
  {
    name: 'All Girls are the Same',
    artist: 'Juice Wrld',
    file: '/music/ALLGIRLSARETHESAME.mp3',
    cover: '/imgs/juicewrld1.jpg',   
  },
    {
    name: 'Robbery',
    artist: 'Juice Wrld',
    file: '/music/ROBBERY.mp3',
    cover: '/imgs/juicewrld2.jpg',   
  },
  {
    name: 'Die for you',
    artist: 'The Weeknd',
    file: '/music/DIEFORYOU.mp3',
    cover: '/imgs/theweeknd2.jpg',   
  },
    {
    name: 'Blinding Lights',
    artist: 'The Weeknd',
    file: '/music/BLINDINGLIGHTS.mp3',
    cover: '/imgs/theweeknd1.jpg',   
  },
  {
    name: 'Sparks',
    artist: 'Coldplay',
    file: '/music/SPARKS.mp3',
    cover: '/imgs/coldplay2.jpg',
  },
  {
    name: 'The Scientist',
    artist: 'Coldplay',
    file: '/music/SCIENTIST.mp3',
    cover: '/imgs/coldplay1.jpg',
  },
  {
    name: 'Circles',
    artist: 'Post Malone',
    file: '/music/CIRCLES.mp3',
    cover: '/imgs/postmalone1.jpg',
  },
    {
    name: 'Let Her Go',
    artist: 'The Passenger',
    file: '/music/LETHERGO.mp3',
    cover: '/imgs/passenger1.jpg',
  },
      {
    name: 'Congratulations',
    artist: 'Post Malonr',
    file: '/music/CONGRATULATIONS.mp3',
    cover: '/imgs/postmalone2.jpg',
  },

]

/* ------------------------------------------------------------------ */
/* Saved songs (IndexedDB). Each song is stored with an "owner" key    */
/* so every user only sees their own added songs.                      */
/* ------------------------------------------------------------------ */
const DB_NAME = 'taskly-music'
const STORE_NAME = 'songs'

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'))
      return
    }
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('owner', 'owner')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function dbGetAll(owner) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).index('owner').getAll(owner)
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => db.close()
  })
}

async function dbPut(record) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(record)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

async function dbDelete(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

/* ---------------- small helpers ---------------- */
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// Read a song's length without playing it
function getAudioDuration(url) {
  return new Promise((resolve) => {
    const a = new Audio()
    a.preload = 'metadata'
    const done = (d) => {
      clearTimeout(timer)
      a.onloadedmetadata = null
      a.onerror = null
      resolve(isFinite(d) ? d : 0)
    }
    // some phones never load metadata for a detached <audio>, so don't wait forever
    const timer = setTimeout(() => done(0), 4000)
    a.onloadedmetadata = () => done(a.duration)
    a.onerror = () => done(0)
    a.src = url
  })
}

/* ------------------------------------------------------------------ */
/* Cover art: read the picture embedded inside an MP3 (ID3v2 tag).     */
/* `readHead(n)` must return the first n bytes of the file.            */
/* ------------------------------------------------------------------ */
async function extractCover(readHead) {
  try {
    const header = await readHead(10)
    if (!header || header.length < 10) return null
    // "ID3"
    if (header[0] !== 0x49 || header[1] !== 0x44 || header[2] !== 0x33) return null

    const version = header[3] // 2, 3 or 4
    const flags = header[5]
    const tagSize = (header[6] << 21) | (header[7] << 14) | (header[8] << 7) | header[9]
    if (!tagSize || tagSize > 8 * 1024 * 1024) return null

    const whole = await readHead(10 + tagSize)
    const buf = whole.slice(10)
    let pos = 0

    // skip extended header if present (v2.3 / v2.4)
    if (version >= 3 && flags & 0x40) {
      const extSize =
        version === 4
          ? (buf[0] << 21) | (buf[1] << 14) | (buf[2] << 7) | buf[3]
          : ((buf[0] << 24) | (buf[1] << 16) | (buf[2] << 8) | buf[3]) + 4
      pos += extSize
    }

    const idLen = version === 2 ? 3 : 4
    const headLen = version === 2 ? 6 : 10

    while (pos + headLen < buf.length) {
      const id = String.fromCharCode(...buf.slice(pos, pos + idLen))
      if (!/^[A-Z0-9]+$/.test(id)) break // padding reached

      let size
      if (version === 2) {
        size = (buf[pos + 3] << 16) | (buf[pos + 4] << 8) | buf[pos + 5]
      } else if (version === 4) {
        size = (buf[pos + 4] << 21) | (buf[pos + 5] << 14) | (buf[pos + 6] << 7) | buf[pos + 7]
      } else {
        size = (buf[pos + 4] << 24) | (buf[pos + 5] << 16) | (buf[pos + 6] << 8) | buf[pos + 7]
      }
      if (size <= 0) break

      const start = pos + headLen
      const end = start + size

      if (id === 'APIC' || id === 'PIC') {
        const frame = buf.slice(start, end)
        const encoding = frame[0]
        let i = 1
        let mime

        if (id === 'PIC') {
          const fmt = String.fromCharCode(frame[1], frame[2], frame[3]).toUpperCase()
          mime = fmt === 'PNG' ? 'image/png' : 'image/jpeg'
          i = 4
        } else {
          let m = i
          while (m < frame.length && frame[m] !== 0) m++
          mime = String.fromCharCode(...frame.slice(i, m)) || 'image/jpeg'
          if (mime === 'image/jpg') mime = 'image/jpeg'
          i = m + 1
        }

        i += 1 // picture type byte

        // skip description (null-terminated; UTF-16 uses a double null)
        if (encoding === 0 || encoding === 3) {
          while (i < frame.length && frame[i] !== 0) i++
          i += 1
        } else {
          while (i + 1 < frame.length && !(frame[i] === 0 && frame[i + 1] === 0)) i += 2
          i += 2
        }

        const data = frame.slice(i)
        if (data.length > 0) {
          return URL.createObjectURL(new Blob([data], { type: mime }))
        }
      }

      pos = end
    }
  } catch (err) {
    console.warn('Could not read cover art', err)
  }
  return null
}

// For files picked with "Add songs" (and for saved songs loaded back)
const coverFromFile = (file) =>
  extractCover(async (n) => new Uint8Array(await file.slice(0, n).arrayBuffer()))

// For files in public/music  (only downloads the first part of the file)
async function fetchHeadBytes(url, n) {
  const res = await fetch(url, { headers: { Range: `bytes=0-${n - 1}` } })
  if (!res.ok) throw new Error('fetch failed')
  if (!res.body || !res.body.getReader) {
    return new Uint8Array(await res.arrayBuffer()).slice(0, n)
  }
  const reader = res.body.getReader()
  const out = new Uint8Array(n)
  let got = 0
  while (got < n) {
    const { done, value } = await reader.read()
    if (done) break
    const take = Math.min(value.length, n - got)
    out.set(value.subarray(0, take), got)
    got += take
  }
  reader.cancel().catch(() => {})
  return out.slice(0, got)
}
const coverFromUrl = (url) => extractCover((n) => fetchHeadBytes(url, n))

function makeBuiltInTrack(song) {
  const file = song.file || ''
  return {
    id: file,
    name: song.name || file.split('/').pop(),
    artist: song.artist || '',
    url: /%[0-9A-Fa-f]{2}/.test(file) ? file : encodeURI(file),
    cover: song.cover || null,
    duration: 0,
    uploaded: false,
  }
}

function coverGradient(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360
  return `linear-gradient(135deg, hsl(${h} 65% 48%), hsl(${(h + 55) % 360} 65% 30%))`
}

function CoverArt({ track, iconSize = 20 }) {
  if (!track) return <MusicIcon size={iconSize} />
  if (track.cover) return <img src={track.cover} alt="" />
  const letter = (track.name || '').trim().charAt(0).toUpperCase()
  return (
    <span className="m-cover-fallback" style={{ background: coverGradient(track.name) }}>
      {letter || <MusicIcon size={iconSize} />}
    </span>
  )
}

function Equalizer() {
  return (
    <span className="m-eq" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  )
}

const musicStyles = `
/* colors come from your app; the fallbacks are used if a variable is missing */
.music-panel,
.music-bar,
.music-expanded-overlay {
  --m-bg: var(--bg-panel, #161d26);
  --m-raised: var(--bg-panel-raised, #1f2933);
  --m-border: var(--border-soft, #262f3a);
  --m-border-strong: var(--border, #3a4452);
  --m-text: var(--text-primary, #f3f4f6);
  --m-text2: var(--text-secondary, #c3cad3);
  --m-text3: var(--text-tertiary, #9aa5b1);
  --m-accent: var(--accent, #2dd4bf);
  --m-accent-ink: var(--accent-ink, #04201c);
  --m-accent-soft: rgba(45, 212, 191, 0.12);
  --m-r-sm: var(--radius-sm, 8px);
  --m-r-md: var(--radius-md, 12px);
  --m-r-lg: var(--radius-lg, 16px);
}

@supports (background: color-mix(in srgb, red 10%, transparent)) {
  .music-panel,
  .music-bar,
  .music-expanded-overlay {
    --m-accent-soft: color-mix(in srgb, var(--m-accent) 13%, transparent);
  }
}

.music-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: m-panel-in 0.4s ease both;
}

@keyframes m-panel-in {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* leave room so the bottom bar never covers the last song */
.music-panel--has-bar {
  padding-bottom: 104px;
}

/* ---------- cards ---------- */
.m-card {
  background: var(--m-bg);
  border: 1px solid var(--m-border);
  border-radius: var(--m-r-lg);
  padding: 20px;
  transition: border-color 0.25s ease;
  animation: m-card-in 0.45s ease both;
}

@keyframes m-card-in {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}

.m-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.m-card__title {
  margin: 0 0 2px;
  font-size: 17px;
  font-weight: 700;
  color: var(--m-text);
}

.m-card__sub {
  margin: 0;
  font-size: 13px;
  color: var(--m-text3);
}

.m-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: var(--m-r-sm);
  border: none;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  transition: transform 0.15s ease, filter 0.15s ease, box-shadow 0.2s ease;
}

.m-btn--accent {
  background: var(--m-accent);
  color: var(--m-accent-ink);
  box-shadow: 0 2px 10px rgba(45, 212, 191, 0.25);
}

.m-btn--accent::before {
  content: '';
  position: absolute;
  top: 0;
  left: -75%;
  width: 50%;
  height: 100%;
  background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.45), transparent);
  transform: skewX(-20deg);
  transition: left 0.5s ease;
}

.m-btn--accent:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
  box-shadow: 0 6px 18px rgba(45, 212, 191, 0.4);
}

.m-btn--accent:hover::before {
  left: 130%;
}

.m-btn--accent:active {
  transform: translateY(0) scale(0.97);
}

.m-btn input[type="file"] {
  display: none;
}

.m-error {
  margin: 0 0 12px;
  color: #f87171;
  font-size: 13px;
  animation: m-error-in 0.25s ease both;
}

@keyframes m-error-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.m-hint {
  margin: 14px 2px 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--m-text3);
}

/* ---------- song list ---------- */
.m-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.m-track {
  display: grid;
  grid-template-columns: 40px 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 10px 12px;
  border-radius: var(--m-r-md);
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;
  animation: m-track-in 0.3s ease both;
}

.m-list .m-track:nth-child(1) { animation-delay: 0.02s; }
.m-list .m-track:nth-child(2) { animation-delay: 0.05s; }
.m-list .m-track:nth-child(3) { animation-delay: 0.08s; }
.m-list .m-track:nth-child(4) { animation-delay: 0.11s; }
.m-list .m-track:nth-child(5) { animation-delay: 0.14s; }
.m-list .m-track:nth-child(n+6) { animation-delay: 0.17s; }

@keyframes m-track-in {
  from { opacity: 0; transform: translateX(-6px); }
  to   { opacity: 1; transform: translateX(0); }
}

.m-track:hover {
  background: var(--m-raised);
  transform: translateX(2px);
}

.m-track:focus-visible {
  outline: 2px solid var(--m-accent);
  outline-offset: 2px;
}

.m-track--active {
  background: var(--m-accent-soft);
  box-shadow: inset 3px 0 0 var(--m-accent);
}

.m-track--active:hover {
  background: var(--m-accent-soft);
}

.m-track__play {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--m-border-strong);
  background: var(--m-raised);
  color: var(--m-text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease, box-shadow 0.2s ease;
}

.m-track:hover .m-track__play,
.m-track--active .m-track__play {
  background: var(--m-accent);
  border-color: var(--m-accent);
  color: var(--m-accent-ink);
}

.m-track--active .m-track__play {
  box-shadow: 0 0 0 4px var(--m-accent-soft);
}

.m-track__play:hover {
  transform: scale(1.1);
}

.m-track__play:active {
  transform: scale(0.92);
}

.m-cover {
  background: var(--m-raised);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--m-accent);
  overflow: hidden;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.m-track:hover .m-cover {
  transform: scale(1.04);
}

.m-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.m-cover-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 1.2em;
}

.m-track__cover {
  width: 48px;
  height: 48px;
  border-radius: var(--m-r-sm);
  font-size: 18px;
}

.m-track__meta {
  min-width: 0;
}

.m-track__name {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--m-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.m-track--active .m-track__name {
  color: var(--m-accent);
}

.m-track__sub {
  margin-top: 2px;
  min-height: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--m-text3);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.m-track__time {
  font-size: 13px;
  color: var(--m-text3);
  font-variant-numeric: tabular-nums;
}

/* duration + delete button on the right side of each row */
.m-track__end {
  display: flex;
  align-items: center;
  gap: 6px;
}

.m-track__delete,
.m-track__delete-spacer {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.m-track__delete {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: none;
  color: var(--m-text3);
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease, transform 0.15s ease;
}

.m-track__delete:hover {
  color: #f87171;
  background: rgba(239, 68, 68, 0.12);
  transform: scale(1.1);
}

.m-track__delete:active {
  transform: scale(0.92);
}

.m-track__delete:focus-visible {
  outline: 2px solid #f87171;
  outline-offset: 2px;
}

/* little bars that move only while the song plays */
.m-eq {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 12px;
}

.m-eq span {
  width: 3px;
  height: 3px;
  border-radius: 1px;
  background: var(--m-accent);
  animation: m-eq 0.9s ease-in-out infinite;
}

.m-eq span:nth-child(2) { animation-delay: 0.2s; }
.m-eq span:nth-child(3) { animation-delay: 0.4s; }

@keyframes m-eq {
  0%, 100% { height: 3px; }
  50% { height: 12px; }
}

@media (prefers-reduced-motion: reduce) {
  .m-eq span { animation: none; height: 8px; }
}

/* empty list */
.m-empty {
  border: 1px dashed var(--m-border-strong);
  border-radius: var(--m-r-md);
  padding: 28px 20px;
  text-align: center;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--m-text3);
  animation: m-empty-in 0.3s ease both;
}

@keyframes m-empty-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.m-empty strong {
  display: block;
  margin-bottom: 4px;
  font-size: 15px;
  color: var(--m-text);
}

.m-empty code {
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--m-raised);
  color: var(--m-text2);
  font-size: 12.5px;
}

/* ---------- bottom bar ---------- */
/* ---------- bottom bar ---------- */
.music-bar {
  position: fixed;
  left: 50%;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  width: min(640px, calc(100% - 24px));
  box-sizing: border-box;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 14px 18px;
  background: var(--m-raised);
  border: 1px solid var(--m-border-strong);
  border-radius: 18px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
  color: var(--m-text);
  cursor: pointer;
  animation: music-bar-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes music-bar-in {
  from { opacity: 0; transform: translate(-50%, 20px); }
  to   { opacity: 1; transform: translate(-50%, 0); }
}

@media (prefers-reduced-motion: reduce) {
  .music-bar { animation: none; }
}

.music-bar__art {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  font-size: 20px;
  transition: transform 0.3s ease;
}

.music-bar__info {
  flex: 1;
  min-width: 0;
}

.music-bar__title {
  font-size: 14.5px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-bar__time {
  margin-top: 2px;
  font-size: 12px;
  color: var(--m-text3);
  font-variant-numeric: tabular-nums;
}

.music-bar__controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.music-bar__skip {
  display: flex;
  padding: 6px;
  border: none;
  background: none;
  color: var(--m-text2);
  cursor: pointer;
  transition: color 0.15s ease, transform 0.15s ease;
}

.music-bar__skip:hover {
  color: var(--m-text);
  transform: scale(1.15);
}

.music-bar__skip:active {
  transform: scale(0.9);
}

.music-bar__play {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: none;
  background: var(--m-accent);
  color: var(--m-accent-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s ease, filter 0.15s ease, box-shadow 0.2s ease;
  box-shadow: 0 4px 14px rgba(45, 212, 191, 0.35);
}

.music-bar__play:hover {
  transform: scale(1.08);
  filter: brightness(1.05);
  box-shadow: 0 6px 18px rgba(45, 212, 191, 0.5);
}

.music-bar__play:active {
  transform: scale(0.95);
}

/* X button in the top-right corner of the player */
.music-bar__close {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: 50%;
  border: 1px solid var(--m-border-strong);
  background: var(--m-raised);
  color: var(--m-text2);
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  transition: color 0.15s ease, background 0.15s ease, transform 0.15s ease, border-color 0.15s ease;
}

.music-bar__close:hover {
  color: #f87171;
  border-color: #f87171;
  background: rgba(239, 68, 68, 0.12);
  transform: scale(1.1);
}

.music-bar__close:active {
  transform: scale(0.92);
}

/* drag or tap to jump to any part of the song */
.music-bar__seek {
  position: absolute;
  left: 14px;
  bottom: 3px;
  width: calc(100% - 28px);
  height: 12px;
  margin: 0;
  padding: 0;
  background: transparent;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.music-bar__seek:disabled {
  cursor: default;
}

.music-bar__seek::-webkit-slider-runnable-track {
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(to right, var(--m-accent) var(--pct, 0%), var(--m-border-strong) var(--pct, 0%));
  transition: background 0.1s linear;
}

.music-bar__seek::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 10px;
  height: 10px;
  margin-top: -3.5px;
  border-radius: 50%;
  background: var(--m-accent);
  transition: transform 0.15s ease;
}

.music-bar__seek:hover::-webkit-slider-thumb {
  transform: scale(1.3);
}

.music-bar__seek::-moz-range-track {
  height: 3px;
  border-radius: 2px;
  background: var(--m-border-strong);
}

.music-bar__seek::-moz-range-progress {
  height: 3px;
  border-radius: 2px;
  background: var(--m-accent);
}

.music-bar__seek::-moz-range-thumb {
  width: 10px;
  height: 10px;
  border: none;
  border-radius: 50%;
  background: var(--m-accent);
  transition: transform 0.15s ease;
}

.music-bar__seek:hover::-moz-range-thumb {
  transform: scale(1.3);
}

@media (max-width: 480px) {
  .m-track {
    grid-template-columns: 40px 44px minmax(0, 1fr) auto;
    gap: 10px;
  }
  .m-track__cover {
    width: 44px;
    height: 44px;
  }
  .music-bar__skip--prev {
    display: none;
  }
}

/* ---------- expanded (full-screen) player ---------- */
.music-expanded-overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  color: #fff;
  overflow: hidden;
  animation: music-expand-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes music-expand-in {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .music-expanded-overlay { animation: none; }
}

.music-expanded-overlay__bg {
  position: absolute;
  inset: -10%;
  z-index: 0;
  filter: blur(60px) saturate(1.3);
  transform: scale(1.1);
  transition: background 0.4s ease;
}

.music-expanded-overlay__scrim {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.35) 0%,
    rgba(0, 0, 0, 0.55) 45%,
    rgba(0, 0, 0, 0.88) 100%
  );
}

.music-expanded {
  position: relative;
  z-index: 2;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: max(18px, env(safe-area-inset-top, 0px)) 22px calc(30px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
}

.music-expanded__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.music-expanded__icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease, transform 0.15s ease;
}

.music-expanded__icon-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.06);
}

.music-expanded__icon-btn:active {
  transform: scale(0.92);
}

.music-expanded__eyebrow {
  font-size: 11px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.72);
  font-weight: 800;
}

.music-expanded__art-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
}

.music-expanded__art {
  width: min(340px, 74vw);
  height: min(340px, 74vw);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.55);
  font-size: 72px;
  flex-shrink: 0;
}

.music-expanded__info {
  flex-shrink: 0;
  margin-bottom: 18px;
}

.music-expanded__title {
  font-size: 22px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-expanded__artist {
  margin-top: 4px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.72);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-expanded__seek-wrap {
  flex-shrink: 0;
  margin-bottom: 6px;
}

.music-expanded__seek {
  width: 100%;
  height: 16px;
  margin: 0;
  padding: 0;
  background: transparent;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.music-expanded__seek:disabled {
  cursor: default;
}

.music-expanded__seek::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(to right, #fff var(--pct, 0%), rgba(255, 255, 255, 0.25) var(--pct, 0%));
  transition: background 0.1s linear;
}

.music-expanded__seek::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  margin-top: -4px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.15s ease;
}

.music-expanded__seek:hover::-webkit-slider-thumb {
  transform: scale(1.3);
}

.music-expanded__seek::-moz-range-track {
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.25);
}

.music-expanded__seek::-moz-range-progress {
  height: 4px;
  border-radius: 2px;
  background: #fff;
}

.music-expanded__seek::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: none;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.15s ease;
}

.music-expanded__seek:hover::-moz-range-thumb {
  transform: scale(1.3);
}

.music-expanded__times {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.65);
  font-variant-numeric: tabular-nums;
}

.music-expanded__controls {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 30px;
  margin-top: 10px;
}

.music-expanded__skip {
  border: none;
  background: none;
  color: #fff;
  display: flex;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.music-expanded__skip:hover {
  transform: scale(1.12);
}

.music-expanded__skip:active {
  transform: scale(0.9);
}

.music-expanded__play {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: none;
  background: #fff;
  color: #111;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
  transition: transform 0.15s ease, filter 0.15s ease;
}

.music-expanded__play:hover {
  transform: scale(1.06);
}

.music-expanded__play:active {
  transform: scale(0.94);
}
`

export default function Music({ storageKey = 'guest', onBarChange }) {
  const [tracks, setTracks] = useState(() => MY_SONGS.map(makeBuiltInTrack))
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [audioError, setAudioError] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  const audioRef = useRef(null)
  const tracksRef = useRef([])
  const shouldAutoPlay = useRef(false)

  const activeTrack = tracks[activeIndex] || null

  // keep a ref so we can clean up blob URLs on unmount
  useEffect(() => {
    tracksRef.current = tracks
  }, [tracks])

  useEffect(() => {
    return () => {
      tracksRef.current.forEach((t) => {
        if (t.url && t.url.startsWith('blob:')) URL.revokeObjectURL(t.url)
        if (t.cover && t.cover.startsWith('blob:')) URL.revokeObjectURL(t.cover)
      })
    }
  }, [])

  // Songs from MY_SONGS: find each one's cover and length in the background
  useEffect(() => {
    let cancelled = false
    MY_SONGS.map(makeBuiltInTrack).forEach(async (t) => {
      const [cover, dur] = await Promise.all([
        t.cover ? Promise.resolve(null) : coverFromUrl(t.url),
        getAudioDuration(t.url),
      ])
      if (cancelled) {
        if (cover) URL.revokeObjectURL(cover)
        return
      }
      setTracks((prev) =>
        prev.map((x) =>
          x.id === t.id ? { ...x, cover: x.cover || cover, duration: dur || x.duration } : x
        )
      )
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Load the songs this user added before (saved in IndexedDB)
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      let saved = []
      try {
        saved = await dbGetAll(storageKey)
      } catch (err) {
        console.warn('Could not load saved songs', err)
        return
      }
      if (cancelled || saved.length === 0) return

      saved.sort((a, b) => a.addedAt - b.addedAt)

      const restored = saved.map((rec) => ({
        id: rec.id,
        file: rec.blob,
        name: rec.name,
        artist: '',
        url: URL.createObjectURL(rec.blob),
        cover: null,
        duration: 0,
        uploaded: true,
      }))

      setTracks((prev) => {
        const have = new Set(prev.map((t) => t.id))
        return [...prev, ...restored.filter((t) => !have.has(t.id))]
      })

      // fill in cover photo + duration in the background
      restored.forEach(async (t) => {
        const [cover, dur] = await Promise.all([coverFromFile(t.file), getAudioDuration(t.url)])
        if (cancelled) {
          if (cover) URL.revokeObjectURL(cover)
          return
        }
        setTracks((prev) =>
          prev.map((x) =>
            x.id === t.id ? { ...x, cover: cover || x.cover, duration: dur || x.duration } : x
          )
        )
      })
    })()

    return () => {
      cancelled = true
    }
  }, [storageKey])
  

    useEffect(() => {
      if (shouldAutoPlay.current && audioRef.current && activeTrack) {
        shouldAutoPlay.current = false
        audioRef.current.play().catch(() => setIsPlaying(false))
      }
    }, [activeTrack])

    // Tell the parent app whether the mini player bar is currently showing
    useEffect(() => {
      onBarChange?.(!!activeTrack)
    }, [activeTrack, onBarChange])

  // Lock page scroll while the full-screen player is open
  useEffect(() => {
    if (!isExpanded) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [isExpanded])

  // Esc collapses the full-screen player back to the mini bar
  useEffect(() => {
    if (!isExpanded) return
    const onKey = (e) => {
      if (e.key === 'Escape') setIsExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isExpanded])

  /* ---------------- actions ---------------- */
  const handleFiles = (e) => {
    const files = Array.from(e.target.files)
    e.target.value = ''
    if (files.length === 0) return

    const now = Date.now()

    // 1) show the songs right away
    const newTracks = files.map((file, i) => {
      const url = URL.createObjectURL(file)
      return {
        id: `${now + i}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        name: file.name.replace(/\.[^/.]+$/, ''),
        artist: '',
        url,
        cover: null,
        duration: 0,
        uploaded: true,
        addedAt: now + i,
      }
    })
    setTracks((prev) => [...prev, ...newTracks])

    // 2) save each song so it is still here after logout / refresh
    newTracks.forEach(async (t) => {
      try {
        await dbPut({
          id: t.id,
          owner: storageKey,
          name: t.name,
          blob: t.file,
          addedAt: t.addedAt,
        })
      } catch (err) {
        console.warn('Could not save song', err)
        setAudioError(
          `"${t.name}" could not be saved (storage may be full or blocked). It will disappear when you refresh.`
        )
      }
    })

    // 3) fill in cover photo + duration in the background
    newTracks.forEach(async (t) => {
      const [cover, dur] = await Promise.all([coverFromFile(t.file), getAudioDuration(t.url)])
      setTracks((prev) =>
        prev.map((x) =>
          x.id === t.id ? { ...x, cover: cover || x.cover, duration: dur || x.duration } : x
        )
      )
    })
  }

  // Delete a song you added (songs from MY_SONGS cannot be deleted here)
  const removeTrack = async (track) => {
    if (!track.uploaded) return
    if (!window.confirm(`Delete "${track.name}"?`)) return

    const removeIndex = tracks.findIndex((t) => t.id === track.id)
    if (removeIndex === -1) return

    try {
      await dbDelete(track.id)
    } catch (err) {
      console.warn('Could not delete saved song', err)
    }

    if (removeIndex === activeIndex) {
      // the song that is playing was deleted: stop the player
      shouldAutoPlay.current = false
      const a = audioRef.current
      if (a) {
        a.pause()
        a.removeAttribute('src')
        a.load()
      }
      setIsPlaying(false)
      setCurrentTime(0)
      setDuration(0)
      setActiveIndex(-1)
      setIsExpanded(false)
    } else if (removeIndex < activeIndex) {
      setActiveIndex(activeIndex - 1)
    }

    setTracks((prev) => prev.filter((t) => t.id !== track.id))

    if (track.url && track.url.startsWith('blob:')) URL.revokeObjectURL(track.url)
    if (track.cover && track.cover.startsWith('blob:')) URL.revokeObjectURL(track.cover)
  }

  const togglePlay = () => {
    if (!activeTrack || !audioRef.current) return
    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => {})
    } else {
      audioRef.current.pause()
    }
  }

  const selectTrack = (index) => {
    setAudioError('')
    if (index === activeIndex && audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
      return
    }
    shouldAutoPlay.current = true
    setCurrentTime(0)
    setActiveIndex(index)
  }

  const skip = (dir) => {
    if (tracks.length === 0) return
    const next = (activeIndex + dir + tracks.length) % tracks.length
    selectTrack(next)
  }

  // X button: stop the song and close the bottom player
  const closePlayer = () => {
    shouldAutoPlay.current = false
    const a = audioRef.current
    if (a) {
      a.pause()
      a.removeAttribute('src')
      a.load()
    }
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setAudioError('')
    setActiveIndex(-1)
    setIsExpanded(false)
  }

  /* ---------------- bottom bar ---------------- */
  let bar = null
  if (activeTrack) {
    bar = {
      title: activeTrack.name,
      artist: activeTrack.artist,
      coverTrack: activeTrack,
      playing: isPlaying,
      time: currentTime,
      dur: duration,
      onToggle: togglePlay,
      onClose: closePlayer,
      onSeek: (t) => {
        if (!audioRef.current) return
        audioRef.current.currentTime = t
        setCurrentTime(t)
      },
      onPrev: tracks.length > 1 ? () => skip(-1) : null,
      onNext: tracks.length > 1 ? () => skip(1) : null,
    }
  }
  const progressPct = bar && bar.dur ? Math.min(100, (bar.time / bar.dur) * 100) : 0

  return (
    <div className={`music-panel${bar ? ' music-panel--has-bar' : ''}`}>
      <style>{musicStyles}</style>

      {/* One audio element for all your own songs */}
      <audio
        ref={audioRef}
        preload="metadata"
        src={activeTrack ? activeTrack.url : undefined}
        onPlay={() => {
          setIsPlaying(true)
          setAudioError('')
        }}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration
          setDuration(d)
          if (activeTrack && d && isFinite(d)) {
            setTracks((prev) =>
              prev.map((t) =>
                t.id === activeTrack.id && !t.duration ? { ...t, duration: d } : t
              )
            )
          }
        }}
        onEnded={() => {
          if (tracks.length > 1) skip(1)
        }}
        onError={() => {
          if (!activeTrack) return
          setIsPlaying(false)
          setAudioError(
            activeTrack.uploaded
              ? `"${activeTrack.name}" couldn't be played.`
              : `"${activeTrack.name}" couldn't be played. Check its file path in MY_SONGS.`
          )
        }}
      />

      {/* ---------------- My music ---------------- */}
      <section className="m-card">
        <div className="m-card__head">
          <div>
            <h2 className="m-card__title">My music</h2>
            <p className="m-card__sub">
              {tracks.length === 0
                ? 'No songs yet'
                : `${tracks.length} song${tracks.length > 1 ? 's' : ''}`}
            </p>
          </div>
          <label className="m-btn m-btn--accent">
            <Upload size={16} />
            Add songs
            <input type="file" accept="audio/*" multiple onChange={handleFiles} />
          </label>
        </div>

        {audioError && <p className="m-error">{audioError}</p>}

        {tracks.length === 0 ? (
          <div className="m-empty">
            <strong>Your songs will show up here</strong>
            Tap <em>Add songs</em>, or put MP3 files in <code>public/music</code> and list them in{' '}
            <code>MY_SONGS</code> at the top of this file.
          </div>
        ) : (
          <div className="m-list">
            {tracks.map((track, i) => {
              const isActive = i === activeIndex
              const isThisPlaying = isActive && isPlaying
              const activate = () => (isActive ? togglePlay() : selectTrack(i))
              return (
                <div
                  key={track.id}
                  className={`m-track${isActive ? ' m-track--active' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={activate}
                  onKeyDown={(e) => {
                    // ignore keys pressed on the buttons inside the row
                    if (e.target !== e.currentTarget) return
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      activate()
                    }
                  }}
                >
                  <button
                    type="button"
                    className="m-track__play"
                    tabIndex={-1}
                    aria-label={isThisPlaying ? `Pause ${track.name}` : `Play ${track.name}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      activate()
                    }}
                  >
                    {isThisPlaying ? <Pause size={17} /> : <Play size={17} style={{ marginLeft: 2 }} />}
                  </button>

                  <div className="m-cover m-track__cover">
                    <CoverArt track={track} />
                  </div>

                  <div className="m-track__meta">
                    <div className="m-track__name">{track.name}</div>
                    <div className="m-track__sub">
                      {isThisPlaying ? (
                        <>
                          <Equalizer /> Playing
                        </>
                      ) : isActive ? (
                        'Paused'
                      ) : (
                        track.artist
                      )}
                    </div>
                  </div>

                  <div className="m-track__end">
                    <span className="m-track__time">{formatDuration(track.duration)}</span>
                    {track.uploaded ? (
                      <button
                        type="button"
                        className="m-track__delete"
                        aria-label={`Delete ${track.name}`}
                        title="Delete song"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeTrack(track)
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : (
                      <span className="m-track__delete-spacer" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tracks.some((t) => t.uploaded) && (
          <p className="m-hint">
            Songs you add are saved in this browser for your account, so they stay after you log
            out. Use the trash icon to delete one. Clearing your browser data will remove them.
          </p>
        )}
      </section>

      {/* ---------------- Bottom bar (tap it to expand, like Spotify) ---------------- */}
      {bar &&
        createPortal(
          <div
            className="music-bar"
            role="button"
            tabIndex={0}
            aria-label={`Now playing: ${bar.title}. Tap to open full player.`}
            onClick={() => setIsExpanded(true)}
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setIsExpanded(true)
              }
            }}
          >
            <div className="m-cover music-bar__art">
              <CoverArt track={bar.coverTrack} iconSize={22} />
            </div>

            <div className="music-bar__info">
              <div className="music-bar__title">{bar.title}</div>
              <div className="music-bar__time">
                {formatDuration(bar.time)} / {formatDuration(bar.dur)}
              </div>
            </div>

            <div className="music-bar__controls">
              {bar.onPrev && (
                <button
                  className="music-bar__skip music-bar__skip--prev"
                  onClick={(e) => {
                    e.stopPropagation()
                    bar.onPrev()
                  }}
                  aria-label="Previous"
                >
                  <SkipBack size={18} />
                </button>
              )}
              <button
                className="music-bar__play"
                onClick={(e) => {
                  e.stopPropagation()
                  bar.onToggle()
                }}
                aria-label={bar.playing ? 'Pause' : 'Play'}
              >
                {bar.playing ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 2 }} />}
              </button>
              {bar.onNext && (
                <button
                  className="music-bar__skip"
                  onClick={(e) => {
                    e.stopPropagation()
                    bar.onNext()
                  }}
                  aria-label="Next"
                >
                  <SkipForward size={18} />
                </button>
              )}
            </div>

            <button
              type="button"
              className="music-bar__close"
              onClick={(e) => {
                e.stopPropagation()
                bar.onClose()
              }}
              aria-label="Close player"
              title="Close player"
            >
              <X size={14} />
            </button>

            <input
              type="range"
              className="music-bar__seek"
              aria-label="Seek"
              min="0"
              max={bar.dur || 0}
              step="0.1"
              value={Math.min(bar.time, bar.dur || 0)}
              disabled={!bar.dur}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onChange={(e) => bar.onSeek(Number(e.target.value))}
              style={{ '--pct': `${progressPct}%` }}
            />
          </div>,
          document.body
        )}

      {/* ---------------- Full-screen expanded player ---------------- */}
      {bar &&
        isExpanded &&
        createPortal(
          <div className="music-expanded-overlay" role="dialog" aria-modal="true" aria-label="Now playing">
            <div
              className="music-expanded-overlay__bg"
              style={{ background: bar.coverTrack.cover ? undefined : coverGradient(bar.coverTrack.name) }}
            >
              {bar.coverTrack.cover && (
                <img
                  src={bar.coverTrack.cover}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </div>
            <div className="music-expanded-overlay__scrim" />

            <div className="music-expanded">
              <div className="music-expanded__top">
                <button
                  type="button"
                  className="music-expanded__icon-btn"
                  onClick={() => setIsExpanded(false)}
                  aria-label="Minimize player"
                  title="Minimize"
                >
                  <ChevronDown size={22} />
                </button>
                <span className="music-expanded__eyebrow">Now Playing</span>
                <button
                  type="button"
                  className="music-expanded__icon-btn"
                  onClick={bar.onClose}
                  aria-label="Close player"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="music-expanded__art-wrap">
                <div className="m-cover music-expanded__art">
                  <CoverArt track={bar.coverTrack} iconSize={64} />
                </div>
              </div>

              <div className="music-expanded__info">
                <div className="music-expanded__title">{bar.title}</div>
                {bar.artist && <div className="music-expanded__artist">{bar.artist}</div>}
              </div>

              <div className="music-expanded__seek-wrap">
                <input
                  type="range"
                  className="music-expanded__seek"
                  aria-label="Seek"
                  min="0"
                  max={bar.dur || 0}
                  step="0.1"
                  value={Math.min(bar.time, bar.dur || 0)}
                  disabled={!bar.dur}
                  onChange={(e) => bar.onSeek(Number(e.target.value))}
                  style={{ '--pct': `${progressPct}%` }}
                />
                <div className="music-expanded__times">
                  <span>{formatDuration(bar.time)}</span>
                  <span>{formatDuration(bar.dur)}</span>
                </div>
              </div>

              <div className="music-expanded__controls">
                {bar.onPrev ? (
                  <button className="music-expanded__skip" onClick={bar.onPrev} aria-label="Previous">
                    <SkipBack size={26} />
                  </button>
                ) : (
                  <span style={{ width: 26 }} />
                )}
                <button
                  className="music-expanded__play"
                  onClick={bar.onToggle}
                  aria-label={bar.playing ? 'Pause' : 'Play'}
                >
                  {bar.playing ? <Pause size={28} /> : <Play size={28} style={{ marginLeft: 3 }} />}
                </button>
                {bar.onNext ? (
                  <button className="music-expanded__skip" onClick={bar.onNext} aria-label="Next">
                    <SkipForward size={26} />
                  </button>
                ) : (
                  <span style={{ width: 26 }} />
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}