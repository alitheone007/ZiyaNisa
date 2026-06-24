import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { X, GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompare } from "@/context/CompareContext";

export default function CompareBar() {
  const { items, remove, clear } = useCompare();
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {items.length > 0 && (
        <motion.div
          key="compare-bar"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg"
        >
          <div className="bg-espresso text-ivory rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3">
            <GitCompareArrows className="w-5 h-5 text-gold shrink-0" />

            {/* Product thumbnails */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {items.map(p => (
                <div key={p.id} className="relative group shrink-0">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-rosemist/30 border border-gold/30">
                    <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                  <button
                    onClick={() => remove(p.id)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-taupe/80 hover:bg-errorRose text-ivory grid place-items-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
              {/* Empty slots */}
              {Array.from({ length: 3 - items.length }).map((_, i) => (
                <div key={i} className="w-10 h-10 rounded-lg border border-dashed border-gold/30 bg-white/5 grid place-items-center">
                  <span className="text-xs text-ivory/30">+</span>
                </div>
              ))}
              <div className="ml-1 min-w-0">
                <p className="text-xs text-ivory/70 leading-tight">
                  {items.length} of 3 selected
                </p>
                <p className="text-[10px] text-ivory/40 leading-tight truncate">
                  {items.map(p => p.name.split(" ")[0]).join(", ")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button onClick={clear} className="text-[11px] text-ivory/50 hover:text-ivory transition underline underline-offset-2">
                Clear
              </button>
              <Button
                onClick={() => navigate("/compare")}
                disabled={items.length < 2}
                className="h-8 px-3 text-xs rounded-full bg-gold text-espresso hover:bg-gold/90 font-semibold disabled:opacity-40"
              >
                Compare Now
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
