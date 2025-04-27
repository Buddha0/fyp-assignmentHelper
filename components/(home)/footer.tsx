import { Facebook, Instagram, Twitter, Linkedin, Youtube } from "lucide-react"
import Link from "next/link"

const footerLinks = {
    helpCenter: [
        { title: "Help Center", href: "#" },
        { title: "About Us", href: "#" },
        { title: "Contact Us", href: "#" },
        { title: "Blog Posts", href: "#" },
        { title: "Careers Page", href: "#" },
    ],
    resources: [
        { title: "FAQs", href: "#" },
        { title: "User Guide", href: "#" },
        { title: "Feedback Form", href: "#" },
        { title: "Support Team", href: "#" },
        { title: "Community Forum", href: "#" },
    ],
}

const socialLinks = [
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: Youtube, href: "#", label: "YouTube" },
]

export default function Footer() {
    return (
        <footer className="border-t mt-10">
            <div className="w-full">
                <div className="py-12 grid grid-cols-2 gap-8">
                    {/* Company Info */}
                    <div className="space-y-6">

                        <div className="space-y-4">
                            <div>
                                <div className="text-sm font-medium">Address:</div>
                                <address className="text-sm text-muted-foreground not-italic">
                                   Kathmandu, Nepal
                                </address>
                            </div>
                            <div>
                                <div className="text-sm font-medium">Contact:</div>
                                <div className="space-y-1">
                                    <a href="tel:1800123456" className="text-sm text-muted-foreground block hover:text-foreground">
                                       980000123
                                    </a>
                                    <a href="mailto:info@situne.io" className="text-sm text-muted-foreground block hover:text-foreground">
                                        info@assignmentheloer.com
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            {socialLinks.map((social) => (
                                <Link
                                    key={social.label}
                                    href={social.href}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                    aria-label={social.label}
                                >
                                    <social.icon className="h-5 w-5" />
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2">
                        {/* Help Center Links */}
                        <div className="w-full">
                            <ul className="space-y-3">
                                {footerLinks.helpCenter.map((link) => (
                                    <li key={link.title}>
                                        <Link
                                            href={link.href}
                                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {link.title}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Resource Links */}
                        <div className="w-full">
                            <ul className="space-y-3">
                                {footerLinks.resources.map((link) => (
                                    <li key={link.title}>
                                        <Link
                                            href={link.href}
                                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {link.title}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>


                </div>

                {/* Bottom Bar */}
                <div className="py-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-muted-foreground">© 2024 AssignmentHelper. All rights reserved.</div>
                    <div className="flex gap-6">
                        <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            Privacy Policy
                        </Link>
                        <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            Terms of Service
                        </Link>
                        <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            Cookies Settings
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}

