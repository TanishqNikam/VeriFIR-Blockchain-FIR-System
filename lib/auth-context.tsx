"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type { User, UserRole } from "./types"

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string, role: UserRole) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const SESSION_KEY = "verifir_user"
const storage = typeof window !== "undefined" ? window.sessionStorage : null

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore session from sessionStorage on mount (tab-scoped, so two tabs can have different users)
  useEffect(() => {
    try {
      const stored = storage?.getItem(SESSION_KEY)
      if (stored) setUser(JSON.parse(stored))
    } catch {
      // ignore parse errors
    } finally {
      setIsLoading(false)
    }
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

  const logout = useCallback(() => {
    setUser(null)
    storage?.removeItem(SESSION_KEY)
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
