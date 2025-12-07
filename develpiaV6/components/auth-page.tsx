"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { createClient, isUsingMockClient } from "@/lib/supabase/client"

interface AuthPageProps {
  onDemoLogin?: (email: string, name?: string) => void
}

export function AuthPage({ onDemoLogin }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (onDemoLogin && isUsingMockClient()) {
        // v0 preview mode - use state-based login
        if (!email) {
          setError("Please enter your email")
          setLoading(false)
          return
        }
        if (!isLogin && !name) {
          setError("Please enter your name")
          setLoading(false)
          return
        }
        // Call the demo login handler
        onDemoLogin(email, isLogin ? undefined : name)
        return
      }

      const supabase = createClient()

      if (isLogin) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) {
          setError(signInError.message)
        } else {
          window.location.href = "/"
        }
      } else {
        if (!name) {
          setError("Please enter your name")
          setLoading(false)
          return
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name,
            },
          },
        })

        if (signUpError) {
          setError(signUpError.message)
        } else {
          setError("")
          alert("Account created! Please sign in.")
          setIsLogin(true)
        }
      }
    } catch (err) {
      console.error("[v0] Auth error:", err)
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const isV0Preview = isUsingMockClient()

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <div className="p-8">
          {isV0Preview && (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg text-sm text-yellow-800">
              v0 Preview Mode: 아무 이메일/비밀번호로 로그인 가능합니다. Vercel 배포 후 실제 인증이 작동합니다.
            </div>
          )}

          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Developia
            </h1>
            <p className="text-gray-600 mt-2">Collaborative Project Platform</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-sm font-medium text-gray-700">Name</label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="mt-1"
                  disabled={loading}
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="mt-1"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1"
                disabled={loading}
                required={!isV0Preview}
              />
            </div>

            {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium h-10"
              disabled={loading}
            >
              {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">{isLogin ? "Don't have an account? " : "Already have an account? "}</span>
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                setError("")
              }}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
              disabled={loading}
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}
