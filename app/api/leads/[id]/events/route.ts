import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient, currentUserId } from '@/lib/supabase/server'

const postSchema = z.object({
  event_type: z.enum([
    'note_added',
    'call_logged',
    'meeting_logged',
    'objection_logged',
    'reminder_set',
  ]),
  title: z.string().min(1).max(200),
  body: z.string().max(2000).nullable().default(null),
  scheduled_at: z.string().datetime().nullable().default(null),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: events, error } = await supabase
    .from('lead_events')
    .select('*')
    .eq('lead_id', id)
    .eq('user_id', currentUserId())
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ events })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const supabase = createServiceClient()

  const { data: lead } = await supabase
    .from('leads')
    .select('id')
    .eq('id', id)
    .single()

  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  const { data: event, error } = await supabase
    .from('lead_events')
    .insert({
      lead_id: id,
      event_type: parsed.data.event_type,
      source: 'manual',
      title: parsed.data.title,
      body: parsed.data.body,
      scheduled_at: parsed.data.scheduled_at,
      user_id: currentUserId(),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ event }, { status: 201 })
}
