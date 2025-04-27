import Image from "next/image"
import img1 from "@/app/images/assignment.png"
export function AboutSection() {
  return (
    <section className="py-24">
      <div className="container px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-6">
            <h2 className="text-4xl font-bold leading-tight">
              Unlock Your Academic Potential with Our Expert Assignment Assistance
            </h2>
            <p className="text-lg text-muted-foreground">
              Experience a significant boost in your grades while saving precious time for other activities. Our service
              not only alleviates academic stress but also connects you with skilled helpers ready to support your
              learning journey.
            </p>
          </div>

          {/* Right Column - Image */}
          <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
            <Image
              src={img1}
              alt="Academic assistance illustration"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  )
}

