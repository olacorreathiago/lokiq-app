import type { WebsitePresence } from '@/lib/website/classify-website'

export interface SearchResult {
  placeId: string
  name: string
  type: string
  address: string
  phone: string | null
  rating: number | null
  reviewCount: number | null
  hasWebsite: boolean
  websitePresence: WebsitePresence
  websiteUrl: string | null
  hasHours: boolean
  gmapsUri: string | null
  oppScore: number
  lat: number
  lng: number
  nearbyCompetitors?: number
  noWebsiteRateInArea?: number
}
