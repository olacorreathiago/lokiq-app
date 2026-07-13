export type LeadStage =
  | 'report'
  | 'demo'
  | 'touch'
  | 'negotiation'
  | 'closed'
  | 'discarded'

export type EventType =
  | 'report_created'
  | 'demo_generated'
  | 'stage_changed'
  | 'note_added'
  | 'call_logged'
  | 'meeting_logged'
  | 'objection_logged'
  | 'reminder_set'
  | 'reminder_fired'
  | 'ai_suggestion'
  | 'data_refreshed'

export type EventSource = 'auto' | 'manual' | 'ai' | 'system'

export type CaptureMode = 'raio' | 'pontual'

export type ProductSold = 'landing' | 'store' | 'booking' | 'custom'

export interface Lead {
  id: string
  place_id: string
  name: string
  type: string
  address: string
  phone: string | null
  rating: number | null
  review_count: number | null
  has_website: boolean
  website_presence: 'none' | 'social' | 'website'
  website_url: string | null
  opp_score: number
  stage: LeadStage
  demo_url: string | null
  capture_mode: CaptureMode
  lat: number
  lng: number
  gmaps_uri: string | null
  created_at: string
  updated_at: string
  user_id: string
}

export interface LeadEvent {
  id: string
  lead_id: string
  event_type: EventType
  source: EventSource
  title: string
  body: string | null
  metadata: Record<string, unknown> | null
  stage_from: LeadStage | null
  stage_to: LeadStage | null
  scheduled_at: string | null
  triggered: boolean
  created_at: string
  user_id: string
}

export interface Deal {
  id: string
  lead_id: string
  product_sold: ProductSold
  value_eur: number
  closed_at: string
  notes: string | null
}
