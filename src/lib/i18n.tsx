'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export type Language = 'en' | 'de' | 'es'

interface I18nContextType {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: string) => string
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    'nav.title': 'BirdWeb',
    'nav.home': 'Detections',
    'tab.today': 'Today',
    'tab.week': 'This Week',
    'tab.month': 'This Month',
    'tab.all': 'All Time',
    'tab.custom': 'Custom ▾',
    'picker.day': 'Day',
    'picker.week': 'Week',
    'picker.month': 'Month',
    'picker.apply': 'Apply',
    'stats.detections': 'Detections',
    'stats.species': 'Species',
    'stats.peak_hour': 'Peak Hour',
    'stats.avg_confidence': 'Avg. Confidence',
    'bird.detections': 'Detections',
    'bird.last_seen': 'Last seen',
    'bird.confidence': 'Confidence',
    'bird.scientific': 'Scientific name',
    'bird.wikipedia': 'Wikipedia',
    'bird.no_audio': 'No audio available',
    'bird.play_audio': 'Play audio',
    'bird.date': 'Date',
    'bird.time': 'Time',
    'bird.location': 'Location',
    'bird.week': 'Week',
    'bird.threshold': 'Threshold',
    'bird.sensitivity': 'Sensitivity',
    'bird.overlap': 'Overlap',
    'bird.back': '← Back to detections',
    'bird.no_detections': 'No detections found',
    'bird.no_image': 'No image available',
    'upload.title': 'Upload Audio',
    'upload.select_bird': 'Select bird',
    'upload.date': 'Date',
    'upload.time': 'Time',
    'upload.file': 'Audio file',
    'upload.submit': 'Upload',
    'upload.cancel': 'Cancel',
    'upload.success': 'Audio uploaded successfully',
    'upload.error': 'Upload failed',
    'location.all': 'All locations',
    'location.filter': 'Location',
    'common.loading': 'Loading...',
    'common.error': 'Something went wrong',
    'common.no_data': 'No data available',
    'chart.detections_over_time': 'Detections over time',
    'chart.confidence_over_time': 'Confidence over time',
  },
  de: {
    'nav.title': 'BirdWeb',
    'nav.home': 'Erkennungen',
    'tab.today': 'Heute',
    'tab.week': 'Diese Woche',
    'tab.month': 'Diesen Monat',
    'tab.all': 'Gesamt',
    'tab.custom': 'Auswahl ▾',
    'picker.day': 'Tag',
    'picker.week': 'Woche',
    'picker.month': 'Monat',
    'picker.apply': 'Anwenden',
    'stats.detections': 'Erkennungen',
    'stats.species': 'Arten',
    'stats.peak_hour': 'Hauptzeit',
    'stats.avg_confidence': 'Ø Konfidenz',
    'bird.detections': 'Erkennungen',
    'bird.last_seen': 'Zuletzt gesehen',
    'bird.confidence': 'Konfidenz',
    'bird.scientific': 'Wissenschaftlicher Name',
    'bird.wikipedia': 'Wikipedia',
    'bird.no_audio': 'Kein Audio verfügbar',
    'bird.play_audio': 'Audio abspielen',
    'bird.date': 'Datum',
    'bird.time': 'Uhrzeit',
    'bird.location': 'Ort',
    'bird.week': 'Woche',
    'bird.threshold': 'Schwellenwert',
    'bird.sensitivity': 'Empfindlichkeit',
    'bird.overlap': 'Überlappung',
    'bird.back': '← Zurück zu Erkennungen',
    'bird.no_detections': 'Keine Erkennungen gefunden',
    'bird.no_image': 'Kein Bild verfügbar',
    'upload.title': 'Audio hochladen',
    'upload.select_bird': 'Vogel wählen',
    'upload.date': 'Datum',
    'upload.time': 'Uhrzeit',
    'upload.file': 'Audiodatei',
    'upload.submit': 'Hochladen',
    'upload.cancel': 'Abbrechen',
    'upload.success': 'Audio erfolgreich hochgeladen',
    'upload.error': 'Upload fehlgeschlagen',
    'location.all': 'Alle Orte',
    'location.filter': 'Ort',
    'common.loading': 'Laden...',
    'common.error': 'Etwas ist schiefgelaufen',
    'common.no_data': 'Keine Daten verfügbar',
    'chart.detections_over_time': 'Erkennungen im Zeitverlauf',
    'chart.confidence_over_time': 'Konfidenz im Zeitverlauf',
  },
  es: {
    'nav.title': 'BirdWeb',
    'nav.home': 'Detecciones',
    'tab.today': 'Hoy',
    'tab.week': 'Esta Semana',
    'tab.month': 'Este Mes',
    'tab.all': 'Todo',
    'tab.custom': 'Personalizar ▾',
    'picker.day': 'Día',
    'picker.week': 'Semana',
    'picker.month': 'Mes',
    'picker.apply': 'Aplicar',
    'stats.detections': 'Detecciones',
    'stats.species': 'Especies',
    'stats.peak_hour': 'Hora pico',
    'stats.avg_confidence': 'Confianza media',
    'bird.detections': 'Detecciones',
    'bird.last_seen': 'Visto por última vez',
    'bird.confidence': 'Confianza',
    'bird.scientific': 'Nombre científico',
    'bird.wikipedia': 'Wikipedia',
    'bird.no_audio': 'Sin audio disponible',
    'bird.play_audio': 'Reproducir audio',
    'bird.date': 'Fecha',
    'bird.time': 'Hora',
    'bird.location': 'Ubicación',
    'bird.week': 'Semana',
    'bird.threshold': 'Umbral',
    'bird.sensitivity': 'Sensibilidad',
    'bird.overlap': 'Solapamiento',
    'bird.back': '← Volver a detecciones',
    'bird.no_detections': 'No se encontraron detecciones',
    'bird.no_image': 'Sin imagen disponible',
    'upload.title': 'Subir audio',
    'upload.select_bird': 'Seleccionar ave',
    'upload.date': 'Fecha',
    'upload.time': 'Hora',
    'upload.file': 'Archivo de audio',
    'upload.submit': 'Subir',
    'upload.cancel': 'Cancelar',
    'upload.success': 'Audio subido correctamente',
    'upload.error': 'Error al subir',
    'location.all': 'Todas las ubicaciones',
    'location.filter': 'Ubicación',
    'common.loading': 'Cargando...',
    'common.error': 'Algo salió mal',
    'common.no_data': 'Sin datos disponibles',
    'chart.detections_over_time': 'Detecciones en el tiempo',
    'chart.confidence_over_time': 'Confianza en el tiempo',
  },
}

const I18nContext = createContext<I18nContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('en')

  useEffect(() => {
    const saved = localStorage.getItem('birdweb-lang') as Language | null
    if (saved && ['en', 'de', 'es'].includes(saved)) {
      setLangState(saved)
    }
  }, [])

  const setLang = (newLang: Language) => {
    setLangState(newLang)
    localStorage.setItem('birdweb-lang', newLang)
  }

  const t = (key: string): string => {
    return translations[lang][key] ?? translations['en'][key] ?? key
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
