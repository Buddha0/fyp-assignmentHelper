"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Star } from "lucide-react"
import { Swiper, SwiperSlide } from "swiper/react"
import { Navigation, Pagination, A11y } from "swiper/modules"

// Import Swiper styles
import "swiper/css"
import "swiper/css/navigation"
import "swiper/css/pagination"


interface Testimonial {
  id: number
  name: string
  institution: string
  quote: string
  rating: number
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Aarav Sharma",
    institution: "Student, University",
    quote: "AssignmentHelper transformed my academic experience for the better!",
    rating: 5,
  },
  {
    id: 2,
    name: "Priya Joshi",
    institution: "Student, College",
    quote: "I couldn't have completed my project without this help!",
    rating: 5,
  },
  {
    id: 3,
    name: "Sarah Chen",
    institution: "Graduate Student",
    quote: "The quality of support exceeded my expectations. Highly recommended!",
    rating: 5,
  },
  {
    id: 4,
    name: "Michael Park",
    institution: "Student, University",
    quote: "Outstanding service that helped me improve my academic performance.",
    rating: 5,
  },

]

export default function Testimonials() {
  return (
    <section className="py-12 px-4 md:px-6 lg:px-8 bg-background">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-8">Student Testimonials</h2>
        <p className="text-muted-foreground mb-12">This service made my assignments stress-free and easy!</p>

        <Swiper
          modules={[Navigation, Pagination, A11y]}
          spaceBetween={24}
          slidesPerView={1}
          navigation
          pagination={{ clickable: true }}
          breakpoints={{
            640: {
              slidesPerView: 2,
            },
            1024: {
              slidesPerView: 3,
            },
          }}
          className="testimonial-swiper"
        >
          {testimonials.map((testimonial) => (
            <SwiperSlide key={testimonial.id}>
              <Card className="h-full">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <blockquote className="text-lg mb-6">&quot;{testimonial.quote}&quot;</blockquote>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground text-xl">{testimonial.name[0]}</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.institution}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  )
}

