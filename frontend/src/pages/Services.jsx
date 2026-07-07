import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Star, Clock, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/site/Header";
import Seo from "@/components/site/Seo";
import Footer from "@/components/site/Footer";
import MobileBottomNav from "@/components/site/MobileBottomNav";
import api from "@/lib/api";
import { SERVICES } from "@/data/seed";

const TAG_COLORS = {
  "K-Glow":      "bg-aqua/20 text-espresso",
  "Best Seller": "bg-gold/20 text-espresso",
  "Bridal":      "bg-rosemist text-espresso",
  "Relax":       "bg-champagne/40 text-espresso",
  "Repair":      "bg-peach/30 text-espresso",
  "Soothing":    "bg-aqua/15 text-espresso",
  "Quick":       "bg-pearl text-espresso border border-gold/30",
  "Occasion":    "bg-gold/25 text-espresso",
};

export default function Services() {
  const navigate = useNavigate();

  const { data: services = SERVICES, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => api.get("/services").then(r => r.data),
    placeholderData: SERVICES,
  });

  return (
    <div className="min-h-screen bg-ivory text-espresso">
      <Seo title="At-Home Salon & Beauty Services" description="Book trusted beauticians at home in Hyderabad — facials, waxing, mehendi and more." path="/services" />
      <Header />
      <main className="pt-24 md:pt-28 pb-24">
        <div className="max-w-7xl mx-auto px-5 md:px-10">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-taupe mb-6">
            <Link to="/" className="hover:text-espresso transition">Home</Link>
            <span>/</span>
            <span className="text-espresso">Home Salon</span>
          </div>

          {/* Hero banner */}
          <div className="rounded-3xl overflow-hidden relative mb-10 bg-gradient-to-br from-champagne/60 to-rosemist">
            <div className="px-6 py-10 md:px-12 md:py-14 max-w-lg">
              <div className="text-xs uppercase tracking-[0.28em] text-gold mb-2 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" /> Certified Beauticians
              </div>
              <h1 className="font-serif text-3xl md:text-5xl text-espresso leading-tight mb-3">
                At-Home Beauty,<br />
                <span className="italic font-light">Salon Quality</span>
              </h1>
              <p className="text-taupe text-sm md:text-base mb-6 max-w-sm">
                Trained & verified beauticians at your doorstep — facials, bridal makeup, hair spa, and more.
              </p>
              <div className="flex gap-3 text-xs text-taupe flex-wrap">
                <span className="bg-pearl/80 px-3 py-1.5 rounded-full border border-gold/20">✓ Background Verified</span>
                <span className="bg-pearl/80 px-3 py-1.5 rounded-full border border-gold/20">✓ Insured Equipment</span>
                <span className="bg-pearl/80 px-3 py-1.5 rounded-full border border-gold/20">✓ 4.7★ avg rating</span>
              </div>
            </div>
          </div>

          {/* Services grid */}
          <h2 className="font-serif text-2xl text-espresso mb-6">Available Services</h2>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-pearl border border-gold/10 overflow-hidden animate-pulse">
                  <div className="aspect-[4/3] bg-rosemist/60" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-rosemist/60 rounded w-3/4" />
                    <div className="h-3 bg-rosemist/60 rounded w-1/2" />
                    <div className="h-5 bg-rosemist/60 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {services.map((s, i) => (
                <ServiceCard key={s.id} s={s} delay={(i % 4) * 0.06} />
              ))}
            </div>
          )}

          {/* Trust strip */}
          <div className="mt-14 grid sm:grid-cols-3 gap-4">
            {[
              { title: "Book in 60 seconds",    sub: "No calls needed — just pick your slot" },
              { title: "Pay after service",      sub: "Cashless or UPI at your door" },
              { title: "Trained & Background-Verified", sub: "Every beautician passes our certification" },
            ].map(({ title, sub }) => (
              <div key={title} className="bg-pearl rounded-2xl border border-gold/10 p-5 text-center">
                <p className="font-medium text-espresso text-sm mb-1">{title}</p>
                <p className="text-taupe text-xs">{sub}</p>
              </div>
            ))}
          </div>

        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}

function ServiceCard({ s, delay }) {
  const navigate = useNavigate();
  const tagClass = TAG_COLORS[s.tag] || "bg-pearl text-espresso border border-gold/20";

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }} whileHover={{ y: -6 }}
      className="group bg-pearl rounded-2xl border border-gold/10 hover:border-gold/40 hover:shadow-cardLift transition-all overflow-hidden flex flex-col"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-rosemist/30">
        <img src={s.img} alt={s.name} loading="lazy"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        <span className={`absolute top-2.5 left-2.5 text-[10px] uppercase tracking-[0.16em] px-2 py-1 rounded-full ${tagClass}`}>
          {s.tag}
        </span>
        <span className="absolute top-2.5 right-2.5 text-[10px] px-2 py-1 rounded-full bg-pearl/90 text-taupe">
          {s.level}
        </span>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-medium text-espresso text-sm leading-snug mb-2 line-clamp-2">{s.name}</h3>

        <div className="flex items-center gap-3 text-xs text-taupe mb-3">
          <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-gold text-gold" />{s.rating}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.duration}</span>
        </div>

        <div className="mt-auto flex items-center justify-between">
          <span className="font-semibold text-espresso">₹{s.price.toLocaleString("en-IN")}</span>
          <Button
            onClick={() => navigate(`/book/${s.id}`)}
            className="h-8 px-4 rounded-full bg-espresso text-ivory hover:bg-espresso/90 text-xs gap-1"
          >
            Book Now <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
