import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        },
      },
    },
  )
}

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// Interino até Fase 4 (Supabase Auth): user fixo de dev para satisfazer o NOT NULL
// de user_id nas tabelas. Substituir por auth.uid() da sessão quando houver login.
export function currentUserId(): string {
  const id = process.env.DEV_USER_ID
  if (!id) {
    throw new Error('DEV_USER_ID em falta no .env.local (ver .env.example)')
  }
  return id
}
