let supabaseInstance: any = null

// Check if we're in v0 preview environment (CDN loading issues)
const isV0Environment =
  typeof window !== "undefined" &&
  (window.location.hostname.includes("v0.dev") ||
    window.location.hostname.includes("vusercontent.net") ||
    window.location.hostname.includes("lite.vusercontent.net"))

// Mock Supabase client for v0 preview
const createMockClient = () => ({
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    signInWithPassword: async ({ email }: { email: string }) => ({
      data: { user: { id: "demo-user", email, user_metadata: { name: email.split("@")[0] } }, session: {} },
      error: null,
    }),
    signUp: async ({ email }: { email: string }) => ({
      data: { user: { id: "demo-user", email, user_metadata: { name: email.split("@")[0] } }, session: {} },
      error: null,
    }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: (callback: any) => {
      return { data: { subscription: { unsubscribe: () => {} } } }
    },
  },
  from: (table: string) => ({
    select: (columns?: string) => ({
      eq: (col: string, val: any) => ({
        single: async () => ({ data: null, error: null }),
        order: (col: string, opts?: any) => ({
          data: [],
          error: null,
          then: (resolve: any) => resolve({ data: [], error: null }),
        }),
        data: [],
        error: null,
        then: (resolve: any) => resolve({ data: [], error: null }),
      }),
      order: (col: string, opts?: any) => ({
        eq: (col: string, val: any) => ({
          data: [],
          error: null,
          then: (resolve: any) => resolve({ data: [], error: null }),
        }),
        data: [],
        error: null,
        then: (resolve: any) => resolve({ data: [], error: null }),
      }),
      single: async () => ({ data: null, error: null }),
      data: [],
      error: null,
      then: (resolve: any) => resolve({ data: [], error: null }),
    }),
    insert: (data: any) => ({
      select: () => ({
        single: async () => ({ data: { id: "mock-id", ...data }, error: null }),
        data: [{ id: "mock-id", ...data }],
        error: null,
        then: (resolve: any) => resolve({ data: [{ id: "mock-id", ...data }], error: null }),
      }),
      single: async () => ({ data: { id: "mock-id", ...data }, error: null }),
    }),
    update: (data: any) => ({
      eq: (col: string, val: any) => ({
        select: () => ({ single: async () => ({ data: { id: val, ...data }, error: null }) }),
        data: { id: val, ...data },
        error: null,
        then: (resolve: any) => resolve({ data: { id: val, ...data }, error: null }),
      }),
    }),
    delete: () => ({
      eq: (col: string, val: any) => ({
        data: null,
        error: null,
        then: (resolve: any) => resolve({ data: null, error: null }),
      }),
    }),
    upsert: (data: any) => ({
      select: () => ({ single: async () => ({ data: { id: "mock-id", ...data }, error: null }) }),
      data: { id: "mock-id", ...data },
      error: null,
      then: (resolve: any) => resolve({ data: { id: "mock-id", ...data }, error: null }),
    }),
  }),
  channel: (name: string) => ({
    on: (event: string, opts: any, callback: any) => ({
      on: (event: string, opts: any, callback: any) => ({
        subscribe: () => ({ unsubscribe: () => {} }),
      }),
      subscribe: () => ({ unsubscribe: () => {} }),
    }),
    subscribe: () => ({ unsubscribe: () => {} }),
  }),
  removeChannel: (channel: any) => {},
  _isV0Mock: true,
})

export function createClient() {
  if (supabaseInstance) {
    return supabaseInstance
  }

  // Use mock client in v0 environment
  if (isV0Environment) {
    console.log("[v0] Using mock Supabase client for v0 preview")
    supabaseInstance = createMockClient()
    return supabaseInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log("[v0] Missing Supabase env vars, using mock client")
    supabaseInstance = createMockClient()
    return supabaseInstance
  }

  try {
    const { createClient: createSupabaseClient } = require("@supabase/supabase-js")
    supabaseInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  } catch (e) {
    console.log("[v0] Supabase package not available, using mock client")
    supabaseInstance = createMockClient()
  }

  return supabaseInstance
}

export { createClient as createBrowserClient }

// Helper to check if using mock client
export function isUsingMockClient() {
  return supabaseInstance?._isV0Mock === true
}
