import { NextResponse } from 'next/server'
import { z } from 'zod'
import { placeDetails } from '@/lib/places/client'

const bodySchema = z.object({
  placeId: z.string().min(1).max(300),
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

  try {
    const details = await placeDetails(parsed.data.placeId)

    return NextResponse.json({
      placeId: details.id,
      name: details.displayName.text,
      type: details.primaryTypeDisplayName?.text ?? details.primaryType ?? 'unknown',
      address: details.formattedAddress ?? '',
      phone: details.nationalPhoneNumber ?? null,
      rating: details.rating ?? null,
      reviewCount: details.userRatingCount ?? null,
      hasWebsite: !!details.websiteUri,
      websiteUrl: details.websiteUri ?? null,
      hasHours: !!details.regularOpeningHours?.weekdayDescriptions?.length,
      gmapsUri: details.googleMapsUri ?? null,
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Details failed', detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
