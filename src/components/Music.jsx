import { useState, useRef, useEffect } from 'react'
import { Upload, Play, Pause, SkipBack, SkipForward, Music as MusicIcon } from 'lucide-react'

const LAST_TRACK_KEY = 'taskly-music-last-track'

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

const musicStyles = `
.music-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.music-upload {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: var(--bg-panel);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  padding: 20px 24px;
}

.music-upload__text h2 {
  margin: 0 0 4px;
  font-size: 17px;
}

.music-upload__text p {
  margin: 0;
  font-size: 13px;
  color: var(--text-tertiary);
}

.music-upload input[type="file"] {
  display: none;
}

.music-upload__btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--accent);
  color: var(--accent-ink);
  font-weight: 700;
  font-size: 13.5px;
  padding: 10px 18px;
  border-radius: var(--radius-sm);
  transition: transform 0.15s ease, filter 0.15s ease;
  flex-shrink: 0;
  cursor: pointer;
}

.music-upload__btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
}

.music-player {
  background: var(--bg-panel);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  padding: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.music-player__art {
  width: 96px;
  height: 96px;
  border-radius: var(--radius-md);
  background: var(--bg-panel-raised);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
}

.music-player__title {
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-player__controls {
  display: flex;
  align-items: center;
  gap: 18px;
}

.music-player__playpause {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--accent-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease, filter 0.15s ease;
}

.music-player__playpause:hover {
  transform: scale(1.05);
  filter: brightness(1.05);
}

.music-player__skip {
  color: var(--text-secondary);
  transition: color 0.15s ease;
}

.music-player__skip:hover {
  color: var(--text-primary);
}

.music-player__progress {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 380px;
}

.music-player__time {
  font-size: 12px;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
  width: 36px;
  flex-shrink: 0;
}

.music-player__time--end {
  text-align: right;
}

.music-player__bar {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  appearance: none;
  background: var(--border);
  cursor: pointer;
}

.music-player__bar::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
}

.music-playlist {
  background: var(--bg-panel);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  padding: 8px;
}

.music-track {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  transition: background 0.15s ease;
  width: 100%;
  text-align: left;
}

.music-track:hover {
  background: var(--bg-panel-raised);
}

.music-track--active {
  background: rgba(45, 212, 191, 0.12);
  color: var(--accent);
}

.music-track__index {
  width: 20px;
  font-size: 12.5px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.music-track__name {
  flex: 1;
  font-size: 13.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
`

export default function Music() {
  const [tracks, setTracks] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [lastTrackName, setLastTrackName] = useState(null)
  const audioRef = useRef(null)

  const activeTrack = tracks[activeIndex] || null

  useEffect(() => {
    const saved = localStorage.getItem(LAST_TRACK_KEY)
    if (saved) setLastTrackName(saved)
  }, [])

  useEffect(() => {
    if (activeTrack) {
      localStorage.setItem(LAST_TRACK_KEY, activeTrack.name)
      setLastTrackName(null)
    }
  }, [activeTrack])

  useEffect(() => {
    return () => {
      tracks.forEach((t) => URL.revokeObjectURL(t.url))
    }
  }, [])

  const handleFiles = (e) => {
    const files = Array.from(e.target.files)
    const newTracks = files.map((file) => ({
      name: file.name.replace(/\.[^/.]+$/, ''),
      url: URL.createObjectURL(file),
    }))
    setTracks((prev) => [...prev, ...newTracks])
    e.target.value = ''
  }

  const togglePlay = () => {
    if (!activeTrack) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const selectTrack = (index) => {
    setActiveIndex(index)
    setIsPlaying(false)
    setTimeout(() => {
      audioRef.current.play()
      setIsPlaying(true)
    }, 50)
  }

  const skip = (dir) => {
    if (tracks.length === 0) return
    const next = (activeIndex + dir + tracks.length) % tracks.length
    selectTrack(next)
  }

  const handleSeek = (e) => {
    const time = Number(e.target.value)
    audioRef.current.currentTime = time
    setCurrentTime(time)
  }

  return (
    <div className="music-panel">
      <style>{musicStyles}</style>

      <div className="music-upload">
        <div className="music-upload__text">
          <h2>Your music</h2>
          <p>
            {tracks.length === 0
              ? lastTrackName
                ? `Last played: "${lastTrackName}" — re-add it to resume`
                : 'No tracks added yet'
              : `${tracks.length} track${tracks.length > 1 ? 's' : ''} loaded`}
          </p>
        </div>
        <label className="music-upload__btn">
          <Upload size={16} />
          Add songs
          <input type="file" accept="audio/*" multiple onChange={handleFiles} />
        </label>
      </div>

      <div className="music-player">
        <div className="music-player__art">
          <MusicIcon size={36} />
        </div>

        <span className="music-player__title">
          {activeTrack ? activeTrack.name : 'Nothing playing'}
        </span>

        <div className="music-player__progress">
          <span className="music-player__time">{formatDuration(currentTime)}</span>
          <input
            type="range"
            className="music-player__bar"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            disabled={!activeTrack}
          />
          <span className="music-player__time music-player__time--end">{formatDuration(duration)}</span>
        </div>

        <div className="music-player__controls">
          <button className="music-player__skip" onClick={() => skip(-1)} disabled={!activeTrack} aria-label="Previous">
            <SkipBack size={20} />
          </button>
          <button className="music-player__playpause" onClick={togglePlay} disabled={!activeTrack} aria-label={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <Pause size={22} /> : <Play size={22} style={{ marginLeft: 2 }} />}
          </button>
          <button className="music-player__skip" onClick={() => skip(1)} disabled={!activeTrack} aria-label="Next">
            <SkipForward size={20} />
          </button>
        </div>

        {activeTrack && (
          <audio
            ref={audioRef}
            src={activeTrack.url}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onEnded={() => skip(1)}
          />
        )}
      </div>

      {tracks.length > 0 && (
        <div className="music-playlist">
          {tracks.map((track, i) => (
            <button
              key={track.url}
              className={`music-track${i === activeIndex ? ' music-track--active' : ''}`}
              onClick={() => selectTrack(i)}
            >
              <span className="music-track__index">{i + 1}</span>
              <span className="music-track__name">{track.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}