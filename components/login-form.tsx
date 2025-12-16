"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { authDB, saveSession, type SessionData } from "@/lib/auth-db"
import { Lock, User } from "lucide-react"

interface LoginFormProps {
  onLoginSuccess: (session: SessionData) => void
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!username.trim() || !password.trim()) {
      setError("Username and password are required")
      return
    }

    setIsLoading(true)

    try {
      const user = await authDB.getUserByUsername(username)

      if (!user) {
        setError("Invalid username or password")
        setIsLoading(false)
        return
      }

      // In production, compare hashed passwords
      if (user.password !== password) {
        setError("Invalid username or password")
        setIsLoading(false)
        return
      }

      // Create session
      const session: SessionData = {
        userId: user.id || 0,
        username: user.username,
        role: user.role,
        loginTime: Date.now(),
      }

      saveSession(session)

      toast({
        title: "Login Successful",
        description: `Welcome, ${username}!`,
      })

      onLoginSuccess(session)
    } catch (error) {
      console.log("[v0] Login error:", error)
      setError("An error occurred during login")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <Card className="w-full max-w-md border-purple-500/20 bg-slate-800/50 backdrop-blur-xl">
        <CardHeader className="space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg">
              <Lock className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center text-white animate-text-glow">
            Guarantor System
          </CardTitle>
          <CardDescription className="text-center text-purple-200">Enter your credentials to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white flex items-center gap-2">
                <User className="w-4 h-4" />
                Username
              </label>
              <Input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                className="mt-1 bg-slate-700/50 border-purple-400/30 text-white placeholder:text-purple-200 focus:border-cyan-400 focus:ring-cyan-400/20"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </label>
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                onKeyPress={(e) => e.key === "Enter" && handleLogin(e as any)}
                className="mt-1 bg-slate-700/50 border-purple-400/30 text-white placeholder:text-purple-200 focus:border-cyan-400 focus:ring-cyan-400/20"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 animate-pulse bg-red-900/20 p-2 rounded border border-red-500/30">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105 disabled:opacity-50"
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
