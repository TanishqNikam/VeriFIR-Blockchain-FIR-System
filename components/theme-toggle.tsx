"use client"

import { Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark"

    // Use View Transitions API for smooth crossfade (Chrome 111+, Edge 111+)
    if (!document.startViewTransition) {
      setTheme(next)
      return
    }

    document.startViewTransition(() => {
      setTheme(next)
    })
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
