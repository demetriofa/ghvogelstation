'use client'

import { useI18n } from '@/lib/i18n'
import type { DetectionWithBird } from '@/lib/database.types'
import ConfidenceBar from './ConfidenceBar'
import AudioPlayer from './AudioPlayer'
import Link from 'next/link'

interface DetectionTimelineProps {
  detections: DetectionWithBird[]
  showBirdName?: boolean
}

function groupByDate(detections: DetectionWithBird[]): Record<string, DetectionWithBird[]> {
  return detections.reduce((acc, d) => {
    const key = d.date
    if (!acc[key]) acc[key] = []
    acc[key].push(d)
    return acc
  }, {} as Record<string, DetectionWithBird[]>)
}

function formatDate(dateStr: string, lang: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString(
    lang === 'de' ? 'de-DE' : lang === 'es' ? 'es-ES' : 'en-GB',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  )
}

export default function DetectionTimeline({ detections, showBirdName = false }: DetectionTimelineProps) {
  const { lang, t } = useI18n()

  if (detections.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">🔇</span>
        <p>{t('bird.no_detections')}</p>
      </div>
    )
  }

  const grouped = groupByDate(detections)
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div>
      {sortedDates.map((date) => {
        const rows = grouped[date].sort((a, b) => b.time.localeCompare(a.time))
        return (
          <section key={date} className="detection-section" id={`date-${date}`}>
            {sortedDates.length > 1 && (
              <div className="detection-section-header">
                <span className="detection-date-label">{formatDate(date, lang)}</span>
                <span className="detection-day-count">{rows.length} ×</span>
              </div>
            )}

            {rows.map((d) => {
              const birdName =
                lang === 'de'
                  ? d.birds?.common_name_ger
                  : lang === 'es'
                  ? d.birds?.common_name_spa
                  : d.birds?.common_name_eng

              const displayName = birdName ?? d.birds?.scientific_name ?? '—'
              const timeStr = d.time.slice(0, 5)

              return (
                <div key={d.id} className="detection-row" id={`detection-${d.id}`}>
                  <span className="detection-time">{timeStr}</span>

                  <div className="detection-middle">
                    {showBirdName && (
                      <Link
                        href={`/birds/${d.bird_id}`}
                        className="detection-bird-name"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {displayName}
                      </Link>
                    )}

                    <div className="detection-meta">
                      {d.locations?.name && (
                        <span className="detection-meta-item">
                          📍 {d.locations.name}
                        </span>
                      )}
                      {d.week && (
                        <span className="detection-meta-item">
                          W{d.week}
                        </span>
                      )}
                      {d.sensitivity != null && (
                        <span className="detection-meta-item">
                          Sens: {d.sensitivity.toFixed(1)}
                        </span>
                      )}
                    </div>

                    {d.audio_url && <AudioPlayer url={d.audio_url} />}
                  </div>

                  <div className="detection-right">
                    <ConfidenceBar value={d.confidence} />
                  </div>
                </div>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
