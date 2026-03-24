import Link from "next/link"
import { Shield } from "lucide-react"

export function LandingFooter() {
  return (
    <footer id="about" className="border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <span className="text-lg font-semibold text-foreground">VeriFIR</span>
                <span className="ml-1 text-xs text-muted-foreground">India</span>
              </div>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              A blockchain-based system for tamper-proof FIR registration and evidence management,
              ensuring transparency and trust in the Indian legal system.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 lg:col-span-2 lg:grid-cols-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Platform</h3>
              <ul className="mt-4 space-y-3">
                <li>
                  <Link href="/login?action=file" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    File FIR
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Login
                  </Link>
                </li>
                <li>
                  <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Features
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground">Technology</h3>
              <ul className="mt-4 space-y-3">
                <li className="text-sm text-muted-foreground">Ethereum Blockchain</li>
                <li className="text-sm text-muted-foreground">IPFS Storage</li>
                <li className="text-sm text-muted-foreground">Smart Contracts</li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground">Resources</h3>
              <ul className="mt-4 space-y-3">
                <li className="text-sm text-muted-foreground">Documentation</li>
                <li className="text-sm text-muted-foreground">API Reference</li>
                <li className="text-sm text-muted-foreground">Support</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              Academic Project - Final Year BE
            </p>
            <p className="text-sm text-muted-foreground">
              Department of Computer Engineering
            </p>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            This is a prototype for academic evaluation purposes only. Not intended for actual law enforcement use.
          </p>
        </div>
      </div>
    </footer>
  )
}
