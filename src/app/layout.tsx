import type { Metadata } from 'next'
import './globals.css'
import { I18nProvider } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'BirdWeb — BirdNET-Pi Dashboard',
  description: 'Explore bird detections from your BirdNET-Pi station. Browse species, listen to audio recordings, and track detections over time.',
  keywords: 'birdnet, bird detection, birdwatching, ornithology, bird sounds',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  )
}
