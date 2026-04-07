'use client'

interface ConfidenceBarProps {
  value: number | null // 0 to 1
  showLabel?: boolean
}

export default function ConfidenceBar({ value, showLabel = true }: ConfidenceBarProps) {
  const pct = value != null ? Math.round(value * 100) : 0
  const confClass =
    pct >= 80 ? 'conf-high' : pct >= 55 ? 'conf-med' : 'conf-low'

  return (
    <div className={`confidence-bar ${confClass}`}>
      <div className="confidence-track">
        <div
          className="confidence-fill"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showLabel && (
        <span className="confidence-value">{pct}%</span>
      )}
    </div>
  )
}
