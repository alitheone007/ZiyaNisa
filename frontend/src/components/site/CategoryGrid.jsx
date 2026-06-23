import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { CATEGORIES } from "@/data/seed";

export default function CategoryGrid() {
  return (
    <section id="categories" data-testid="categories" className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-5 md:px-10">
        <SectionHead
          overline="Curated Categories"
          title={<>Find your <span className="italic font-light">glow ritual</span></>}
          subtitle="Ten worlds, one elegant marketplace — from clean actives to bridal adornment."
        />

        <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-5">
          {CATEGORIES.map((c, i) => (
            <motion.div
              key={c.id}
              data-testid={`cat-${c.id}`}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.55, delay: (i % 5) * 0.06 }}
              whileHover={{ y: -6 }}
              className="group relative rounded-2xl overflow-hidden bg-pearl border border-gold/10 hover:border-gold/40 hover:shadow-goldGlow transition-all"
            >
              <Link to={`/shop/${c.id}`} className="block">
                <div className={`relative aspect-[4/5] bg-gradient-to-br ${c.tint}`}>
                  <img
                    src={c.img}
                    alt={c.label}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-90 group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-espresso/55 via-espresso/0 to-transparent" />
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-pearl/90 grid place-items-center opacity-0 group-hover:opacity-100 transition">
                    <ArrowUpRight className="w-4 h-4 text-espresso" />
                  </div>
                </div>
                <div className="p-3 md:p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm md:text-base font-medium text-espresso leading-tight">{c.label}</div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-taupe mt-0.5">Shop now</div>
                  </div>
                  <span className="w-6 h-6 rounded-full border border-gold/40 group-hover:bg-gold/15 transition" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SectionHead({ overline, title, subtitle, align = "left", action }) {
  return (
    <div className={`flex flex-col md:flex-row md:items-end md:justify-between gap-4 ${align === "center" ? "text-center md:items-center md:flex-col" : ""}`}>
      <div className="max-w-2xl">
        <div className="text-xs uppercase tracking-[0.25em] text-gold">{overline}</div>
        <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-espresso mt-2 leading-tight text-balance">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-3 text-taupe text-sm md:text-base leading-relaxed max-w-xl">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
