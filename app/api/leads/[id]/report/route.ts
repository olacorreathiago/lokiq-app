import { NextResponse } from 'next/server'
import { createServiceClient, currentUserId } from '@/lib/supabase/server'
import { generateOpportunityReport } from '@/lib/ai/report'
import type { Lead } from '@/lib/types'

interface CaptureContext {
  has_hours?: boolean
  nearby_competitors?: number
  no_website_rate?: number
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  // Contexto de mercado guardado na captura/actualização mais recente
  // (filtro em JS — evita comparar enum com valores que podem não existir ainda)
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
  const l = lead as Lead

  try {
    const { report, usage } = await generateOpportunityReport({
      name: l.name,
      type: l.type,
      address: l.address,
      phone: l.phone,
      rating: l.rating,
      reviewCount: l.review_count,
      hasWebsite: l.has_website,
      websitePresence: l.website_presence,
      websiteUrl: l.website_url,
      hasHours: ctx.has_hours ?? false,
      oppScore: l.opp_score,
      nearbyCompetitors: ctx.nearby_competitors ?? 0,
      noWebsiteRateInArea: Math.round((ctx.no_website_rate ?? 0.5) * 100),
    })

    await supabase.from('lead_events').insert({
      lead_id: id,
      event_type: 'report_created',
      source: 'ai',
      title: 'Relatório gerado',
      metadata: {
        report,
        has_hours: ctx.has_hours ?? false,
        nearby_competitors: ctx.nearby_competitors ?? 0,
        no_website_rate: ctx.no_website_rate ?? 0.5,
      },
      user_id: currentUserId(),
    })

    return NextResponse.json({ report, usage })
  } catch (e) {
    return NextResponse.json(
      { error: 'AI report failed', detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
