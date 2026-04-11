'use client'

import React, { useState, useRef, useEffect } from 'react'
import WaveSurfer from 'wavesurfer.js'

interface AudioPlayerProps {
  url: string
}

export default function AudioPlayer({ url }: AudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState<number>(0)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [isReady, setIsReady] = useState(false)
  const wavesurfer = useRef<WaveSurfer | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    wavesurfer.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'rgba(255, 255, 255, 0.4)',
      progressColor: 'rgba(34, 197, 94, 0.8)',
      cursorColor: 'rgba(34, 197, 94, 1)',
      height: 28,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      normalize: true,
      url: url,
    })

    const ws = wavesurfer.current

    ws.on('ready', () => {
      setDuration(ws.getDuration())
      setIsReady(true)
    })
    
    ws.on('audioprocess', (time) => {
      setCurrentTime(time)
    })
    
    ws.on('timeupdate', (time) => {
      setCurrentTime(time)
    })

    ws.on('play', () => setIsPlaying(true))
    ws.on('pause', () => setIsPlaying(false))
    ws.on('finish', () => {
      setIsPlaying(false)
      ws.seekTo(0)
    })

    return () => {
      ws.destroy()
    }
  }, [url])

  const togglePlay = () => {
    wavesurfer.current?.playPause()
  }

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="audio-player">
      <button
        className="audio-play-btn"
        onClick={togglePlay}
        disabled={!isReady}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        style={{ opacity: isReady ? 1 : 0.5 }}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      <div
        className="audio-waveform-placeholder"
        style={{ cursor: isReady ? 'pointer' : 'default', background: 'transparent' }}
      >
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      <span className="audio-duration">
        {isReady ? `${formatTime(currentTime)} / ${formatTime(duration)}` : '—:——'}
      </span>
    </div>
  )
}
