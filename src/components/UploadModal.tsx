'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Bird } from '@/lib/database.types'
import { useI18n } from '@/lib/i18n'

interface UploadModalProps {
  onClose: () => void
  onSuccess: () => void
  preselectedBirdId?: number
}

export default function UploadModal({ onClose, onSuccess, preselectedBirdId }: UploadModalProps) {
  const { t } = useI18n()
  const [birds, setBirds] = useState<Bird[]>([])
  const [locations, setLocations] = useState<{ id: number; name: string | null }[]>([])
  const [birdId, setBirdId] = useState<string>(preselectedBirdId?.toString() ?? '')
  const [locationId, setLocationId] = useState<string>('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5))
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('birds').select('id, scientific_name, common_name_eng').order('common_name_eng').then(({ data }) => {
      if (data) setBirds(data as Bird[])
    })
    supabase.from('locations').select('id, name').then(({ data }) => {
      if (data) setLocations(data)
    })
    // Prevent scroll
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !birdId || !date || !time) {
      setError('Please fill all required fields and select a file.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      // Upload file to Supabase Storage bucket "bird-audio"
      const ext = file.name.split('.').pop()
      const fileName = `${date}_${time.replace(':', '-')}_bird${birdId}_${Date.now()}.${ext}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('bird-audio')
        .upload(fileName, file, { contentType: file.type })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('bird-audio')
        .getPublicUrl(fileName)

      // Create detection record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: dbError } = await (supabase.from('detections') as any).insert({
        bird_id: parseInt(birdId),
        location_id: locationId ? parseInt(locationId) : null,
        date,
        time: `${time}:00`,
        audio_url: publicUrl,
      })

      if (dbError) throw dbError

      onSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      id="upload-modal-overlay"
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 className="modal-title" id="modal-title">{t('upload.title')}</h2>
          <button className="modal-close" onClick={onClose} aria-label={t('upload.cancel')}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="upload-bird">{t('upload.select_bird')} *</label>
            <select
              id="upload-bird"
              className="form-select"
              value={birdId}
              onChange={(e) => setBirdId(e.target.value)}
              required
            >
              <option value="">—</option>
              {birds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.common_name_eng ?? b.scientific_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="upload-location">{t('bird.location')}</label>
            <select
              id="upload-location"
              className="form-select"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              <option value="">{t('location.all')}</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name ?? `Location ${l.id}`}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="upload-date">{t('upload.date')} *</label>
              <input
                id="upload-date"
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="upload-time">{t('upload.time')} *</label>
              <input
                id="upload-time"
                type="time"
                className="form-input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="upload-file">{t('upload.file')} *</label>
            <input
              id="upload-file"
              type="file"
              className="form-input"
              accept="audio/*,.wav,.mp3,.ogg,.flac"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </div>

          {error && (
            <p style={{ color: 'var(--accent-red)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
              ⚠ {error}
            </p>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              id="upload-cancel-btn"
            >
              {t('upload.cancel')}
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              id="upload-submit-btn"
            >
              {loading ? '...' : t('upload.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
