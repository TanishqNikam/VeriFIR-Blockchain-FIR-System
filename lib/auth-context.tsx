"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type { User, UserRole } from "./types"

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string, role: UserRole) => Promise<boolean>
  /** Async — awaits the server cookie clear before resolving so callers can safely navigate */
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const SESSION_KEY = "verifir_user"
const storage = typeof window !== "undefined" ? window.sessionStorage : null

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore session on mount.
  // Priority: sessionStorage (fast, tab-scoped) → /api/auth/me (server cookie).
  //
  // The server-side fallback is critical for the "stale cookie" scenario:
  // when the user closes and reopens the tab, sessionStorage is cleared but
  // the HTTP-only cookie still exists. Without this fallback, the middleware
  // would redirect to the dashboard (cookie present) while AuthProvider sees
  // no user (sessionStorage empty), resulting in a blank black page.
  useEffect(() => {
    const restore = async () => {
      try {
        const stored = storage?.getItem(SESSION_KEY)
        if (stored) {
          setUser(JSON.parse(stored))
          return
        }
        // sessionStorage is empty — check if the server cookie is still valid
        const res = await fetch("/api/auth/me")
        if (res.ok) {
          const userData: User = await res.json()
          setUser(userData)
          storage?.setItem(SESSION_KEY, JSON.stringify(userData))
        }
      } catch {
        // ignore — user stays null, middleware will redirect to /login
      } finally {
        setIsLoading(false)
      }
    }
    restore()
  }, [])

  const login = useCallback(async (email: string, password: string, role: UserRole): Promise<boolean> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role }),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || "Login failed")
    }

    const userData: User = await res.json()
    setUser(userData)
    storage?.setItem(SESSION_KEY, JSON.stringify(userData))
    return true
  }, [])

  const logout = useCallback(async () => {
    setUser(null)
    storage?.removeItem(SESSION_KEY)
    // Await the cookie-clearing API call so the cookie is gone BEFORE any navigation.
    // If we fire-and-forget, the middleware still sees the cookie during the redirect
    // and bounces the user back to the dashboard, causing a blank page loop.
    try { await fetch("/api/auth/logout", { method: "POST" }) } catch { /* ignore */ }
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
