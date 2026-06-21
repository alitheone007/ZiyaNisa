import { motion } from "framer-motion";
import { ShieldCheck, Sparkles, Leaf, Lock, Home } from "lucide-react";

const ITEMS = [
  { label: "Verified Brands", Icon: ShieldCheck },
  { label: "Trained Beauticians", Icon: Sparkles },
  { label: "Clean Ingredients", Icon: Leaf },
  { label: "Secure Payments", Icon: Lock },
  { label: "Doorstep Service", Icon: Home },
];

export default function TrustBadges() {
  return (
    <section data-testid="trust-badges" className="border-y border-gold/15 bg-pearl/70 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-5 md:px-10 py-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-6 gap-y-4">
        {ITEMS.map(({ label, Icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
            className="flex items-center gap-2.5"
            data-testid={`trust-${label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <span className="w-9 h-9 rounded-full grid place-items-center bg-gradient-to-br from-champagne/40 to-ivory border border-gold/20">
              <Icon className="w-4 h-4 text-gold" />
            </span>
            <span className="text-xs md:text-sm text-espresso/80 leading-tight">{label}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
