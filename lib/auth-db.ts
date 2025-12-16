// This file is deprecated and auth functionality is now in db.ts

import { guarantorDB, type User } from "./db"

export interface SessionData {
  userId: number
  username: string
  role: "user" | "admin"
  loginTime: number
}

// Re-export user functionality from main database
export const authDB = {
  openDB: () => guarantorDB.openDB(),
  addUser: (user: Omit<User, "id">) => guarantorDB.addUser(user),
  updateUser: (id: number, user: Partial<User>) => guarantorDB.updateUser(id, user),
  deleteUser: (id: number) => guarantorDB.deleteUser(id),
  getUserByUsername: (username: string) => guarantorDB.getUserByUsername(username),
  getAllUsers: () => guarantorDB.getAllUsers(),
}

// Session management
const SESSION_KEY = "user_session"
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000 // 24 hours

export function saveSession(session: SessionData): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  console.log("[v0] Session saved for user:", session.username)
}

export function getSession(): SessionData | null {
  const session = localStorage.getItem(SESSION_KEY)
  if (!session) return null

  try {
    const parsed = JSON.parse(session)
    const now = Date.now()

    // Check if session has expired
    if (now - parsed.loginTime > SESSION_TIMEOUT) {
      console.log("[v0] Session expired")
      clearSession()
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
  console.log("[v0] Session cleared")
}

export function isSessionValid(): boolean {
  return getSession() !== null
}
