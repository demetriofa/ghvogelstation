'use client'

import { useRouter } from 'next/navigation'
import type { Bird, Detection } from '@/lib/database.types'
import ConfidenceBar from './ConfidenceBar'
import { useI18n } from '@/lib/i18n'

interface BirdWithSummary extends Bird {
  detectionCount: number
  lastSeen: string | null
  maxConfidence: number | null
}

export default function BirdCard({ bird }: { bird: BirdWithSummary }) {
  const router = useRouter()
  const { lang, t } = useI18n()

  const commonName =
    lang === 'de'
      ? bird.common_name_ger
      : lang === 'es'
      ? bird.common_name_spa
      : bird.common_name_eng

  const displayName = commonName ?? bird.scientific_name

  const lastSeenTime = bird.lastSeen
    ? new Date(`1970-01-01T${bird.lastSeen}`).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <article
      className="bird-card"
      onClick={() => router.push(`/birds/${bird.id}`)}
      role="button"
      tabIndex={0}
      aria-label={`${displayName} - ${bird.detectionCount} ${t('bird.detections')}`}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/birds/${bird.id}`)}
      id={`bird-card-${bird.id}`}
    >
      <div className="bird-card-image">
        {bird.image_url ? (
          <img src={`/fotos_pajaros/${bird.image_url}`} alt={displayName} loading="lazy" />
        ) : (
          <div className="bird-card-image-placeholder">🐦</div>
        )}
        <div className="bird-card-badge">
          {bird.detectionCount} ×
        </div>
      </div>

      <div className="bird-card-body">
        <div className="bird-card-name">{displayName}</div>
        <div className="bird-card-sci">{bird.scientific_name}</div>

        <div className="bird-card-meta">
          <div className="bird-card-count">
            <span className="dot" />
            {lastSeenTime
              ? `${t('bird.last_seen')}: ${lastSeenTime}`
              : `${bird.detectionCount} ${t('bird.detections')}`}
          </div>
        </div>

        <div style={{ marginTop: '0.75rem' }}>
          <ConfidenceBar value={bird.maxConfidence} />
        </div>
      </div>
    </article>
  )
}
