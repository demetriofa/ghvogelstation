'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Bird, DetectionWithBird } from '@/lib/database.types'
import { useI18n } from '@/lib/i18n'
import Link from 'next/link'
import DetectionTimeline from '@/components/DetectionTimeline'
import Navbar from '@/components/Navbar'
import UploadModal from '@/components/UploadModal'
import ConfidenceBar from '@/components/ConfidenceBar'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts'

interface BirdDetailClientProps {
  birdId: number
}

type Tab = 'all' | 'week' | 'month'

export default function BirdDetailClient({ birdId }: BirdDetailClientProps) {
  const { lang, t } = useI18n()
  const [bird, setBird] = useState<Bird | null>(null)
  const [detections, setDetections] = useState<DetectionWithBird[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('all')
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

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
      const pad = (n: number) => String(n).padStart(2, '0')
      const now = new Date()
      const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

      let from: string | null = null
      if (tab === 'week') {
        const d = new Date(now); d.setDate(d.getDate() - 6)
        from = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      } else if (tab === 'month') {
        const d = new Date(now); d.setDate(d.getDate() - 29)
        from = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      }

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

        if (from) query = query.gte('date', from).lte('date', today)
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
  }, [birdId, tab, selectedLocation])

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

  // Build chart data: confidence over last 30 detections
  const chartData = [...detections]
    .reverse()
    .slice(-30)
    .map((d, i) => ({
      i: i + 1,
      label: `${d.date} ${d.time.slice(0, 5)}`,
      confidence: d.confidence != null ? Math.round(d.confidence * 100) : null,
    }))
    .filter((d) => d.confidence != null)

  const avgConf =
    detections.length > 0
      ? Math.round(
          (detections.reduce((acc, d) => acc + (d.confidence ?? 0), 0) /
            detections.filter((d) => d.confidence != null).length) *
            100
        )
      : 0

  const tabs: { key: Tab; label: string }[] = [
    { key: 'week', label: t('tab.week') },
    { key: 'month', label: t('tab.month') },
    { key: 'all', label: t('tab.all') },
  ]

  return (
    <div className="page-wrapper">
      <Navbar
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
        onUploadClick={() => setShowUpload(true)}
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
                <img src={`/fotos_pajaros/${bird.image_url}`} alt={displayName} />
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

              {bird?.wikipedia_url && (
                <a
                  href={bird.wikipedia_url}
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

          {/* Confidence chart */}
          {chartData.length > 1 && (
            <div className="chart-container">
              <p className="chart-title">{t('chart.confidence_over_time')}</p>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="i" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: '#161d2a',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      color: '#f1f5f9',
                    }}
                    formatter={(v: unknown) => [`${v}%`, t('bird.confidence')]}
                    labelFormatter={(i) => chartData[i - 1]?.label ?? ''}
                  />
                  <Area
                    type="monotone"
                    dataKey="confidence"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#confGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#22c55e' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Detection timeline */}
          <div className="toolbar" style={{ marginBottom: '1rem' }}>
            <div className="section-header" style={{ margin: 0, flex: 1 }}>
              <span className="section-title">{t('bird.detections')}</span>
            </div>
            <div className="tabs" role="tablist">
              {tabs.map(({ key, label }) => (
                <button
                  key={key}
                  id={`bird-tab-${key}`}
                  role="tab"
                  aria-selected={tab === key}
                  className={`tab-btn ${tab === key ? 'active' : ''}`}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="empty-state">
              <span className="empty-icon" style={{ animation: 'shimmer 1.5s infinite' }}>⏳</span>
              <p>{t('common.loading')}</p>
            </div>
          ) : (
            <DetectionTimeline detections={detections} showBirdName={false} />
          )}
        </div>
      </main>

      {showUpload && (
        <UploadModal
          preselectedBirdId={birdId}
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            setShowUpload(false)
            showToast(t('upload.success'))
            fetchDetections()
          }}
        />
      )}

      {toast && (
        <div className="toast success" role="alert">{toast}</div>
      )}
    </div>
  )
}
