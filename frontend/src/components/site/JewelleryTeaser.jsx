import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { JEWELLERY } from "@/data/seed";
import { SectionHead } from "./CategoryGrid";
import { Button } from "@/components/ui/button";

export default function JewelleryTeaser() {
  return (
    <section id="jewellery" data-testid="jewellery-teaser" className="py-20 md:py-28 bg-gradient-to-b from-ivory via-rosemist/40 to-ivory">
      <div className="max-w-7xl mx-auto px-5 md:px-10">
        <SectionHead
          overline="Jewellery & Handbags"
          title={<><span className="italic font-light">Adorn</span> your glow</>}
          subtitle="Hand-picked imitation jewellery, bridal sets and occasion bags — crafted to complete your ZiyaNisa ritual."
          action={
            <Button data-testid="jewellery-cta" variant="ghost" className="rounded-full text-espresso hover:bg-pearl group">
              Shop adornment <ArrowUpRight className="w-4 h-4 ml-1 group-hover:rotate-12 transition" />
            </Button>
          }
        />

        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {JEWELLERY.map((j, i) => (
            <motion.a
              key={j.id}
              data-testid={`jewel-${j.id}`}
              href="#jewellery" /* TODO(next-AI): /shop/jewellery/${j.id} */
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              whileHover={{ y: -8 }}
              className="group relative rounded-2xl overflow-hidden bg-pearl border border-gold/10 hover:border-gold/40 hover:shadow-cardLift transition-all"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <img
                  src={j.img}
                  alt={j.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-espresso/40 to-transparent" />
                <span className="absolute top-3 left-3 text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-full bg-pearl/90 text-espresso border border-gold/30">
                  Curated
                </span>
              </div>
              <div className="p-3 md:p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm md:text-base font-medium text-espresso leading-snug">{j.name}</h3>
                  <div className="text-espresso/80 text-sm mt-1">₹{j.price.toLocaleString("en-IN")}</div>
                </div>
                <span className="w-8 h-8 rounded-full bg-rosemist grid place-items-center opacity-0 group-hover:opacity-100 transition">
                  <ArrowUpRight className="w-4 h-4 text-espresso" />
                </span>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
