"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"

interface FAQItem {
  question: string
  answer: string
}

const faqs: FAQItem[] = [
  {
    question: "How does it work?",
    answer:
      "AssignmentHelper connects students with helpers who can complete academic tasks. Users post assignments, and helpers bid to complete them. Once an assignment is accepted, the transaction is processed securely.",
  },
  {
    question: "Is it safe to use?",
    answer:
      "Yes, our platform prioritizes user safety and privacy. We implement secure payment methods and protect your personal information. You can focus on your studies with peace of mind.",
  },
  {
    question: "How to post tasks?",
    answer:
      "To post a task, simply create an account and navigate to the assignment submission page. Fill in the details of your assignment and submit it for helpers to see. You'll receive bids from qualified helpers shortly after.",
  },
  {
    question: "What payment methods available?",
    answer:
      "We offer various payment options, including credit cards and mobile wallets. This ensures a convenient and secure transaction process. Choose the method that works best for you.",
  },
  {
    question: "Can I change my order?",
    answer:
      "Yes, you can modify your order before it is accepted by a helper. Simply go to your pending assignments and make the necessary changes. If you need further assistance, feel free to contact our support team.",
  },
]

export default function FAQ() {
  return (
    <section className="py-12 px-4 md:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-8 mb-12">
          <div>
            <h2 className="text-3xl font-bold mb-4">FAQs</h2>
            <p className="text-muted-foreground max-w-md">
              Find answers to your questions and learn how to use our platform effectively.
            </p>
          </div>
          <Button variant="outline" size="sm" className="w-fit rounded-none hover:bg-transparent">
            Contact
          </Button>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border-b-0 [&_button]:border-b">
              <AccordionTrigger className="text-base font-normal hover:no-underline hover:text-foreground [&_svg]:w-4 [&_svg]:h-4">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}

