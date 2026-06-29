import Link from "next/link"
import { FileSearch, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Custom 404 page — shown whenever a user visits a URL that does not exist.
 * Without this file, Next.js shows its own plain default 404 page.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-blue-100 p-4">
            <FileSearch className="h-10 w-10 text-blue-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-5xl font-bold text-slate-800">404</h1>
          <h2 className="text-xl font-semibold text-slate-700">Page Not Found</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            The page you are looking for does not exist or may have been moved.
            Please check the URL or return to the home page.
          </p>
        </div>

        <Button asChild>
          <Link href="/" className="gap-2 inline-flex items-center">
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>
    </div>
  )
}
