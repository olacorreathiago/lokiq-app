import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient, currentUserId } from '@/lib/supabase/server'

const createSchema = z.object({
  place_id: z.string().min(1).max(300),
  name: z.string().min(1).max(200),
  type: z.string().min(1).max(100),
  address: z.string().max(500).default(''),
  phone: z.string().max(30).nullable().default(null),
  rating: z.number().min(0).max(5).nullable().default(null),
  review_count: z.number().min(0).nullable().default(null),
  has_website: z.boolean(),
  website_presence: z.enum(['none', 'social', 'website']).optional(),
  website_url: z.string().url().nullable().default(null),
  opp_score: z.number().min(0).max(100),
  capture_mode: z.enum(['raio', 'pontual']),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  gmaps_uri: z.string().url().nullable().default(null),
  // contexto de mercado — guardado no evento de captura para relatórios futuros
  has_hours: z.boolean().optional().default(false),
  nearby_competitors: z.number().min(0).optional().default(0),
  no_website_rate: z.number().min(0).max(1).optional().default(0.5),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const supabase = createServiceClient()

  const { data: existing } = await supabase
    .from('leads')
    .select('id')
    .eq('place_id', parsed.data.place_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'Lead already exists', leadId: existing.id },
      { status: 409 },
    )
  }

  const { has_hours, nearby_competitors, no_website_rate, ...leadFields } = parsed.data

  const websitePresence =
    leadFields.website_presence ?? (leadFields.has_website ? 'website' : 'none')

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      ...leadFields,
      website_presence: websitePresence,
      stage: 'report',
      user_id: currentUserId(),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase.from('lead_events').insert({
    lead_id: lead.id,
    event_type: 'report_created',
    source: 'auto',
    title: 'Lead capturado',
    body: `Lead capturado via modo ${parsed.data.capture_mode}`,
    metadata: {
      opp_score: parsed.data.opp_score,
      has_hours,
      nearby_competitors,
      no_website_rate,
    },
    stage_to: 'report',
    user_id: currentUserId(),
  })

  return NextResponse.json({ lead }, { status: 201 })
}

export async function GET() {
  const supabase = createServiceClient()

  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', currentUserId())
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ leads })
}
