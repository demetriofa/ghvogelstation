'use client'

import { useI18n } from '@/lib/i18n'
import type { DetectionWithBird } from '@/lib/database.types'
import ConfidenceBar from './ConfidenceBar'
import AudioPlayer from './AudioPlayer'
import Link from 'next/link'

interface DetectionTimelineProps {
  detections: DetectionWithBird[]
  showBirdName?: boolean
  groupBy5Min?: boolean
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

export default function DetectionTimeline({ detections, showBirdName = false, groupBy5Min = false }: DetectionTimelineProps) {
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
        const dailyDetections = grouped[date]
        
        let rowsToRender: any[] = []
        
        if (groupBy5Min) {
          const blocks: Record<string, DetectionWithBird[]> = {}
          dailyDetections.forEach(d => {
            const [hStr, mStr] = d.time.split(':')
            const h = parseInt(hStr, 10)
            const m = parseInt(mStr, 10)
            const startM = Math.floor(m / 5) * 5
            const keyH = h.toString().padStart(2, '0')
            const keyM = startM.toString().padStart(2, '0')
            const key = `${keyH}:${keyM}`
            if (!blocks[key]) blocks[key] = []
            blocks[key].push(d)
          })

          rowsToRender = Object.keys(blocks).sort((a, b) => b.localeCompare(a)).map(key => {
            const block = blocks[key]
            const [hStr, mStr] = key.split(':')
            let h = parseInt(hStr, 10)
            let m = parseInt(mStr, 10)
            let endH = h
            let endM = m + 5
            if (endM >= 60) {
              endM -= 60
              endH += 1
            }
            const endHStr = endH.toString().padStart(2, '0')
            const endMStr = endM.toString().padStart(2, '0')
            const intervalStr = `${key}-${endHStr}:${endMStr}`
            
            const best = block.reduce((prev, curr) => (curr.confidence || 0) > (prev.confidence || 0) ? curr : prev, block[0])
            
            const sumConf = block.reduce((sum, d) => sum + (d.confidence || 0), 0)
            const avgConf = sumConf / block.length

            return {
              id: `${date}-${key}`,
              intervalStr,
              count: block.length,
              best,
              avgConf,
              isGrouped: true,
              timeSort: key,
              block
            }
          })
        } else {
          rowsToRender = dailyDetections.map(d => ({
            id: d.id.toString(),
            intervalStr: d.time.slice(0, 5),
            count: 1,
            best: d,
            avgConf: d.confidence,
            isGrouped: false,
            timeSort: d.time,
            block: [d]
          })).sort((a, b) => b.timeSort.localeCompare(a.timeSort))
        }

        return (
          <section key={date} className="detection-section" id={`date-${date}`}>
            {sortedDates.length > 1 && (
              <div className="detection-section-header">
                <span className="detection-date-label">{formatDate(date, lang)}</span>
                <span className="detection-day-count">{dailyDetections.length} ×</span>
              </div>
            )}

            {rowsToRender.map((row) => {
              const d = row.best
              const birdName =
                lang === 'de'
                  ? d.birds?.common_name_ger
                  : lang === 'es'
                  ? d.birds?.common_name_spa
                  : d.birds?.common_name_eng

              const displayName = birdName ?? d.birds?.scientific_name ?? '—'

              return (
                <div key={row.id} className="detection-row" id={`detection-${row.id}`}>
                  <span className="detection-time">{row.intervalStr}</span>

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
                      {row.isGrouped && row.count > 1 && (
                        <span className="detection-meta-item" style={{ fontWeight: 600 }}>
                          {row.count} × {t('bird.detections')}
                        </span>
                      )}
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
                      {!row.isGrouped && d.sensitivity != null && (
                        <span className="detection-meta-item">
                          Sens: {d.sensitivity.toFixed(1)}
                        </span>
                      )}
                    </div>

                    {d.audio_url && <AudioPlayer url={d.audio_url} />}
                  </div>

                  <div className="detection-right">
                    <ConfidenceBar value={row.avgConf} />
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
