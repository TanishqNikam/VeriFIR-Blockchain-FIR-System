"use client"

import { useLanguage } from "@/lib/i18n/language-context"
import { LANGUAGE_NAMES, LANGUAGE_FULL, type Language } from "@/lib/i18n/translations"
import { cn } from "@/lib/utils"

const LANGUAGES: Language[] = ["en", "hi", "mr"]

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="flex items-center rounded-md border border-border bg-background overflow-hidden">
      {LANGUAGES.map((lang) => (
        <button
          key={lang}
          onClick={() => setLanguage(lang)}
          title={LANGUAGE_FULL[lang]}
          className={cn(
            "px-2.5 py-1 text-xs font-medium transition-colors",
            language === lang
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
        >
          {LANGUAGE_NAMES[lang]}
        </button>
      ))}
    </div>
  )
}
