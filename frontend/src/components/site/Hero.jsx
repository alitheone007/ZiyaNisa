import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HERO_FLOATERS } from "@/data/seed";

const positions = [
  { className: "top-6 left-2 md:top-10 md:left-8", delay: 0, rotate: -6 },
  { className: "top-20 right-2 md:top-12 md:right-16", delay: 0.15, rotate: 5 },
  { className: "bottom-32 left-2 md:bottom-24 md:left-24", delay: 0.3, rotate: 8 },
  { className: "bottom-8 right-2 md:bottom-16 md:right-32", delay: 0.45, rotate: -4 },
  { className: "top-1/2 left-1/2 -translate-x-1/2 hidden md:block", delay: 0.6, rotate: 0 },
  { className: "bottom-40 right-1/3 hidden lg:block", delay: 0.75, rotate: -8 },
];

export default function Hero() {
  const navigate = useNavigate();
  return (
    <section
      data-testid="hero"
      className="relative pt-28 md:pt-32 pb-24 md:pb-32 overflow-hidden noise-overlay"
    >
      {/* Background halos */}
      <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-champagne/40 blur-3xl animate-haloPulse pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[32rem] h-[32rem] rounded-full bg-peach/30 blur-3xl animate-haloPulse pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-aqua/15 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-5 md:px-10 grid lg:grid-cols-12 gap-10 items-center">
        {/* Copy */}
        <div className="lg:col-span-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card text-xs uppercase tracking-[0.25em] text-espresso"
          >
            <Sparkles className="w-3.5 h-3.5 text-gold" />
            <span>K-Glow Science · Deccan Soul</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight mt-6 text-espresso text-balance"
          >
            K-Glow Beauty,
            <br />
            <span className="italic font-light">Deccan Grace,</span>
            <br />
            <span className="gold-text">Delivered to You.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-6 text-base md:text-lg text-taupe max-w-xl leading-relaxed"
          >
            Shop clean, result-oriented skincare and book trusted beauty experts at home —
            with fragrance, jewellery, and women's lifestyle collections coming together in
            one elegant marketplace.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Button
              data-testid="hero-shop-cta"
              size="lg"
              onClick={() => navigate("/shop")}
              className="rounded-full px-8 h-12 bg-espresso text-ivory hover:bg-espresso/90 shadow-goldGlow hover:shadow-goldGlowHover font-medium tracking-wide"
            >
              Shop Beauty <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
            <Button
              data-testid="hero-book-cta"
              size="lg"
              variant="outline"
              onClick={() => navigate("/services")}
              className="rounded-full px-8 h-12 border-gold/50 text-espresso hover:bg-rosemist hover:text-espresso bg-pearl/60 backdrop-blur"
            >
              <Play className="w-4 h-4 mr-1.5 fill-gold text-gold" />
              Book Home Salon
            </Button>
          </motion.div>

          {/* Mini ribbon stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.7 }}
            className="mt-10 flex items-center gap-6 text-xs text-taupe"
          >
            <Stat label="Verified Brands" value="120+" />
            <span className="w-px h-8 bg-gold/30" />
            <Stat label="Home Services" value="40+" />
            <span className="w-px h-8 bg-gold/30" />
            <Stat label="Deccan Cities" value="12" />
          </motion.div>
        </div>

        {/* Floating product stage */}
        <div className="lg:col-span-6 relative h-[440px] sm:h-[520px] lg:h-[600px]">
          {HERO_FLOATERS.map((f, i) => (
            <FloatCard key={f.label} item={f} pos={positions[i]} />
          ))}
          {/* Central gold halo behind stage */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-72 h-72 md:w-96 md:h-96 rounded-full border border-gold/30 animate-haloPulse" />
            <div className="absolute w-56 h-56 md:w-72 md:h-72 rounded-full border border-gold/20" />
          </div>
        </div>
      </div>

      {/* Bottom shimmer ribbon */}
      <div className="relative mt-8 h-px overflow-hidden">
        <div className="absolute inset-0 shimmer-ribbon" />
      </div>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="font-serif text-2xl text-espresso leading-none">{value}</div>
      <div className="mt-1 uppercase tracking-[0.18em]">{label}</div>
    </div>
  );
}

function FloatCard({ item, pos }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: pos.delay, duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
      style={{ transform: `rotate(${pos.rotate}deg)` }}
      className={`absolute ${pos.className} w-36 sm:w-44 md:w-52 bg-pearl rounded-2xl p-2.5 shadow-cardLift gold-ring animate-float`}
      data-testid={`hero-float-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-rosemist">
        <img
          src={item.img}
          alt={item.label}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-pearl/85 backdrop-blur text-espresso border border-gold/30 uppercase tracking-widest">
          {item.tag}
        </span>
      </div>
      <div className="px-1 pt-2 pb-1">
        <div className="text-[10px] uppercase tracking-[0.18em] text-taupe">{item.brand}</div>
        <div className="text-xs sm:text-sm font-medium text-espresso truncate">{item.label}</div>
      </div>
    </motion.div>
  );
}
