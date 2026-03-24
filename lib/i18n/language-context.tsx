"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { translations, Language } from "./translations"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
})

function getNestedValue(obj: Record<string, unknown>, key: string): string | undefined {
  return key.split(".").reduce<unknown>((cur, part) => {
    if (cur && typeof cur === "object") return (cur as Record<string, unknown>)[part]
    return undefined
  }, obj) as string | undefined
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en")

  useEffect(() => {
    const stored = localStorage.getItem("verifir_language") as Language
    if (stored && ["en", "hi", "mr"].includes(stored)) {
      setLanguageState(stored)
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem("verifir_language", lang)
  }

  const t = (key: string): string => {
    return (
      getNestedValue(translations[language] as Record<string, unknown>, key) ??
      getNestedValue(translations.en as Record<string, unknown>, key) ??
      key
    )
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
