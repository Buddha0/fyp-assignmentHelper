import { CircleDot, FileText } from "lucide-react"

export function BenefitsSection() {
    return (
        <>
            <section className="py-20">
                <div className="container px-4">
                    <div className="grid md:grid-cols-2 gap-12">
                        <div className="space-y-6">
                            <h2 className="text-2xl font-semibold">Simplify</h2>
                            <h2 className="text-3xl font-bold mb-6">Effortless Academic Help at Your Fingertips</h2>
                        </div>
                        <div className="grid gap-8">
                            <p className="text-muted-foreground">
                                AssignmentHelper connects students with skilled helpers for academic tasks. Posting assignments is quick and easy, making support accessible.
                            </p>
                            <div className="flex gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-2">Post Tasks</h3>
                                    <p className="text-muted-foreground">
                                        Share your assignment details and we&apos;ll find the perfect helper.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                                    <CircleDot className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-2">Find Helpers</h3>
                                    <p className="text-muted-foreground">
                                        Browse qualified tutors and choose the right fit for your needs.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}

