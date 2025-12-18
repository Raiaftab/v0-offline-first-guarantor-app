import { createClient } from "@/lib/supabase/client"

export interface SupabaseUser {
  id: string
  email: string
  username: string
  role: "user" | "admin"
}

export async function signUp(email: string, password: string, username: string, isAdmin = false) {
  const supabase = createClient()

  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}`,
        data: {
          username,
          role: isAdmin ? "admin" : "user",
        },
      },
    })

    if (authError) throw authError

    if (authData.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        username,
        role: isAdmin ? "admin" : "user",
      })

      if (profileError) throw profileError
    }

    return { data: authData, error: null }
  } catch (error: any) {
    return { data: null, error: error.message || "Sign up failed" }
  }
}

export async function signIn(email: string, password: string) {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message || "Sign in failed" }
  }
}

export async function signOut() {
  const supabase = createClient()
  return await supabase.auth.signOut()
}

export async function getCurrentUser() {
  const supabase = createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (!user || error) return null

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  return {
    id: user.id,
    email: user.email,
    username: profile?.username || "",
    role: profile?.role || "user",
  }
}

export async function getUserByUsername(username: string) {
  const supabase = createClient()

  const { data, error } = await supabase.from("profiles").select("*").eq("username", username).single()

  if (error) return null
  return data
}

export async function getAllUsers() {
  const supabase = createClient()

  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function updateUserRole(userId: string, role: "user" | "admin") {
  const supabase = createClient()

  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId)

  if (error) throw error
}

export async function deleteUserProfile(userId: string) {
  const supabase = createClient()

  const { error } = await supabase.from("profiles").delete().eq("id", userId)

  if (error) throw error
}
