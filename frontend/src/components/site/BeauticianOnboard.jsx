import { motion } from "framer-motion";
import { Sparkles, IndianRupee, CalendarCheck, ShieldCheck, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PERKS = [
  { Icon: IndianRupee, title: "Weekly payouts", desc: "Earn 60–70% per booking with transparent commissions." },
  { Icon: CalendarCheck, title: "Your schedule", desc: "Toggle availability. We match nearby customers." },
  { Icon: ShieldCheck, title: "Training & kit", desc: "ZiyaNisa-certified hygiene & K-Glow techniques." },
];

export default function BeauticianOnboard() {
  const navigate = useNavigate();
  return (
    <section data-testid="beautician-onboard" className="py-20 md:py-28 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-espresso via-[#3a2c20] to-espresso text-ivory p-8 sm:p-12 md:p-16"
        >
          {/* Decorative halos */}
          <div className="absolute -top-32 -right-20 w-[28rem] h-[28rem] rounded-full bg-gold/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-40 -left-20 w-[28rem] h-[28rem] rounded-full bg-peach/10 blur-3xl pointer-events-none" />
          <div className="absolute inset-0 noise-overlay opacity-40 pointer-events-none" />

          <div className="relative grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-gold flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" /> Beautician Partners
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl mt-3 leading-tight text-ivory text-balance">
                Build a graceful career —
                <br />
                <span className="italic font-light text-champagne">on your schedule</span>.
              </h2>
              <p className="mt-5 text-champagne/80 leading-relaxed max-w-lg text-sm md:text-base">
                Join ZiyaNisa as a certified beautician. We bring you trained customers,
                a verified product kit, smart routing across your service zones, and weekly
                transparent payouts.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Button
                  data-testid="beautician-apply"
                  size="lg"
                  onClick={() => navigate("/beautician/apply")}
                  className="rounded-full bg-gold text-espresso hover:bg-champagne h-12 px-7 font-medium shadow-goldGlow"
                >
                  Apply as Beautician <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
                <Button
                  data-testid="beautician-learn"
                  size="lg"
                  variant="outline"
                  onClick={() => document.getElementById("beautician-perks")?.scrollIntoView({ behavior: "smooth" })}
                  className="rounded-full h-12 px-7 border-champagne/30 bg-transparent text-ivory hover:bg-pearl/10 hover:text-ivory"
                >
                  How it works
                </Button>
              </div>
            </div>

            <div className="grid sm:grid-cols-1 gap-4">
              {PERKS.map(({ Icon, title, desc }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.55, delay: 0.1 + i * 0.1 }}
                  className="glass-card rounded-2xl p-5 flex items-start gap-4"
                >
                  <span className="shrink-0 w-11 h-11 rounded-full grid place-items-center bg-gold/20 border border-gold/40">
                    <Icon className="w-5 h-5 text-gold" />
                  </span>
                  <div>
                    <div className="text-espresso font-medium">{title}</div>
                    <div className="text-taupe text-sm mt-0.5">{desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
