import { motion } from "framer-motion";
import { Clock, Star, ArrowRight, MapPin, BadgeCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SERVICES } from "@/data/seed";
import { SectionHead } from "./CategoryGrid";

const LEVEL_COLOR = {
  "Trained": "bg-aqua/15 text-espresso border-aqua/40",
  "Senior": "bg-champagne/40 text-espresso border-gold/40",
  "Bridal Expert": "bg-peach/30 text-espresso border-peach/60",
};

export default function ServiceTeaser() {
  const navigate = useNavigate();
  return (
    <section id="services" data-testid="services-teaser" className="py-20 md:py-28 bg-rosemist/40 relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-peach/30 rounded-full blur-3xl pointer-events-none" />
      <div className="max-w-7xl mx-auto px-5 md:px-10 relative">
        <SectionHead
          overline="At-Home Salon"
          title={<>Book <span className="italic font-light">trusted care</span> at home</>}
          subtitle="Verified beauticians, hygienic single-use kits, and Hyderabadi warmth — arrive at your doorstep on your schedule."
          action={
            <div className="flex items-center gap-2 text-xs text-espresso/80">
              <MapPin className="w-3.5 h-3.5 text-gold" />
              Serving Hyderabad · Bengaluru · Mumbai
            </div>
          }
        />

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {SERVICES.map((s, i) => (
            <ServiceCard key={s.id} s={s} delay={(i % 4) * 0.07} onBook={() => navigate(`/book/${s.id}`)} />
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Button
            data-testid="see-all-services"
            variant="outline"
            onClick={() => navigate("/services")}
            className="rounded-full px-7 h-11 border-gold/50 hover:bg-pearl text-espresso bg-pearl/70"
          >
            See all home services <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ s, delay, onBook }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -6 }}
      className="group bg-pearl rounded-2xl border border-gold/10 hover:border-gold/40 hover:shadow-cardLift transition-all overflow-hidden flex flex-col"
      data-testid={`service-${s.id}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={s.img}
          alt={s.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-espresso/55 via-transparent" />
        <span className="absolute top-2.5 left-2.5 text-[10px] uppercase tracking-[0.16em] px-2 py-1 rounded-full bg-pearl/90 text-espresso border border-gold/30">
          {s.tag}
        </span>
        <span className={`absolute top-2.5 right-2.5 text-[10px] font-medium px-2 py-1 rounded-full border ${LEVEL_COLOR[s.level]}`}>
          <BadgeCheck className="w-3 h-3 inline mr-1 -mt-0.5" />
          {s.level}
        </span>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-serif text-lg text-espresso leading-snug">{s.name}</h3>
        <div className="mt-2 flex items-center gap-3 text-xs text-taupe">
          <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {s.duration}</span>
          <span className="inline-flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-gold text-gold" /> {s.rating}</span>
        </div>

        <div className="mt-4 flex items-end justify-between gap-2 mt-auto pt-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-taupe">Starts at</div>
            <div className="text-espresso font-semibold">₹{s.price.toLocaleString("en-IN")}</div>
          </div>
          <Button
            data-testid={`book-${s.id}`}
            onClick={onBook}
            className="rounded-full bg-peach text-espresso hover:bg-peach/80 h-9 px-4 text-xs font-medium shadow-soft"
          >
            Book at Home
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
