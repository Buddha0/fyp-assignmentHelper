import { CuboidIcon as Cube } from "lucide-react"


export function FeaturesSection() {
    return (
        <section className="py-24">
            <div className="container px-4">
                <div className="grid md:grid-cols-2 gap-16">

                <div className="grid sm:grid-cols-2 gap-8">
                    {/* left Column - Features Grid */}
                        {/* Feature 1 */}
                        <div className="space-y-4">
                            <Cube className="h-8 w-8" />
                            <h3 className="text-xl font-semibold">Why Choose Our Qualified Helpers?</h3>
                            <p className="text-muted-foreground">Our experts are vetted and experienced in various subjects.</p>
                        </div>

                        {/* Feature 2 */}
                        <div className="space-y-4">
                            <Cube className="h-8 w-8" />
                            <h3 className="text-xl font-semibold">Experience Secure Transactions Every Time</h3>
                            <p className="text-muted-foreground">We prioritize your safety with secure payment methods.</p>
                        </div>

                        {/* Feature 3 */}
                        <div className="space-y-4">
                            <Cube className="h-8 w-8" />
                            <h3 className="text-xl font-semibold">Guaranteed Timely Delivery of Your Assignments</h3>
                            <p className="text-muted-foreground">We ensure that your assignments are completed on time.</p>
                        </div>

                        {/* Feature 4 */}
                        <div className="space-y-4">
                            <Cube className="h-8 w-8" />
                            <h3 className="text-xl font-semibold">Join Us Today and Get Started!</h3>
                            <p className="text-muted-foreground">Take the first step towards academic success now.</p>
                        </div>
                    </div>

                    {/* right column*/}
                    <div className="space-y-8">
                        <div className="space-y-6">
                            <h2 className="text-2xl font-semibold">Empower</h2>
                            <h3 className="text-4xl font-bold leading-tight">Unlock Your Academic Potential with Us</h3>
                            <p className="text-lg text-muted-foreground">
                                At AssignmentHelper, we connect you with qualified experts ready to tackle your assignments. Experience
                                a seamless way to enhance your learning journey.
                            </p>
                        </div>
                        {/* <div className="flex gap-4">
                            <Button variant="outline">Learn More</Button>
                            <Button>
                                Sign Up
                                <span className="ml-2">→</span>
                            </Button>
                        </div> */}
                    </div>

                    
                   
                </div>
            </div>
        </section>
    )
}

