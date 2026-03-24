import { FileEdit, Upload, Link as LinkIcon, CheckCircle } from "lucide-react"

const steps = [
  {
    step: 1,
    icon: FileEdit,
    title: "File FIR Online",
    description:
      "Citizen fills out the FIR form with incident details including date, location, and description of the incident.",
  },
  {
    step: 2,
    icon: Upload,
    title: "Upload Evidence",
    description:
      "Supporting evidence files (images, videos, documents) are uploaded and stored on IPFS with unique content identifiers.",
  },
  {
    step: 3,
    icon: LinkIcon,
    title: "Blockchain Recording",
    description:
      "FIR data hash and evidence CIDs are recorded on the blockchain, creating an immutable and timestamped record.",
  },
  {
    step: 4,
    icon: CheckCircle,
    title: "Police Verification",
    description:
      "Police officer reviews and verifies the FIR, adding their digital endorsement to the blockchain record.",
  },
]

export function LandingHow() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            A simple four-step process to file and verify FIRs on the blockchain
          </p>
        </div>

        <div className="mt-16 relative">
          {/* Connection line for desktop */}
          <div className="hidden lg:block absolute top-24 left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] h-0.5 bg-border" />
          
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((item) => (
              <div key={item.step} className="relative flex flex-col items-center text-center">
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
                  {item.step}
                </div>
                <div className="mt-4 flex h-16 w-16 items-center justify-center rounded-xl bg-secondary">
                  <item.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
