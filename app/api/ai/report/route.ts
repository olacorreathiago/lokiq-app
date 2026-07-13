import { NextResponse } from 'next/server'
import { z } from 'zod'
import { generateOpportunityReport } from '@/lib/ai/report'
import { rateLimit } from '@/lib/rate-limit'

const bodySchema = z.object({
  name: z.string().min(1).max(200),
  type: z.string().min(1).max(100),
  address: z.string().max(500).default(''),
  phone: z.string().max(30).nullable().default(null),
  rating: z.number().min(0).max(5).nullable().default(null),
  reviewCount: z.number().min(0).nullable().default(null),
  hasWebsite: z.boolean(),
  websitePresence: z.enum(['none', 'social', 'website']).optional(),
  websiteUrl: z.string().url().nullable().optional().default(null),
  hasHours: z.boolean(),
  oppScore: z.number().min(0).max(100),
  nearbyCompetitors: z.number().min(0).optional().default(0),
  noWebsiteRateInArea: z.number().min(0).max(100).optional().default(50),
})

export async function POST(request: Request) {
  const limited = rateLimit(request, { key: 'ai-report', limit: 20, windowMs: 60_000 })
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

  try {
    const { report, usage } = await generateOpportunityReport(parsed.data)
    return NextResponse.json({ report, usage })
  } catch (e) {
    return NextResponse.json(
      { error: 'AI report failed', detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
