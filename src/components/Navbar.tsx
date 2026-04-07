'use client'

import Link from 'next/link'
import { useI18n, type Language } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Location } from '@/lib/database.types'

export type Tab = 'today' | 'week' | 'month' | 'all' | 'custom'

export interface CustomRange {
  mode: 'day' | 'week' | 'month'
  value: string // ISO date string for day, 'YYYY-Www' for week, 'YYYY-MM' for month
}

interface NavbarProps {
  selectedLocation: number | null
  onLocationChange: (id: number | null) => void
  onUploadClick: () => void
  selectedTab?: Tab
  onTabChange?: (tab: Tab) => void
  customRange?: CustomRange | null
  onCustomRangeChange?: (range: CustomRange | null) => void
}

export default function Navbar({
  selectedLocation,
  onLocationChange,
  onUploadClick,
  selectedTab,
  onTabChange,
  customRange,
  onCustomRangeChange,
}: NavbarProps) {
  const { lang, setLang, t } = useI18n()
  const [locations, setLocations] = useState<Location[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerMode, setPickerMode] = useState<'day' | 'week' | 'month'>('day')
  const [pickerValue, setPickerValue] = useState('')
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase
      .from('locations')
      .select('*')
      .order('name')
      .then(({ data }) => {
        if (data) setLocations(data)
      })
  }, [])

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    if (pickerOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [pickerOpen])

  // Seed picker value when opening
  const openPicker = () => {
    const today = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    if (pickerMode === 'day') {
      setPickerValue(
        customRange?.mode === 'day'
          ? customRange.value
          : `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
      )
    } else if (pickerMode === 'week') {
      // ISO week: YYYY-Www
      setPickerValue(
        customRange?.mode === 'week' ? customRange.value : isoWeek(today)
      )
    } else {
      setPickerValue(
        customRange?.mode === 'month'
          ? customRange.value
          : `${today.getFullYear()}-${pad(today.getMonth() + 1)}`
      )
    }
    setPickerOpen(true)
  }

  const applyCustom = () => {
    if (!pickerValue) return
    onCustomRangeChange?.({ mode: pickerMode, value: pickerValue })
    onTabChange?.('custom')
    setPickerOpen(false)
  }

  const langs: Language[] = ['en', 'de', 'es']
  const langLabels: Record<Language, string> = { en: 'EN', de: 'DE', es: 'ES' }

  const quickTabs: { key: Tab; label: string }[] = [
    { key: 'today', label: t('tab.today') },
    { key: 'week', label: t('tab.week') },
    { key: 'month', label: t('tab.month') },
    { key: 'all', label: t('tab.all') },
  ]

  const customLabel = customRange
    ? formatCustomLabel(customRange, lang)
    : t('tab.custom')

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-inner">
          <Link href="/" className="navbar-logo">
            <span className="logo-icon">🦅</span>
            <span>VogelStation</span>
          </Link>

          {/* ── Time filter tabs ── */}
          {selectedTab && onTabChange && onCustomRangeChange && (
            <div className="navbar-tabs" role="tablist" aria-label="Time filter">
            {quickTabs.map(({ key, label }) => (
              <button
                key={key}
                id={`nav-tab-${key}`}
                role="tab"
                aria-selected={selectedTab === key}
                className={`nav-tab-btn ${selectedTab === key ? 'active' : ''}`}
                onClick={() => {
                  onTabChange?.(key)
                  onCustomRangeChange?.(null)
                  setPickerOpen(false)
                }}
              >
                {label}
              </button>
            ))}

            {/* Custom picker trigger */}
            <div className="nav-picker-wrap" ref={pickerRef}>
              <button
                id="nav-tab-custom"
                role="tab"
                aria-selected={selectedTab === 'custom'}
                aria-expanded={pickerOpen}
                className={`nav-tab-btn nav-tab-custom ${selectedTab === 'custom' ? 'active' : ''}`}
                onClick={() => (pickerOpen ? setPickerOpen(false) : openPicker())}
              >
                {selectedTab === 'custom' ? customLabel : t('tab.custom')}
                <span className="nav-tab-chevron">{pickerOpen ? '▲' : '▼'}</span>
              </button>

              {pickerOpen && (
                <div className="nav-picker-dropdown" role="dialog" aria-label="Custom date picker">
                  {/* Mode selector */}
                  <div className="picker-mode-row">
                    {(['day', 'week', 'month'] as const).map((m) => (
                      <button
                        key={m}
                        className={`picker-mode-btn ${pickerMode === m ? 'active' : ''}`}
                        onClick={() => {
                          setPickerMode(m)
                          // reset value on mode switch
                          const today = new Date()
                          const pad = (n: number) => String(n).padStart(2, '0')
                          if (m === 'day')
                            setPickerValue(
                              `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
                            )
                          else if (m === 'week') setPickerValue(isoWeek(today))
                          else
                            setPickerValue(
                              `${today.getFullYear()}-${pad(today.getMonth() + 1)}`
                            )
                        }}
                      >
                        {t(`picker.${m}`)}
                      </button>
                    ))}
                  </div>

                  {/* Native date/week/month input */}
                  <input
                    id="custom-date-input"
                    type={pickerMode === 'day' ? 'date' : pickerMode === 'week' ? 'week' : 'month'}
                    value={pickerValue}
                    onChange={(e) => setPickerValue(e.target.value)}
                    className="picker-input"
                    max={todayIso()}
                  />

                  <button className="picker-apply-btn" onClick={applyCustom}>
                    {t('picker.apply')}
                  </button>
                </div>
              )}
            </div>
          </div>
          )}

          <div className="navbar-controls">
            {/* Location filter */}
            <select
              className="location-select"
              value={selectedLocation ?? ''}
              onChange={(e) =>
                onLocationChange(e.target.value === '' ? null : parseInt(e.target.value))
              }
              aria-label={t('location.filter')}
            >
              <option value="">{t('location.all')}</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name ?? `Location ${loc.id}`}
                </option>
              ))}
            </select>

            {/* Language selector */}
            <div className="lang-selector" role="group" aria-label="Select language">
              {langs.map((l) => (
                <button
                  key={l}
                  id={`lang-btn-${l}`}
                  className={`lang-btn ${lang === l ? 'active' : ''}`}
                  onClick={() => setLang(l)}
                  aria-pressed={lang === l}
                >
                  {langLabels[l]}
                </button>
              ))}
            </div>

            {/* Upload button */}
            <button
              id="upload-audio-btn"
              className="upload-btn"
              onClick={onUploadClick}
              aria-label={t('upload.title')}
            >
              <span>↑</span>
              <span>{t('upload.title')}</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

// ── helpers ──────────────────────────────────────────────────────────────────

function todayIso(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function isoWeek(d: Date): string {
  // Returns 'YYYY-Www' for the browser's week input
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const diffMs = d.getTime() - startOfWeek1.getTime()
  const weekNo = Math.floor(diffMs / (7 * 24 * 3600 * 1000)) + 1
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-W${pad(weekNo)}`
}

export function formatCustomLabel(range: CustomRange, lang: string): string {
  if (range.mode === 'day') {
    return new Date(range.value + 'T12:00:00').toLocaleDateString(
      lang === 'de' ? 'de-DE' : lang === 'es' ? 'es-ES' : 'en-GB',
      { day: 'numeric', month: 'short', year: 'numeric' }
    )
  }
  if (range.mode === 'week') {
    // 'YYYY-Www' → show as "Wxx, YYYY"
    return range.value.replace('-', ' ').replace('W', 'W')
  }
  // month: 'YYYY-MM'
  const [y, m] = range.value.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(
    lang === 'de' ? 'de-DE' : lang === 'es' ? 'es-ES' : 'en-GB',
    { month: 'long', year: 'numeric' }
  )
}
