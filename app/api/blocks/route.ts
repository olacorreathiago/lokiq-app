import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient, currentUserId } from '@/lib/supabase/server'

const createSchema = z.object({
  place_id: z.string().min(1).max(300),
  name: z.string().min(1).max(200),
  reason: z.string().max(500).nullable().default(null),
})

export async function GET() {
  const supabase = createServiceClient()

  const { data: blocks, error } = await supabase
    .from('blocked_places')
    .select('*')
    .eq('user_id', currentUserId())
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ blocks })
}

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
    .from('blocked_places')
    .select('id')
    .eq('place_id', parsed.data.place_id)
    .eq('user_id', currentUserId())
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'Place already blocked', blockId: existing.id },
      { status: 409 },
    )
  }

  const { data: block, error } = await supabase
    .from('blocked_places')
    .insert({ ...parsed.data, user_id: currentUserId() })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ block }, { status: 201 })
}
