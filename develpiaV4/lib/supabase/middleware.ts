import { createClient } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // Skip Supabase auth check if env vars are not set
    return supabaseResponse
  }

  try {
    const accessToken = request.cookies.get("sb-access-token")?.value

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      },
    })

    await supabase.auth.getUser()
  } catch (error) {
    // Silently handle errors - auth is optional in middleware
  }

  return supabaseResponse
}
