import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient, currentUserId } from '@/lib/supabase/server'

const patchSchema = z.object({
  stage: z.enum(['report', 'demo', 'touch', 'negotiation', 'closed', 'discarded']),
  reason: z.string().max(500).optional(),
})

export async function PATCH(
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

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const supabase = createServiceClient()

  const { data: lead, error: fetchError } = await supabase
    .from('leads')
    .select('id, stage')
    .eq('id', id)
    .single()

  if (fetchError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  const oldStage = lead.stage as string
  const newStage = parsed.data.stage

  if (oldStage === newStage) {
    return NextResponse.json({ error: 'Already in this stage' }, { status: 400 })
  }

  const { error: updateError } = await supabase
    .from('leads')
    .update({ stage: newStage })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await supabase.from('lead_events').insert({
    lead_id: id,
    event_type: 'stage_changed',
    source: 'manual',
    title: `Stage: ${oldStage} → ${newStage}`,
    body: parsed.data.reason ?? null,
    stage_from: oldStage,
    stage_to: newStage,
    user_id: currentUserId(),
  })

  return NextResponse.json({ id, stage: newStage, previousStage: oldStage })
}
