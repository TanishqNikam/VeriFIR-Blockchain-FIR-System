"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Dashboard-level error boundary.
 * Catches crashes inside any dashboard page (citizen, police, admin)
 * while keeping the surrounding layout (sidebar, header) intact.
 * The user sees a helpful message instead of a blank screen.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[VeriFIR] Dashboard error:", error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="max-w-md w-full border-red-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <CardTitle className="text-red-700 text-lg">
              Failed to load this section
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-500 text-sm leading-relaxed">
            This part of the dashboard could not be loaded. This may be a
            temporary issue with the network or data connection. Your filed
            FIRs and data are not affected.
          </p>
          {error.digest && (
            <p className="text-xs text-slate-400 font-mono bg-slate-50 px-3 py-2 rounded">
              Ref: {error.digest}
            </p>
          )}
          <Button onClick={reset} className="w-full gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
