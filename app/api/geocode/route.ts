import { NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

const querySchema = z.object({
  address: z.string().min(1).max(300),
})

export async function GET(request: Request) {
  const limited = rateLimit(request, { key: 'geocode', limit: 20, windowMs: 60_000 })
  if (limited) return limited

  const url = new URL(request.url)
  const parsed = querySchema.safeParse({ address: url.searchParams.get('address') ?? '' })

  if (!parsed.success) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(parsed.data.address)}&key=${process.env.GOOGLE_PLACES_API_KEY!}`,
      { signal: AbortSignal.timeout(5000) },
    )

    const data = await res.json()
    if (data.status !== 'OK' || !data.results?.[0]) {
      return NextResponse.json({ error: 'Morada nao encontrada' }, { status: 404 })
    }

    const loc = data.results[0].geometry.location
    return NextResponse.json({ lat: loc.lat, lng: loc.lng })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Geocoding failed' },
      { status: 500 },
    )
  }
}
