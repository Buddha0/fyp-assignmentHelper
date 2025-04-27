import Image from "next/image";
import { Button } from "@/components/ui/button";
import heroImg from "@/app/images/big.png";

export function HeroSection() {
  return (
    <section className="relative text-white min-h-[85vh] ">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src={heroImg}
          alt="Hero background"
          layout="fill"
          objectFit="cover"
          priority
        />
      </div>

      {/* Content */}
      <div className="relative z-10 bg-black/60 py-20 text-center min-h-[85vh] flex justify-center items-center">
        <div className="container px-4 space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold max-w-2xl mx-auto ">
            Unlock Your Academic Potential with AssignmentHelper
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto pointer-events-none">
            AssignmentHelper connects you with skilled helpers ready to tackle your academic challenges. Experience
            stress-free learning and achieve your goals with ease.
          </p>
          <div className="flex justify-center gap-4 pt-4 select-none">
            <Button size="lg" variant="secondary">
              Get Started
            </Button>
            <Button size="lg" variant="secondary">
              Learn More
            </Button>
          </div>
        </div>
      </div>

      {/* Aspect Ratio for Responsiveness */}
      <div className="absolute inset-0 aspect-video md:aspect-auto" />
    </section>
  );
}