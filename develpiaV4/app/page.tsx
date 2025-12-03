"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient, isUsingMockClient } from "@/lib/supabase/client"
import { MainApp } from "@/components/main-app"
import { AuthPage } from "@/components/auth-page"

interface User {
  id: string
  email?: string
  user_metadata?: {
    name?: string
  }
}

const DEMO_USER: User = {
  id: "demo-user-id",
  email: "demo@example.com",
  user_metadata: {
    name: "Demo User",
  },
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)

  const handleDemoLogin = useCallback((email: string, name?: string) => {
    setUser({
      id: "demo-user-" + Date.now(),
      email: email,
      user_metadata: {
        name: name || email.split("@")[0],
      },
    })
    setIsDemo(true)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    if (isUsingMockClient()) {
      setLoading(false)
      return
    }

    // Check current session
    const checkUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error("Error checking user:", error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkUser()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (isDemo && user) {
    return (
      <div>
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black text-center py-2 text-sm z-50">
          v0 Preview Mode - Supabase 연동은 Vercel 배포 후 정상 작동합니다
        </div>
        <div className="pt-8">
          <MainApp />
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthPage onDemoLogin={isUsingMockClient() ? handleDemoLogin : undefined} />
  }

  return <MainApp />
}
