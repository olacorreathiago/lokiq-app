import { NextResponse } from 'next/server'
import { z } from 'zod'
import { nearbySearch, placeDetails } from '@/lib/places/client'
import { calcScore } from '@/lib/scoring/calc-score'
import { classifyWebsite } from '@/lib/website/classify-website'
import { createServiceClient, currentUserId } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

const COST_GEOCODE = 0.005
const COST_NEARBY_SEARCH = 0.032
const COST_PLACE_DETAILS_ENTERPRISE = 0.035

const bodySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusMeters: z.number().min(100).max(10000),
  includedTypes: z.array(z.string().max(60)).min(1).max(50).optional(),
  maxResults: z.number().min(1).max(20).optional().default(20),
  onlyWithoutWebsite: z.boolean().optional().default(true),
})

export async function POST(request: Request) {
  const limited = rateLimit(request, { key: 'search-nearby', limit: 10, windowMs: 60_000 })
  if (limited) return limited

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const { lat, lng, radiusMeters, includedTypes, maxResults, onlyWithoutWebsite } = parsed.data

  try {
    const candidates = await nearbySearch({
      lat,
      lng,
      radiusMeters,
      includedTypes: includedTypes ?? [],
      maxResults,
    })

    const operational = candidates.filter(
      (p) => p.businessStatus === 'OPERATIONAL' && (p.rating ?? 0) > 0 && (p.userRatingCount ?? 0) > 0,
    )

    // Excluir bloqueados e leads já guardados ANTES dos Place Details (SKU Enterprise)
    const supabase = createServiceClient()
    const candidateIds = operational.map((p) => p.id)
    const userId = currentUserId()

    const [blockedRes, savedRes] = await Promise.all([
      supabase.from('blocked_places').select('place_id').eq('user_id', userId).in('place_id', candidateIds),
      supabase.from('leads').select('place_id').eq('user_id', userId).in('place_id', candidateIds),
    ])

    // fail-open: se a query falhar (ex: migração ainda não aplicada), não exclui nada
    const blockedIds = new Set((blockedRes.data ?? []).map((r: { place_id: string }) => r.place_id))
    const savedIds = new Set((savedRes.data ?? []).map((r: { place_id: string }) => r.place_id))

    const fresh = operational.filter((p) => !blockedIds.has(p.id) && !savedIds.has(p.id))
    const blockedExcluded = operational.filter((p) => blockedIds.has(p.id)).length
    const alreadySavedExcluded = operational.filter((p) => savedIds.has(p.id)).length

    const detailsCount = fresh.length

    const enriched = await Promise.all(
      fresh.map(async (place) => {
        const details = await placeDetails(place.id)
        const websitePresence = classifyWebsite(details.websiteUri)

        return {
          placeId: place.id,
          name: details.displayName.text,
          type: details.primaryTypeDisplayName?.text ?? details.primaryType ?? 'unknown',
          address: details.formattedAddress ?? '',
          phone: details.nationalPhoneNumber ?? null,
          rating: details.rating ?? null,
          reviewCount: details.userRatingCount ?? null,
          hasWebsite: websitePresence === 'website',
          websitePresence,
          websiteUrl: details.websiteUri ?? null,
          hasHours: !!details.regularOpeningHours?.weekdayDescriptions?.length,
          gmapsUri: details.googleMapsUri ?? null,
          lat,
          lng,
        }
      }),
    )

    // "Sem website" = sem site próprio (inclui quem só tem rede social)
    const withoutWebsite = enriched.filter((r) => r.websitePresence !== 'website')
    const noWebsiteRate = enriched.length > 0 ? withoutWebsite.length / enriched.length : 0

    const toScore = onlyWithoutWebsite ? withoutWebsite : enriched

    const scored = toScore
      .map((r) => ({
        ...r,
        oppScore: calcScore({
          noWebsiteRateInArea: noWebsiteRate,
          reviewCount: r.reviewCount ?? 0,
          rating: r.rating ?? 0,
          hasPhone: !!r.phone,
          hasHours: r.hasHours,
        }),
      }))
      .sort((a, b) => b.oppScore - a.oppScore)

    const cost = {
      geocode: COST_GEOCODE,
      nearbySearch: COST_NEARBY_SEARCH,
      placeDetails: +(COST_PLACE_DETAILS_ENTERPRISE * detailsCount).toFixed(3),
      placeDetailsCount: detailsCount,
      total: +(COST_GEOCODE + COST_NEARBY_SEARCH + COST_PLACE_DETAILS_ENTERPRISE * detailsCount).toFixed(3),
    }

    return NextResponse.json({
      total: candidates.length,
      filtered: fresh.length,
      blockedExcluded,
      alreadySavedExcluded,
      withoutWebsite: withoutWebsite.length,
      noWebsiteRate: Math.round(noWebsiteRate * 100),
      cost,
      results: scored,
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Search failed', detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
