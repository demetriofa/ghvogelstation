'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { DetectionWithBird, Bird } from '@/lib/database.types'
import { useI18n } from '@/lib/i18n'
import Navbar, { type Tab, type CustomRange, formatCustomLabel } from '@/components/Navbar'
import BirdCard from '@/components/BirdCard'

interface BirdSummary extends Bird {
  detectionCount: number
  lastSeen: string | null
  maxConfidence: number | null
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
    if (customRange.mode === 'day') {
      return { from: customRange.value, to: customRange.value }
    }
    if (customRange.mode === 'week') {
      // 'YYYY-Www' → compute Monday and Sunday
      const { from, to } = isoWeekToDates(customRange.value)
      return { from, to }
    }
    if (customRange.mode === 'month') {
      // 'YYYY-MM' → first and last day
      const [y, m] = customRange.value.split('-').map(Number)
      const first = `${y}-${pad(m)}-01`
      const last = new Date(y, m, 0) // last day of month
      return {
        from: first,
        to: `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`,
      }
    }
  }

  return null // all time
}

function isoWeekToDates(isoWeek: string): { from: string; to: string } {
  // isoWeek = 'YYYY-Www'
  const [yearStr, weekStr] = isoWeek.split('-W')
  const year = Number(yearStr)
  const week = Number(weekStr)
  // ISO week 1 = week containing Jan 4
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

export default function HomePage() {
  const { t, lang } = useI18n()
  const [tab, setTab] = useState<Tab>('today')
  const [customRange, setCustomRange] = useState<CustomRange | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null)
  const [birds, setBirds] = useState<BirdSummary[]>([])
  const [stats, setStats] = useState({ total: 0, species: 0, peakHour: '—', avgConf: 0 })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleShift = (dir: -1 | 1) => {
    if (tab === 'all') return

    const pad = (n: number) => String(n).padStart(2, '0')
    const toIsoWeek = (d: Date) => {
      const jan4 = new Date(d.getFullYear(), 0, 4)
      const startOfWeek1 = new Date(jan4)
      startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
      const diffMs = d.getTime() - startOfWeek1.getTime()
      const weekNo = Math.floor(diffMs / (7 * 24 * 3600 * 1000)) + 1
      return `${d.getFullYear()}-W${pad(weekNo)}`
    }

    let mode: 'day' | 'week' | 'month' = 'day'
    let d = new Date()

    if (tab === 'today') {
      mode = 'day'
    } else if (tab === 'week') {
      mode = 'week'
    } else if (tab === 'month') {
      mode = 'month'
    } else if (tab === 'custom' && customRange) {
      mode = customRange.mode
      if (mode === 'day') d = new Date(customRange.value + 'T12:00:00')
      else if (mode === 'week') {
        const { from } = isoWeekToDates(customRange.value)
        d = new Date(from + 'T12:00:00')
      } else if (mode === 'month') {
        d = new Date(customRange.value + '-15T12:00:00')
      }
    }

    if (mode === 'day') {
      d.setDate(d.getDate() + dir)
      setCustomRange({ mode: 'day', value: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` })
    } else if (mode === 'week') {
      d.setDate(d.getDate() + dir * 7)
      setCustomRange({ mode: 'week', value: toIsoWeek(d) })
    } else if (mode === 'month') {
      d.setMonth(d.getMonth() + dir)
      setCustomRange({ mode: 'month', value: `${d.getFullYear()}-${pad(d.getMonth() + 1)}` })
    }

    setTab('custom')
  }

  const fetchData = useCallback(async () => {
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
            id, date, time, confidence, week, sensitivity, location_id,
            birds (
              id, scientific_name, common_name_eng, common_name_ger, common_name_spa,
              image_url, wikipedia_url, description
            ),
            locations (id, name)
          `)
          .order('date', { ascending: false })
          .order('time', { ascending: false })

        if (range) {
          query = query.gte('date', range.from).lte('date', range.to)
        }
        if (selectedLocation !== null) {
          query = query.eq('location_id', selectedLocation)
        }

        const { data, error } = await query.range(fromIdx, fromIdx + step - 1)
        if (error) throw error

        const batch = (data ?? []) as unknown as DetectionWithBird[]
        allDetections = allDetections.concat(batch)

        if (batch.length < step || fromIdx >= 50000) {
          hasMore = false
        } else {
          fromIdx += step
        }
      }

      const detections = allDetections

      // Build per-bird summaries
      const birdMap = new Map<number, BirdSummary>()
      const hourCounts: Record<number, number> = {}
      let totalConf = 0
      let confCount = 0

      for (const d of detections) {
        const bird = d.birds
        if (!bird) continue
        const id = bird.id

        if (!birdMap.has(id)) {
          birdMap.set(id, { ...bird, detectionCount: 0, lastSeen: null, maxConfidence: null })
        }
        const summary = birdMap.get(id)!
        summary.detectionCount++
        if (!summary.lastSeen || d.time > summary.lastSeen) summary.lastSeen = d.time
        if (d.confidence != null && (summary.maxConfidence == null || d.confidence > summary.maxConfidence)) {
          summary.maxConfidence = d.confidence
        }

        const hour = parseInt(d.time.split(':')[0])
        hourCounts[hour] = (hourCounts[hour] ?? 0) + 1

        if (d.confidence != null) {
          totalConf += d.confidence
          confCount++
        }
      }

      const sortedBirds = Array.from(birdMap.values()).sort(
        (a, b) => b.detectionCount - a.detectionCount
      )

      let peakHour = '—'
      if (Object.keys(hourCounts).length > 0) {
        const peak = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]
        peakHour = `${peak[0].padStart(2, '0')}:00`
      }

      setBirds(sortedBirds)
      setStats({
        total: detections.length,
        species: birdMap.size,
        peakHour,
        avgConf: confCount > 0 ? Math.round((totalConf / confCount) * 100) : 0,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [tab, customRange, selectedLocation])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
          {/* Header */}
          <div className="page-header">
            <h1>🐦 {t('nav.home')}</h1>
            <div className="page-subtitle" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
              {tab !== 'all' && (
                <button onClick={() => handleShift(-1)} className="shift-btn" aria-label="Previous">
                  &lt;
                </button>
              )}
              <span style={{ minWidth: '130px', textAlign: 'center' }}>
                {tab === 'custom' && customRange
                  ? formatCustomLabel(customRange, lang)
                  : t(`tab.${tab}`)}
              </span>
              {tab !== 'all' && (
                <button onClick={() => handleShift(1)} className="shift-btn" aria-label="Next">
                  &gt;
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="stats-bar">
            <div className="stat-card">
              <div className="stat-label">{t('stats.detections')}</div>
              <div className="stat-value">{loading ? '—' : stats.total}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{t('stats.species')}</div>
              <div className="stat-value">{loading ? '—' : stats.species}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{t('stats.peak_hour')}</div>
              <div className="stat-value" style={{ fontSize: '1.5rem' }}>
                {loading ? '—' : stats.peakHour}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{t('stats.avg_confidence')}</div>
              <div className="stat-value">{loading ? '—' : `${stats.avgConf}%`}</div>
            </div>
          </div>

          {/* Species count */}
          <div className="toolbar">
            <div className="section-count">{birds.length} {t('stats.species')}</div>
          </div>

          {loading ? (
            <div className="bird-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bird-card">
                  <div className="skeleton" style={{ height: '180px', borderRadius: '0' }} />
                  <div className="bird-card-body">
                    <div className="skeleton" style={{ height: '16px', marginBottom: '8px', width: '70%' }} />
                    <div className="skeleton" style={{ height: '12px', width: '50%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : birds.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🔇</span>
              <p>{t('common.no_data')}</p>
            </div>
          ) : (
            <div className="bird-grid">
              {birds.map((bird) => (
                <BirdCard key={bird.id} bird={bird} />
              ))}
            </div>
          )}
        </div>
      </main>

      {toast && (
        <div className={`toast ${toast.type}`} role="alert">
          {toast.type === 'success' ? '✓' : '⚠'} {toast.msg}
        </div>
      )}
    </div>
  )
}
