import type { Metadata } from 'next'
import BirdDetailClient from './BirdDetailClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Bird #${id} — BirdWeb`,
    description: 'View detections, audio recordings, and confidence data for this bird species.',
  }
}

export default async function BirdDetailPage({ params }: PageProps) {
  const { id } = await params
  return <BirdDetailClient birdId={parseInt(id)} />
}
