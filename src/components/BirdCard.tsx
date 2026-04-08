'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import type { Bird, Detection } from '@/lib/database.types'

import { useI18n } from '@/lib/i18n'

interface BirdWithSummary extends Bird {
  detectionCount: number
  maxConfidence: number | null
  hourlyCounts: number[]
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

  const confColorClass = bird.maxConfidence !== null
    ? bird.maxConfidence > 80 ? 'conf-high'
    : bird.maxConfidence > 50 ? 'conf-med'
    : 'conf-low'
    : ''

  const maxCount = Math.max(...(bird.hourlyCounts || []), 1)

  const [imageLoaded, setImageLoaded] = useState(false)

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
        {/* Placeholder logo shown while loading or if no image */}
        {(!bird.image_url || !imageLoaded) && (
          <div className="bird-card-image-placeholder">
            <img src="/logo.svg" alt="placeholder" className="placeholder-logo" />
          </div>
        )}
        
        {bird.image_url && (
          <img 
            src={`/fotos_pajaros/${bird.image_url}`} 
            alt={displayName} 
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            style={{ opacity: imageLoaded ? 1 : 0 }}
          />
        )}
        <div className="bird-card-badge">
          {bird.detectionCount} ×
        </div>
        {bird.maxConfidence !== null && (
          <div className={`bird-card-badge-bottom ${confColorClass}`}>
            {Math.round(bird.maxConfidence * 100)}%
          </div>
        )}
      </div>

      <div className="bird-card-body">
        <div className="bird-card-name">{displayName}</div>
        <div className="bird-card-sci">{bird.scientific_name}</div>

        <div className="bird-histogram-container">
          <div className="bird-histogram">
            {bird.hourlyCounts?.map((count, i) => {
              const heightPct = (count / maxCount) * 100
              return (
                <div 
                  key={i} 
                  className={`bird-histogram-bar ${count > 0 ? 'has-data' : ''}`}
                  style={{ height: count > 0 ? `${Math.max(heightPct, 15)}%` : '2px' }}
                  title={`${i}:00 - ${count} detections`}
                />
              )
            })}
          </div>
          <div className="bird-histogram-labels">
            <span>0</span>
            <span>6</span>
            <span>12</span>
            <span>18</span>
            <span>24</span>
          </div>
        </div>
      </div>
    </article>
  )
}
