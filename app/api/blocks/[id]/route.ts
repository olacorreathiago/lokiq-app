import { NextResponse } from 'next/server'
import { createServiceClient, currentUserId } from '@/lib/supabase/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: deleted, error } = await supabase
    .from('blocked_places')
    .delete()
    .eq('id', id)
    .eq('user_id', currentUserId())
    .select('id')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!deleted) {
    return NextResponse.json({ error: 'Block not found' }, { status: 404 })
  }

  return NextResponse.json({ id: deleted.id })
}
