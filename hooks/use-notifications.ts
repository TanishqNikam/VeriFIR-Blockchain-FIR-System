"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export interface AppNotification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  firId: string
  read: boolean
  createdAt: string
}

export function useNotifications(userId: string | undefined, role?: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const sseRef = useRef<EventSource | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchNotifications = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`)
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unreadCount ?? 0)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return

    // Initial fetch
    fetchNotifications()

    // ── Try SSE first ────────────────────────────────────────────────────────
    let sseWorking = false

    if (typeof EventSource !== "undefined") {
      const params = new URLSearchParams({ userId, role: role || "citizen" })
      const es = new EventSource(`/api/sse?${params.toString()}`)
      sseRef.current = es

      es.onopen = () => {
        sseWorking = true
        // Clear any fallback poll once SSE is confirmed working
        if (pollRef.current) {
          clearInterval(pollRef.current)
          pollRef.current = null
        }
      }

      es.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)

          // Refetch notifications whenever a relevant event arrives
          if (msg.type === "fir-update" || msg.type === "new-fir") {
            fetchNotifications()
          }
        } catch {
          // Ignore malformed messages
        }
      }

      es.onerror = () => {
        es.close()
        sseRef.current = null
        // Fall back to polling if SSE failed to connect or dropped
        if (!sseWorking && !pollRef.current) {
          pollRef.current = setInterval(fetchNotifications, 30_000)
        }
      }
    } else {
      // Browser does not support EventSource — use polling
      pollRef.current = setInterval(fetchNotifications, 30_000)
    }

    return () => {
      sseRef.current?.close()
      sseRef.current = null
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [userId, role, fetchNotifications])

  const markAsRead = async (id: string) => {
    if (!userId) return
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
    setUnreadCount((c) => Math.max(0, c - 1))
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, userId }),
    })
  }

  const markAllAsRead = async () => {
    if (!userId) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, markAll: true }),
    })
  }

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, refetch: fetchNotifications }
}
