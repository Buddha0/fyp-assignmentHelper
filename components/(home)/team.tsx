import { Button } from "@/components/ui/button"
import { Linkedin, Twitter, Globe } from "lucide-react"
import Link from "next/link"

interface TeamMember {
    name: string
    role: string
    description: string
    socials: {
        linkedin?: string
        twitter?: string
        website?: string
    }
}

const teamMembers: TeamMember[] = [
    {
        name: "Aisha Sharma",
        role: "Project Manager",
        description: "Ravi drives our marketing strategies to reach more students effectively.",
        socials: {
            linkedin: "#",
            twitter: "#",
            website: "#",
        },
    },
    {
        name: "Ravi Thapa",
        role: "Marketing Lead",
        description: "Neha crafts engaging content that resonates with students' needs.",
        socials: {
            linkedin: "#",
            twitter: "#",
            website: "#",
        },
    },
    {
        name: "Nisha Gurung",
        role: "Content Writer",
        description: "Samir ensures our platform runs smoothly and securely for all users.",
        socials: {
            linkedin: "#",
            twitter: "#",
            website: "#",
        },
    },
]

export default function Team() {
    return (
        <section className="py-12 px-4 md:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto grid grid-cols-2">
                <div>

                <span className="text-sm">Meet</span>
                <h2 className="text-3xl font-bold mb-4">Our Team</h2>
                <p className="text-muted-foreground mb-6 max-w-lg">
                    Aisha ensures smooth operations and connects students with the right helpers.
                </p>
                <Button variant="outline" size="sm" className="mb-16 rounded-none hover:bg-transparent">
                    Open positions
                </Button>
                </div>

                <div className="space-y-16">
                    {teamMembers.map((member) => (
                        <div key={member.name} className="flex items-start gap-8">
                            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <span className="text-muted-foreground text-xl">{member.name[0]}</span>
                            </div>
                            <div>
                                <h3 className="font-medium text-lg">{member.name}</h3>
                                <p className="text-sm text-muted-foreground mb-2">{member.role}</p>
                                <p className="text-sm mb-4 max-w-lg">{member.description}</p>
                                <div className="flex gap-4">
                                    {member.socials.linkedin && (
                                        <Link
                                            href={member.socials.linkedin}
                                            className="text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <Linkedin className="h-5 w-5" />
                                            <span className="sr-only">LinkedIn</span>
                                        </Link>
                                    )}
                                    {member.socials.twitter && (
                                        <Link
                                            href={member.socials.twitter}
                                            className="text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <Twitter className="h-5 w-5" />
                                            <span className="sr-only">Twitter</span>
                                        </Link>
                                    )}
                                    {member.socials.website && (
                                        <Link
                                            href={member.socials.website}
                                            className="text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <Globe className="h-5 w-5" />
                                            <span className="sr-only">Website</span>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

