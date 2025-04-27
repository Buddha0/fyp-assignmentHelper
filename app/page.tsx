"use server"

import { AboutSection } from "@/components/(home)/about-section";
import { BenefitsSection } from "@/components/(home)/benefits-section";
import FAQ from "@/components/(home)/faq";
import { FeaturesSection } from "@/components/(home)/features-section";
import Footer from "@/components/(home)/footer";
import { HeroSection } from "@/components/(home)/hero-section";
import { SiteHeader } from "@/components/(home)/site-header";
import Team from "@/components/(home)/team";
import Testimonials from "@/components/(home)/testimonial";

export default async function Page() {
    return (
        <>
            <div className="min-h-screen  px-[1rem] md:px-[3rem] bg-white">
                <SiteHeader />
                <main>
                    <HeroSection />
                    <BenefitsSection />
                    <FeaturesSection />
                    <AboutSection />
                    <Testimonials />
                    <Team/>
                    <FAQ/>
                </main>
                <Footer/>
            </div>
        </>
    )
}