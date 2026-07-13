import { NextResponse } from 'next/server'
import { createServiceClient, currentUserId } from '@/lib/supabase/server'
import { placeDetails } from '@/lib/places/client'
import { calcScore } from '@/lib/scoring/calc-score'
import { classifyWebsite } from '@/lib/website/classify-website'
import { rateLimit } from '@/lib/rate-limit'
import type { Lead } from '@/lib/types'

const COST_PLACE_DETAILS_ENTERPRISE = 0.035

interface CaptureContext {
  has_hours?: boolean
  nearby_competitors?: number
  no_website_rate?: number
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = rateLimit(_request, { key: 'lead-refresh', limit: 20, windowMs: 60_000 })
  if (limited) return limited

  const { id } = await params
  const supabase = createServiceClient()

  const { data: lead, error: fetchError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .eq('user_id', currentUserId())
    .single()

  if (fetchError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  const l = lead as Lead

  const { data: contextEvents } = await supabase
    .from('lead_events')
    .select('metadata')
    .eq('lead_id', id)
    .not('metadata', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10)

  const ctx = ((contextEvents ?? []).find(
    (e: { metadata: CaptureContext | null }) => e.metadata?.has_hours !== undefined,
  )?.metadata ?? {}) as CaptureContext

  try {
    const details = await placeDetails(l.place_id)
    const websitePresence = classifyWebsite(details.websiteUri)
    const hasHours = !!details.regularOpeningHours?.weekdayDescriptions?.length
    const noWebsiteRate = ctx.no_website_rate ?? 0.5

    const oppScore = calcScore({
      noWebsiteRateInArea: noWebsiteRate,
      reviewCount: details.userRatingCount ?? 0,
      rating: details.rating ?? 0,
      hasPhone: !!details.nationalPhoneNumber,
      hasHours,
    })

    const updates = {
      name: details.displayName.text,
      address: details.formattedAddress ?? l.address,
      phone: details.nationalPhoneNumber ?? null,
      rating: details.rating ?? null,
      review_count: details.userRatingCount ?? null,
      has_website: websitePresence === 'website',
      website_presence: websitePresence,
      website_url: details.websiteUri ?? null,
      opp_score: oppScore,
    }

    const { data: updated, error: updateError } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await supabase.from('lead_events').insert({
      lead_id: id,
      event_type: 'data_refreshed',
      source: 'system',
      title: 'Dados actualizados do Google Maps',
      body: `Score: ${l.opp_score} → ${oppScore}`,
      metadata: {
        previous_score: l.opp_score,
        new_score: oppScore,
        has_hours: hasHours,
        nearby_competitors: ctx.nearby_competitors ?? 0,
        no_website_rate: noWebsiteRate,
      },
      user_id: currentUserId(),
    })

    return NextResponse.json({
      lead: updated,
      cost: COST_PLACE_DETAILS_ENTERPRISE,
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Refresh failed', detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
