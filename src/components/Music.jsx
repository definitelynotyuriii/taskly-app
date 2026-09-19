import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Upload, Play, Pause, SkipBack, SkipForward, Music as MusicIcon } from 'lucide-react'

/* ==================================================================
   MY MUSIC  —  how to add songs that are already on your computer
   ------------------------------------------------------------------
   1. Copy your MP3 files into the folder:   public/music/
      (create the folder if it doesn't exist. Tip: use file names
       without spaces, like  my-song.mp3 )
   2. Add one line per song in the list below.
        name   = what shows in the app
        file   = the path, always starting with  /music/
        artist = (optional) small text under the name
        cover  = (optional) a picture, e.g. /music/covers/my-song.jpg
                 If you skip it, the app reads the cover inside the
                 MP3 file. If there is none, it shows a colored square.
   3. Save. The songs appear in "My music" with a play button and duration.
   ================================================================== */
const MY_SONGS = [
  // { name: 'My First Song', file: '/music/my-first-song.mp3' },
  // { name: 'Another Song', artist: 'Me', file: '/music/another-song.mp3', cover: '/music/covers/another-song.jpg' },
]

/* ==================================================================
   YOUTUBE BUTTONS  —  each button plays a YouTube link
   ================================================================== */
const FEATURED_PLAYLISTS = [
  // { name: 'My next song', url: 'PASTE_YOUTUBE_LINK_HERE' },
]

/* ---------------- YouTube (official embedded player) ---------------- */
let ytApiPromise = null
function loadYouTubeApi() {
  if (ytApiPromise) return ytApiPromise
  ytApiPromise = new Promise((resolve, reject) => {
    if (window.YT && window.YT.Player) return resolve(window.YT)
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === 'function') previous()
      resolve(window.YT)
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.onerror = () => {
      ytApiPromise = null
      reject(new Error('YouTube API could not load'))
    }
    document.body.appendChild(script)
  })
  return ytApiPromise
}

// Accepts watch links, youtu.be, shorts, music.youtube.com and playlist links
function parseYouTubeLink(input) {
  const text = (input || '').trim()
  if (!text) return null
  let url
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`)
  } catch (err) {
    return null
  }
  const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '')
  let videoId = null
  if (host === 'youtu.be') {
    videoId = url.pathname.slice(1).split('/')[0]
  } else if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') {
      videoId = url.searchParams.get('v')
    } else {
      const m = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/)
      if (m) videoId = m[1]
    }
  } else {
    return null
  }
  const listId = url.searchParams.get('list')
  if (videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)) return { videoId, listId: null }
  if (listId && /^[A-Za-z0-9_-]+$/.test(listId)) return { videoId: null, listId }
  return null
}

function applyYouTubeSource(player, src) {
  if (src.videoId) player.loadVideoById(src.videoId)
  else player.loadPlaylist({ listType: 'playlist', list: src.listId })
}

function readYouTube(player) {
  try {
    if (!player || !player.getPlayerState) return null
    const vd = (player.getVideoData && player.getVideoData()) || {}
    return {
      state: player.getPlayerState(),
      time: player.getCurrentTime() || 0,
      dur: player.getDuration() || 0,
      title: vd.title || '',
      videoId: vd.video_id || '',
    }
  } catch (err) {
    return null
  }
}

function pauseYouTubePlayer(playerRef) {
  try {
    const p = playerRef.current
    if (p && p.getPlayerState && p.getPlayerState() === 1) p.pauseVideo()
  } catch (err) {
    /* ignore */
  }
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

// For files picked with "Add songs"
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
.music-bar {
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
  .music-bar {
    --m-accent-soft: color-mix(in srgb, var(--m-accent) 13%, transparent);
  }
}

.music-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
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
  transition: transform 0.15s ease, filter 0.15s ease;
}

.m-btn--accent {
  background: var(--m-accent);
  color: var(--m-accent-ink);
}

.m-btn--accent:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
}

.m-btn input[type="file"] {
  display: none;
}

.m-error {
  margin: 0 0 12px;
  color: #f87171;
  font-size: 13px;
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
  transition: background 0.15s ease;
}

.m-track:hover {
  background: var(--m-raised);
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
  transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
}

.m-track:hover .m-track__play,
.m-track--active .m-track__play {
  background: var(--m-accent);
  border-color: var(--m-accent);
  color: var(--m-accent-ink);
}

.m-track__play:hover {
  transform: scale(1.08);
}

.m-cover {
  background: var(--m-raised);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--m-accent);
  overflow: hidden;
  flex-shrink: 0;
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

/* ---------- YouTube card ---------- */
.m-form {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.m-input {
  flex: 1 1 260px;
  min-width: 0;
  background: var(--m-raised);
  border: 1px solid var(--m-border-strong);
  border-radius: var(--m-r-sm);
  padding: 11px 14px;
  color: var(--m-text);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s ease;
}

.m-input:focus {
  border-color: var(--m-accent);
}

.m-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 14px;
}

.m-chip {
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--m-border-strong);
  background: var(--m-raised);
  color: var(--m-text);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}

.m-chip:hover {
  border-color: var(--m-accent);
}

.m-chip--active {
  border-color: var(--m-accent);
  background: var(--m-accent-soft);
  color: var(--m-accent);
}

.m-player {
  margin-top: 16px;
  max-width: 720px;
}

.youtube-embed-host {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: var(--m-r-md);
  overflow: hidden;
  background: #000;
}

.youtube-embed-host iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

/* ---------- bottom bar ---------- */
.music-bar {
  position: fixed;
  left: 50%;
  bottom: 16px;
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
  animation: music-bar-in 0.25s ease-out;
}

@keyframes music-bar-in {
  from { opacity: 0; transform: translate(-50%, 12px); }
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
  transition: color 0.15s ease;
}

.music-bar__skip:hover {
  color: var(--m-text);
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
  transition: transform 0.15s ease, filter 0.15s ease;
}

.music-bar__play:hover {
  transform: scale(1.06);
  filter: brightness(1.05);
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
}

.music-bar__seek::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 10px;
  height: 10px;
  margin-top: -3.5px;
  border-radius: 50%;
  background: var(--m-accent);
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
`

export default function Music() {
  const [tracks, setTracks] = useState(() => MY_SONGS.map(makeBuiltInTrack))
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [audioError, setAudioError] = useState('')
  const [activeSource, setActiveSource] = useState(null) // 'local' | 'youtube'

  const [youtubeInput, setYoutubeInput] = useState('')
  const [ytSource, setYtSource] = useState(null) // { videoId, listId }
  const [ytNow, setYtNow] = useState(null) // live info from the YouTube player
  const [ytError, setYtError] = useState('')

  const audioRef = useRef(null)
  const tracksRef = useRef([])
  const shouldAutoPlay = useRef(false)
  const ytHostRef = useRef(null)
  const ytPlayerRef = useRef(null)
  const ytReadyRef = useRef(false)
  const pendingYtRef = useRef(null)

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

  // Auto-play once the new track's audio has been swapped in
  useEffect(() => {
    if (shouldAutoPlay.current && audioRef.current && activeTrack) {
      shouldAutoPlay.current = false
      audioRef.current.play().catch(() => setIsPlaying(false))
    }
  }, [activeTrack])

  /* ---- YouTube: create the player (or load a new link into it) ---- */
  useEffect(() => {
    if (!ytSource) return
    let cancelled = false

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return

        // player already exists -> just load the new link into it
        if (ytPlayerRef.current) {
          if (ytReadyRef.current) applyYouTubeSource(ytPlayerRef.current, ytSource)
          else pendingYtRef.current = ytSource
          return
        }

        const host = ytHostRef.current
        if (!host) return
        const el = document.createElement('div')
        host.appendChild(el)

        ytPlayerRef.current = new YT.Player(el, {
          width: '100%',
          height: '100%',
          videoId: ytSource.videoId || undefined,
          playerVars: {
            playsinline: 1,
            rel: 0,
            autoplay: 1,
            ...(ytSource.videoId ? {} : { listType: 'playlist', list: ytSource.listId }),
          },
          events: {
            onReady: () => {
              ytReadyRef.current = true
              if (pendingYtRef.current) {
                applyYouTubeSource(ytPlayerRef.current, pendingYtRef.current)
                pendingYtRef.current = null
              }
            },
            onStateChange: (e) => {
              if (e.data === 1) {
                // YouTube started: show it in the bottom bar and stop uploaded songs
                setActiveSource('youtube')
                if (audioRef.current && !audioRef.current.paused) audioRef.current.pause()
              }
            },
            onError: (e) => {
              const code = e.data
              setYtError(
                code === 101 || code === 150
                  ? "The owner doesn't allow this video to play outside YouTube. Try another link."
                  : code === 100
                  ? 'That video was not found or is private.'
                  : code === 2
                  ? "That link isn't a valid video."
                  : 'This video could not be played. Try another link.'
              )
            },
          },
        })
      })
      .catch(() => {
        if (!cancelled) setYtError("YouTube couldn't load. Check your connection or ad blocker.")
      })

    return () => {
      cancelled = true
    }
  }, [ytSource])

  /* ---- YouTube: read time / length / title twice a second ---- */
  useEffect(() => {
    if (!ytSource) return
    const id = setInterval(() => {
      const r = readYouTube(ytPlayerRef.current)
      if (!r) return
      setYtNow((prev) =>
        prev &&
        prev.state === r.state &&
        prev.videoId === r.videoId &&
        prev.title === r.title &&
        prev.dur === r.dur &&
        Math.abs(prev.time - r.time) < 0.4
          ? prev
          : r
      )
    }, 500)
    return () => clearInterval(id)
  }, [ytSource])

  /* ---- YouTube: clean up when leaving the page ---- */
  useEffect(() => {
    return () => {
      try {
        if (ytPlayerRef.current && ytPlayerRef.current.destroy) ytPlayerRef.current.destroy()
      } catch (err) {
        /* ignore */
      }
      ytPlayerRef.current = null
      ytReadyRef.current = false
    }
  }, [])

  /* ---------------- actions ---------------- */
  const handleFiles = (e) => {
    const files = Array.from(e.target.files)
    e.target.value = ''
    if (files.length === 0) return

    // 1) show the songs right away
    const newTracks = files.map((file) => {
      const url = URL.createObjectURL(file)
      return {
        id: url,
        file,
        name: file.name.replace(/\.[^/.]+$/, ''),
        artist: '',
        url,
        cover: null,
        duration: 0,
        uploaded: true,
      }
    })
    setTracks((prev) => [...prev, ...newTracks])

    // 2) fill in cover photo + duration in the background
    newTracks.forEach(async (t) => {
      const [cover, dur] = await Promise.all([coverFromFile(t.file), getAudioDuration(t.url)])
      setTracks((prev) =>
        prev.map((x) =>
          x.id === t.id ? { ...x, cover: cover || x.cover, duration: dur || x.duration } : x
        )
      )
    })
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

  const playYouTubeLink = (link) => {
    const parsed = parseYouTubeLink(link)
    if (!parsed) {
      setYtError('Paste a valid YouTube video or playlist link.')
      return
    }
    setYtError('')
    setYtNow(null)
    setYtSource({ ...parsed })
  }

  const loadYouTube = (e) => {
    e.preventDefault()
    playYouTubeLink(youtubeInput)
  }

  /* ---------------- bottom bar ---------------- */
  // Shows the YouTube song or your own song, whichever is playing
  let bar = null
  if (activeSource === 'youtube' && ytNow) {
    const title = ytNow.title || 'YouTube'
    const isPlaylist = !!(ytSource && ytSource.listId)
    bar = {
      title,
      coverTrack: {
        name: title,
        cover: ytNow.videoId ? `https://i.ytimg.com/vi/${ytNow.videoId}/mqdefault.jpg` : null,
      },
      playing: ytNow.state === 1 || ytNow.state === 3,
      time: ytNow.time,
      dur: ytNow.dur,
      onToggle: () => {
        const p = ytPlayerRef.current
        if (!p) return
        try {
          if (p.getPlayerState() === 1) p.pauseVideo()
          else p.playVideo()
        } catch (err) {
          /* ignore */
        }
      },
      onSeek: (t) => {
        try {
          ytPlayerRef.current.seekTo(t, true)
          setYtNow((prev) => (prev ? { ...prev, time: t } : prev))
        } catch (err) {
          /* ignore */
        }
      },
      onPrev: isPlaylist ? () => ytPlayerRef.current && ytPlayerRef.current.previousVideo() : null,
      onNext: isPlaylist ? () => ytPlayerRef.current && ytPlayerRef.current.nextVideo() : null,
    }
  } else if (activeSource === 'local' && activeTrack) {
    bar = {
      title: activeTrack.name,
      coverTrack: activeTrack,
      playing: isPlaying,
      time: currentTime,
      dur: duration,
      onToggle: togglePlay,
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

  const featuredActive = (link) =>
    !!ytSource && youtubeInput.trim() === link

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
          setActiveSource('local')
          setAudioError('')
          // your own song started: stop YouTube so they don't overlap
          pauseYouTubePlayer(ytPlayerRef)
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
                      ) : isActive && activeSource === 'local' ? (
                        'Paused'
                      ) : (
                        track.artist
                      )}
                    </div>
                  </div>

                  <span className="m-track__time">{formatDuration(track.duration)}</span>
                </div>
              )
            })}
          </div>
        )}

        {tracks.some((t) => t.uploaded) && (
          <p className="m-hint">
            Songs added with the button disappear when you refresh the page. To keep a song, put
            the file in <code>public/music</code> and add it to <code>MY_SONGS</code>.
          </p>
        )}
      </section>

      {/* ---------------- YouTube ---------------- */}
      <section className="m-card">
        <div className="m-card__head">
          <div>
            <h2 className="m-card__title">YouTube</h2>
            <p className="m-card__sub">Paste a link, or pick one below. It plays in YouTube's own player.</p>
          </div>
        </div>

        <form className="m-form" onSubmit={loadYouTube}>
          <input
            type="text"
            className="m-input"
            value={youtubeInput}
            onChange={(e) => setYoutubeInput(e.target.value)}
            placeholder="Paste a YouTube video or playlist link..."
          />
          <button type="submit" className="m-btn m-btn--accent">Load</button>
        </form>

        {ytError && <p className="m-error" style={{ marginTop: 10, marginBottom: 0 }}>{ytError}</p>}

        {FEATURED_PLAYLISTS.length > 0 && (
          <div className="m-chips">
            {FEATURED_PLAYLISTS.map((p) => {
              const link = p.url || p.uri
              return (
                <button
                  key={link}
                  type="button"
                  className={`m-chip${featuredActive(link) ? ' m-chip--active' : ''}`}
                  onClick={() => {
                    setYoutubeInput(link)
                    playYouTubeLink(link)
                  }}
                >
                  {p.name}
                </button>
              )
            })}
          </div>
        )}

        {ytSource && (
          <div className="m-player">
            <div ref={ytHostRef} className="youtube-embed-host" />
          </div>
        )}
      </section>

      {/* ---------------- Bottom bar ---------------- */}
      {bar &&
        createPortal(
          <div className="music-bar" role="region" aria-label="Now playing">
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
                <button className="music-bar__skip music-bar__skip--prev" onClick={bar.onPrev} aria-label="Previous">
                  <SkipBack size={18} />
                </button>
              )}
              <button className="music-bar__play" onClick={bar.onToggle} aria-label={bar.playing ? 'Pause' : 'Play'}>
                {bar.playing ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 2 }} />}
              </button>
              {bar.onNext && (
                <button className="music-bar__skip" onClick={bar.onNext} aria-label="Next">
                  <SkipForward size={18} />
                </button>
              )}
            </div>

            <input
              type="range"
              className="music-bar__seek"
              aria-label="Seek"
              min="0"
              max={bar.dur || 0}
              step="0.1"
              value={Math.min(bar.time, bar.dur || 0)}
              disabled={!bar.dur}
              onChange={(e) => bar.onSeek(Number(e.target.value))}
              style={{ '--pct': `${progressPct}%` }}
            />
          </div>,
          document.body
        )}
    </div>
  )
}