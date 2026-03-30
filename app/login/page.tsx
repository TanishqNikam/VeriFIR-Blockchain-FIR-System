"use client"

import { type FormEvent, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Shield, User, BadgeCheck, Settings, Loader2, Eye, EyeOff } from "lucide-react"
import type { UserRole } from "@/lib/types"
import { useAuth } from "@/lib/auth-context"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { useLanguage } from "@/lib/i18n/language-context"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const { toast } = useToast()
  const { t } = useLanguage()

  const roles = [
    { id: "citizen" as UserRole, label: t("auth.citizen"), description: "File FIRs and track status", icon: User },
    { id: "police" as UserRole, label: t("auth.policeOfficer"), description: "Verify and process FIRs", icon: BadgeCheck },
    { id: "admin" as UserRole, label: t("auth.adminAuditor"), description: "System oversight and reports", icon: Settings },
  ]

  const [selectedRole, setSelectedRole] = useState<UserRole>("citizen")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast({
        title: "Validation Error",
        description: "Please enter both email and password.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const success = await login(email, password, selectedRole)

      if (success) {
        toast({
          title: "Login Successful",
          description: `Welcome! Redirecting to ${selectedRole} dashboard...`,
        })

        const action = searchParams.get("action")
        if (action === "file" && selectedRole === "citizen") {
          router.push("/dashboard/citizen/file-fir")
        } else {
          router.push(`/dashboard/${selectedRole}`)
        }
      }
    } catch (err) {
      toast({
        title: "Login Failed",
        description: err instanceof Error ? err.message : "Invalid credentials. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid h-16 grid-cols-3 items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <span className="text-lg font-semibold text-foreground">VeriFIR</span>
                <span className="ml-1 text-xs text-muted-foreground">India</span>
              </div>
            </Link>
            <div />
            <div className="flex items-center justify-end gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t("auth.welcomeBack")}</CardTitle>
            <CardDescription>{t("auth.signInDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Role Selection */}
              <div className="space-y-3">
                <Label>{t("auth.selectRole")}</Label>
                <div className="grid grid-cols-1 gap-3">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRole(role.id)}
                      className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                        selectedRole === role.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-secondary/50"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          selectedRole === role.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        <role.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{role.label}</p>
                        <p className="text-xs text-muted-foreground">{role.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("auth.email")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  <a href="/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("auth.password")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("auth.signingIn")}
                  </>
                ) : (
                  t("auth.signIn")
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {t("auth.noAccount")}{" "}
                <Link href="/register" className="text-primary hover:underline">{t("auth.createOne")}</Link>
              </p>


            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
