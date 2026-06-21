import { motion } from "framer-motion";
import { Sparkles, Droplet, Flower2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function KoreanGlow() {
  return (
    <section data-testid="korean-glow" className="py-20 md:py-28 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 md:px-10 grid lg:grid-cols-2 gap-12 items-center">
        {/* Image stack */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative aspect-[5/6] rounded-[2rem] overflow-hidden order-2 lg:order-1"
        >
          <img
            src="https://images.unsplash.com/photo-1555820585-c5ae44394b79?w=900&q=80"
            alt="Korean Glow ritual"
            loading="lazy"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-espresso/30 via-transparent to-transparent" />

          {/* Floating ingredient capsule */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 6 }}
            className="absolute top-6 left-6 glass-card rounded-2xl px-4 py-3 text-xs"
          >
            <div className="flex items-center gap-2 text-aqua">
              <Droplet className="w-3.5 h-3.5" /> <span className="uppercase tracking-widest text-[10px]">Active</span>
            </div>
            <div className="text-espresso font-medium mt-0.5">Hyaluronic + Ceramide</div>
          </motion.div>

          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 7, delay: 1 }}
            className="absolute bottom-6 right-6 glass-card rounded-2xl px-4 py-3 text-xs"
          >
            <div className="flex items-center gap-2 text-gold">
              <Sparkles className="w-3.5 h-3.5" /> <span className="uppercase tracking-widest text-[10px]">K-Glow</span>
            </div>
            <div className="text-espresso font-medium mt-0.5">10-step calm routine</div>
          </motion.div>
        </motion.div>

        {/* Copy */}
        <div className="order-1 lg:order-2">
          <div className="text-xs uppercase tracking-[0.25em] text-gold flex items-center gap-2">
            <Flower2 className="w-3.5 h-3.5" /> Korean-Inspired Skincare
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-espresso mt-3 leading-tight">
            The <span className="italic font-light">K-Glow</span> ritual,
            <br />reimagined for <span className="gold-text">Indian skin</span>.
          </h2>
          <p className="mt-5 text-taupe leading-relaxed max-w-lg">
            Calm, layered, science-led. Our K-Glow shelf brings Seoul-favourite actives —
            niacinamide, snail mucin, rice water, centella — formulated for humidity,
            sun-exposure and the warmth of the Deccan.
          </p>

          <ul className="mt-7 grid sm:grid-cols-2 gap-3">
            {[
              "Barrier-first hydration",
              "Glass-skin finish",
              "Non-comedogenic actives",
              "Fragrance-free options",
            ].map((b) => (
              <li key={b} className="flex items-center gap-2 text-sm text-espresso">
                <span className="w-1.5 h-1.5 rounded-full bg-gold" /> {b}
              </li>
            ))}
          </ul>

          <Button
            data-testid="kglow-cta"
            className="mt-8 rounded-full px-7 h-11 bg-espresso text-ivory hover:bg-espresso/90 shadow-goldGlow"
          >
            Explore K-Glow shelf
          </Button>
        </div>
      </div>
    </section>
  );
}
