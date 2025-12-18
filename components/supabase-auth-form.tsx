"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Database, Loader2 } from "lucide-react"
import { signUp, signIn } from "@/lib/supabase-auth"

interface SupabaseAuthFormProps {
  onSuccess: () => void
}

export function SupabaseAuthForm({ onSuccess }: SupabaseAuthFormProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      if (isLogin) {
        const { error: signInError } = await signIn(email, password)
        if (signInError) throw new Error(signInError)
      } else {
        if (!username.trim()) throw new Error("Username is required")
        const { error: signUpError } = await signUp(email, password, username, false)
        if (signUpError) throw new Error(signUpError)
      }
      onSuccess()
    } catch (err: any) {
      setError(err.message || "Authentication failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gradient-to-br from-slate-800/90 via-purple-800/90 to-slate-800/90 border-purple-500/30 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full flex items-center justify-center">
            <Database className="h-8 w-8 text-slate-900" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">{isLogin ? "Login" : "Sign Up"}</CardTitle>
          <CardDescription className="text-purple-200">
            {isLogin ? "Access your guarantor records" : "Create a new account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white">Email</label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="mt-1 bg-slate-700/50 border-purple-400/30 text-white placeholder:text-purple-200"
              />
            </div>

            {!isLogin && (
              <div>
                <label className="text-sm font-medium text-white">Username</label>
                <Input
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="mt-1 bg-slate-700/50 border-purple-400/30 text-white placeholder:text-purple-200"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-white">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="mt-1 bg-slate-700/50 border-purple-400/30 text-white placeholder:text-purple-200"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-900/20 p-2 rounded border border-red-500/30">{error}</p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? "Login" : "Sign Up"}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError("")
                }}
                disabled={isLoading}
                className="text-sm text-purple-200 hover:text-white underline"
              >
                {isLogin ? "Need an account? Sign up" : "Already have an account? Login"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
