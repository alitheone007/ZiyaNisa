import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ITTAR_NOTES } from "@/data/seed";

export default function IttarTeaser() {
  return (
    <section id="ittar" data-testid="ittar-teaser" className="py-20 md:py-28 relative overflow-hidden bg-ivory">
      {/* Decorative side image */}
      <div className="absolute inset-y-0 right-0 w-1/2 hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1458538977777-0549b2370168?w=1200&q=80"
          alt="Ittar bottles"
          loading="lazy"
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ivory via-ivory/50 to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-5 md:px-10 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold">Coming Soon · Premium</div>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl mt-3 leading-tight text-espresso text-balance">
            <span className="italic font-light">ZiyaNisa Ittar</span> —
            <br />Deccan fragrance stories
            <br />for the <span className="gold-text">modern woman</span>.
          </h2>
          <p className="mt-5 text-taupe leading-relaxed max-w-lg">
            A future-ready ittar &amp; perfume oil collection — hand-blended in small batches,
            with notes inspired by Hyderabadi gardens, oud rituals, and saffron veils.
          </p>

          {/* Note pills */}
          <div className="mt-7 flex flex-wrap gap-2">
            {ITTAR_NOTES.map((n) => (
              <motion.div
                key={n.name}
                whileHover={{ y: -3 }}
                className="px-4 py-2 rounded-full bg-pearl border border-gold/30 shadow-soft"
                data-testid={`ittar-note-${n.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="text-sm font-medium text-espresso">{n.name}</div>
                <div className="text-[11px] text-taupe leading-tight">{n.note}</div>
              </motion.div>
            ))}
          </div>

          {/* Waitlist */}
          <div className="mt-8 max-w-md">
            <div className="text-sm text-espresso font-medium">Join the early-access waitlist</div>
            <div className="mt-2 flex gap-2">
              <Input
                data-testid="ittar-email"
                type="email"
                placeholder="your@email.com"
                className="h-11 rounded-full bg-pearl border-gold/30 focus-visible:ring-gold/40 placeholder:text-taupe"
              />
              <Button
                data-testid="ittar-notify"
                className="rounded-full h-11 px-5 bg-espresso text-ivory hover:bg-espresso/90 shadow-goldGlow"
              >
                <Bell className="w-4 h-4 mr-1.5" /> Notify me
              </Button>
            </div>
            <p className="text-[11px] text-taupe mt-2 italic">
              We will only write when our first batch is ready. Promise.
            </p>
          </div>
        </div>

        {/* Bottle illustration */}
        <div className="relative h-[420px] lg:h-[520px] hidden md:block">
          <motion.div
            animate={{ y: [0, -14, 0] }}
            transition={{ repeat: Infinity, duration: 6 }}
            className="absolute top-6 left-6 w-56 h-72 rounded-[2rem] overflow-hidden gold-ring shadow-cardLift"
          >
            <img
              src="https://images.unsplash.com/photo-1543422655-ac1c6ca993ed?w=600&q=80"
              alt="Oud ittar"
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </motion.div>
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ repeat: Infinity, duration: 8, delay: 1 }}
            className="absolute bottom-4 right-2 w-48 h-64 rounded-[2rem] overflow-hidden gold-ring shadow-cardLift"
          >
            <img
              src="https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&q=80"
              alt="Rose perfume"
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
