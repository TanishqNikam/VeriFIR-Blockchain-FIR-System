import { LandingHero } from "@/components/landing/hero"
import { LandingFeatures } from "@/components/landing/features"
import { LandingHow } from "@/components/landing/how-it-works"
import { LandingFooter } from "@/components/landing/footer"
import { LandingHeader } from "@/components/landing/header"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <LandingHeader />
      <main className="flex-1">
        <LandingHero />
        <LandingFeatures />
        <LandingHow />
      </main>
      <LandingFooter />
    </div>
  )
}
