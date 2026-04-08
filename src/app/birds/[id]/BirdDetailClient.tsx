'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Bird, DetectionWithBird } from '@/lib/database.types'
import { useI18n } from '@/lib/i18n'
import Link from 'next/link'
import DetectionTimeline from '@/components/DetectionTimeline'
import Navbar, { type Tab, type CustomRange } from '@/components/Navbar'

function isoWeekToDates(isoWeek: string): { from: string; to: string } {
  const [yearStr, weekStr] = isoWeek.split('-W')
  const year = Number(yearStr)
  const week = Number(weekStr)
  const jan4 = new Date(year, 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const monday = new Date(startOfWeek1)
  monday.setDate(startOfWeek1.getDate() + (week - 1) * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { from: fmt(monday), to: fmt(sunday) }
}

function getDateRange(
  tab: Tab,
  customRange: CustomRange | null
): { from: string; to: string } | null {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

  if (tab === 'today') return { from: today, to: today }

  if (tab === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - 6)
    return { from: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, to: today }
  }

  if (tab === 'month') {
    const d = new Date(now)
    d.setDate(d.getDate() - 29)
    return { from: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, to: today }
  }

  if (tab === 'custom' && customRange) {
    if (customRange.mode === 'day') return { from: customRange.value, to: customRange.value }
    if (customRange.mode === 'week') return isoWeekToDates(customRange.value)
    if (customRange.mode === 'month') {
      const [y, m] = customRange.value.split('-').map(Number)
      const first = `${y}-${pad(m)}-01`
      const last = new Date(y, m, 0)
      return {
        from: first,
        to: `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`,
      }
    }
  }

  return null
}

interface BirdDetailClientProps {
  birdId: number
}

export default function BirdDetailClient({ birdId }: BirdDetailClientProps) {
  const { lang, t } = useI18n()
  const [bird, setBird] = useState<Bird | null>(null)
  const [detections, setDetections] = useState<DetectionWithBird[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('today')
  const [customRange, setCustomRange] = useState<CustomRange | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [isZoomed, setIsZoomed] = useState(false)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const fetchBird = useCallback(async () => {
    const { data } = await supabase
      .from('birds')
      .select('*')
      .eq('id', birdId)
      .single()
    if (data) setBird(data)
  }, [birdId])

  const fetchDetections = useCallback(async () => {
    setLoading(true)
    try {
      const range = getDateRange(tab, customRange)

      let allDetections: DetectionWithBird[] = []
      let fromIdx = 0
      const step = 1000
      let hasMore = true

      while (hasMore) {
        let query = supabase
          .from('detections')
          .select(`
            id, date, time, confidence, week, sensitivity, threshold, overlap, audio_url, histogram_url, location_id,
            birds (id, scientific_name, common_name_eng, common_name_ger, common_name_spa, image_url, wikipedia_url, description),
            locations (id, name)
          `)
          .eq('bird_id', birdId)
          .order('date', { ascending: false })
          .order('time', { ascending: false })

        if (range) query = query.gte('date', range.from).lte('date', range.to)
        if (selectedLocation !== null) query = query.eq('location_id', selectedLocation)

        const { data, error } = await query.range(fromIdx, fromIdx + step - 1)
        if (error) {
          console.error(error)
          break
        }

        const batch = (data ?? []) as unknown as DetectionWithBird[]
        allDetections = allDetections.concat(batch)

        if (batch.length < step || fromIdx >= 50000) {
          hasMore = false
        } else {
          fromIdx += step
        }
      }

      setDetections(allDetections)
    } finally {
      setLoading(false)
    }
  }, [birdId, tab, customRange, selectedLocation])

  useEffect(() => { fetchBird() }, [fetchBird])
  useEffect(() => { fetchDetections() }, [fetchDetections])

  if (!bird && !loading) {
    return (
      <div className="empty-state" style={{ marginTop: '4rem' }}>
        <span className="empty-icon">🔍</span>
        <p>{t('common.no_data')}</p>
      </div>
    )
  }

  const commonName =
    lang === 'de'
      ? bird?.common_name_ger
      : lang === 'es'
      ? bird?.common_name_spa
      : bird?.common_name_eng

  const displayName = commonName ?? bird?.scientific_name ?? '…'

  // Build hourly detections histogram
  const hourlyCounts = new Array(24).fill(0)
  detections.forEach(d => {
    if (d.time) {
      const hour = parseInt(d.time.split(':')[0])
      if (!isNaN(hour)) hourlyCounts[hour]++
    }
  })
  const maxCount = Math.max(...hourlyCounts, 1)

  const avgConf =
    detections.length > 0
      ? Math.round(
          (detections.reduce((acc, d) => acc + (d.confidence ?? 0), 0) /
            detections.filter((d) => d.confidence != null).length) *
            100
        )
      : 0

  return (
    <div className="page-wrapper">
      <Navbar
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
        selectedTab={tab}
        onTabChange={setTab}
        customRange={customRange}
        onCustomRangeChange={setCustomRange}
      />

      <main className="main-content">
        <div className="container">
          {/* Back link */}
          <Link href="/" className="back-link" id="bird-back-link">
            {t('bird.back')}
          </Link>

          {/* Hero */}
          <div className="bird-hero">
            <div className="bird-hero-image">
              {bird?.image_url ? (
                <img 
                  src={`/fotos_pajaros/${bird.image_url}`} 
                  alt={displayName} 
                  style={{ cursor: 'zoom-in' }}
                  onClick={() => setIsZoomed(true)}
                />
              ) : (
                <div className="bird-hero-placeholder">🐦</div>
              )}
            </div>

            <div className="bird-hero-info">
              <p className="bird-scientific">{bird?.scientific_name}</p>
              <h1 className="bird-hero-name">{displayName}</h1>

              {/* All names */}
              <div className="bird-names-list">
                {bird?.common_name_eng && (
                  <span className="bird-name-tag">
                    <span className="lang">EN</span>{bird.common_name_eng}
                  </span>
                )}
                {bird?.common_name_ger && (
                  <span className="bird-name-tag">
                    <span className="lang">DE</span>{bird.common_name_ger}
                  </span>
                )}
                {bird?.common_name_spa && (
                  <span className="bird-name-tag">
                    <span className="lang">ES</span>{bird.common_name_spa}
                  </span>
                )}
              </div>

              {bird?.description && (
                <p className="bird-description">{bird.description}</p>
              )}

              <div className="hero-stats">
                <div className="hero-stat">
                  <span className="hero-stat-label">{t('bird.detections')}</span>
                  <span className="hero-stat-value">{loading ? '—' : detections.length}</span>
                </div>
                <div className="hero-stat">
                  <span className="hero-stat-label">{t('stats.avg_confidence')}</span>
                  <span className="hero-stat-value">{loading ? '—' : `${avgConf}%`}</span>
                </div>
                {detections[0]?.locations?.name && (
                  <div className="hero-stat">
                    <span className="hero-stat-label">{t('bird.location')}</span>
                    <span className="hero-stat-value" style={{ fontSize: '1rem' }}>
                      {detections[0].locations.name}
                    </span>
                  </div>
                )}
              </div>

              {(bird?.wikipedia_url || bird?.scientific_name) && (
                <a
                  href={bird?.scientific_name 
                    ? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(bird.scientific_name.replace(/ /g, '_'))}` 
                    : bird?.wikipedia_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wiki-link"
                  id="bird-wikipedia-link"
                >
                  🌐 {t('bird.wikipedia')}
                </a>
              )}
            </div>
          </div>

          {/* Hourly detections histogram */}
          {detections.length > 0 && (
            <div className="chart-container" style={{ margin: '2.5rem 0', padding: '1.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)' }}>
              <p className="chart-title" style={{ marginBottom: '1rem', fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {t('bird.detections')} / 24h
              </p>
              <div className="bird-histogram-container">
                <div className="bird-histogram" style={{ height: '120px' }}>
                  {hourlyCounts.map((count, i) => {
                    const heightPct = (count / maxCount) * 100
                    return (
                      <div 
                        key={i} 
                        className={`bird-histogram-bar ${count > 0 ? 'has-data' : ''}`}
                        style={{ height: count > 0 ? `${Math.max(heightPct, 15)}%` : '2px', borderTopLeftRadius: '4px', borderTopRightRadius: '4px', margin: '0 1px' }}
                        title={`${i}:00 - ${count} detections`}
                      />
                    )
                  })}
                </div>
                <div className="bird-histogram-labels" style={{ marginTop: '10px', fontSize: '0.85rem' }}>
                  <span>0:00</span>
                  <span>6:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>24:00</span>
                </div>
              </div>
            </div>
          )}

          {/* Detection timeline */}
          <div className="toolbar" style={{ marginBottom: '1rem' }}>
            <div className="section-header" style={{ margin: 0, flex: 1 }}>
              <span className="section-title">{t('bird.detections')}</span>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">
              <span className="empty-icon" style={{ animation: 'shimmer 1.5s infinite' }}>⏳</span>
              <p>{t('common.loading')}</p>
            </div>
          ) : (
            <DetectionTimeline detections={detections} showBirdName={false} groupBy5Min={true} />
          )}
        </div>
      </main>

      {toast && (
        <div className="toast success" role="alert">{toast}</div>
      )}

      {isZoomed && bird?.image_url && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setIsZoomed(false)}
        >
          <img 
            src={`/fotos_pajaros/${bird.image_url}`} 
            alt={displayName} 
            style={{ 
              maxWidth: '90vw', 
              maxHeight: '90vh', 
              objectFit: 'contain', 
              borderRadius: '8px', 
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)' 
            }} 
          />
        </div>
      )}
    </div>
  )
}
