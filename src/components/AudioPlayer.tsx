'use client'

import { useState, useRef, useEffect } from 'react'

interface AudioPlayerProps {
  url: string
}

export default function AudioPlayer({ url }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onLoadedMetadata = () => setDuration(audio.duration)
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0)
    }
    const onEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
      setProgress(0)
    }

    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play()
      setIsPlaying(true)
    }
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = x / rect.width
    audio.currentTime = pct * duration
  }

  return (
    <div className="audio-player">
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        className="audio-play-btn"
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      <div
        className="audio-waveform-placeholder"
        onClick={handleTrackClick}
        style={{ cursor: 'pointer', position: 'relative' }}
        title="Click to seek"
      >
        {/* progress overlay */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${progress}%`,
            background: 'rgba(34, 197, 94, 0.45)',
            borderRadius: '4px',
            transition: 'width 0.1s linear',
          }}
        />
        {/* waveform bars decoration */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          padding: '4px 6px',
          overflow: 'hidden',
        }}>
          {Array.from({ length: 48 }).map((_, i) => {
            const h = 20 + Math.sin(i * 0.7) * 15 + Math.cos(i * 1.3) * 10
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${Math.max(10, Math.min(90, h))}%`,
                  background: i / 48 < progress / 100
                    ? 'rgba(34, 197, 94, 0.8)'
                    : 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '1px',
                  minWidth: '2px',
                }}
              />
            )
          })}
        </div>
      </div>

      <span className="audio-duration">
        {duration ? `${formatTime(currentTime)} / ${formatTime(duration)}` : '—:——'}
      </span>
    </div>
  )
}
