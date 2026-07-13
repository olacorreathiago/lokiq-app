import { NextResponse } from 'next/server'
import { z } from 'zod'
import { textSearch, placeDetails, nearbySearch } from '@/lib/places/client'
import { calcScore } from '@/lib/scoring/calc-score'
import { classifyWebsite } from '@/lib/website/classify-website'

const bodySchema = z.object({
  query: z.string().min(1).max(100),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusMeters: z.number().min(100).max(10000).optional().default(500),
})

export async function POST(request: Request) {
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

  const { query, lat, lng, radiusMeters } = parsed.data

  try {
    const candidates = await textSearch({ query, lat, lng, radiusMeters })

    if (candidates.length === 0) {
      return NextResponse.json({ results: [] })
    }

    const topPlace = candidates[0]!
    const includedTypes = topPlace.primaryType ? [topPlace.primaryType] : []

    const [details, nearbyContext] = await Promise.all([
      placeDetails(topPlace.id),
      includedTypes.length > 0
        ? nearbySearch({ lat, lng, radiusMeters: 1000, includedTypes })
        : Promise.resolve([]),
    ])

    const nearbyWithoutSelf = nearbyContext.filter((p) => p.id !== topPlace.id)
    let noWebsiteRate = 0.5
    if (nearbyWithoutSelf.length > 0) {
      const nearbyDetails = await Promise.all(
        nearbyWithoutSelf.slice(0, 5).map((p) => placeDetails(p.id)),
      )
      const withoutWebsite = nearbyDetails.filter(
        (d) => classifyWebsite(d.websiteUri) !== 'website',
      ).length
      noWebsiteRate = withoutWebsite / nearbyDetails.length
    }

    const websitePresence = classifyWebsite(details.websiteUri)

    const score = calcScore({
      noWebsiteRateInArea: noWebsiteRate,
      reviewCount: details.userRatingCount ?? 0,
      rating: details.rating ?? 0,
      hasPhone: !!details.nationalPhoneNumber,
      hasHours: !!details.regularOpeningHours?.weekdayDescriptions?.length,
    })

    return NextResponse.json({
      results: [
        {
          placeId: topPlace.id,
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
          oppScore: score,
          nearbyCompetitors: nearbyWithoutSelf.length,
          noWebsiteRateInArea: Math.round(noWebsiteRate * 100),
          lat,
          lng,
        },
      ],
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Search failed', detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
