import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { X, Star, ShoppingBag, ArrowLeft, GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import MobileBottomNav from "@/components/site/MobileBottomNav";
import { useCompare } from "@/context/CompareContext";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

function Stars({ rating }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? "text-gold fill-gold" : "text-stone-200 fill-stone-200"}`} />
      ))}
    </span>
  );
}

const ROWS = [
  { key: "price",   label: "Price",       winner: "lowest"  },
  { key: "rating",  label: "Rating",      winner: "highest" },
  { key: "reviews", label: "Reviews",     winner: "highest" },
  { key: "actives", label: "Key Actives", winner: null      },
  { key: "badges",  label: "Highlights",  winner: null      },
];

function computeWinner(items, key, mode) {
  if (!mode || items.length < 2) return null;
  const vals = items.map(p => p[key]);
  if (mode === "lowest")  return vals.indexOf(Math.min(...vals));
  if (mode === "highest") return vals.indexOf(Math.max(...vals));
  return null;
}

export default function Compare() {
  const { items, remove, clear } = useCompare();
  const { addItem } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-ivory text-espresso">
        <Header />
        <main className="pt-28 pb-20 flex flex-col items-center justify-center gap-6 px-5 min-h-[60vh]">
          <GitCompareArrows className="w-14 h-14 text-taupe/30" />
          <h1 className="font-serif text-2xl text-espresso">Nothing to compare</h1>
          <p className="text-taupe text-sm text-center max-w-xs">
            Add products to compare from any product page using the "Compare" button.
          </p>
          <Button onClick={() => navigate("/shop")} className="rounded-full bg-espresso text-ivory px-8 h-12">
            Browse Products
          </Button>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  function addAllToCart() {
    items.forEach(p => addItem({ id: p.id, name: p.name, brand: p.brand, price: p.price, img: p.img }));
    toast.success(`${items.length} products added to cart`);
  }

  const colClass = items.length === 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div className="min-h-screen bg-ivory text-espresso">
      <Header />
      <main className="pt-24 md:pt-28 pb-24">
        <div className="max-w-5xl mx-auto px-5 md:px-10">

          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <button onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-sm text-taupe hover:text-espresso transition">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="font-serif text-2xl text-espresso flex-1">Compare Products</h1>
            <button onClick={clear} className="text-xs text-taupe hover:text-espresso underline underline-offset-2 transition">
              Clear all
            </button>
          </div>

          {/* Product header row */}
          <div className={`grid ${colClass} gap-4 mb-6`}>
            {items.map(p => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="bg-pearl rounded-2xl border border-gold/15 p-4 relative">
                <button onClick={() => remove(p.id)}
                  className="absolute top-3 right-3 w-6 h-6 rounded-full bg-rosemist/60 hover:bg-errorRose/30 grid place-items-center text-taupe hover:text-espresso transition">
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="aspect-square rounded-xl overflow-hidden bg-rosemist/20 mb-3">
                  <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-gold">{p.brand}</div>
                <div className="text-sm font-medium text-espresso mt-0.5 line-clamp-2 min-h-[2.5rem]">{p.name}</div>
                <div className="text-base font-bold text-espresso mt-2">₹{p.price?.toLocaleString("en-IN")}</div>
                <Button
                  onClick={() => { addItem({ id: p.id, name: p.name, brand: p.brand, price: p.price, img: p.img }); toast.success("Added to cart"); }}
                  className="w-full mt-3 h-9 rounded-full bg-espresso text-ivory text-xs hover:bg-espresso/90 gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5" /> Add to Cart
                </Button>
              </motion.div>
            ))}
          </div>

          {/* Comparison table */}
          <div className="bg-pearl rounded-2xl border border-gold/15 overflow-hidden">
            {ROWS.map((row, rowIdx) => {
              const winnerIdx = computeWinner(items, row.key, row.winner);
              return (
                <div key={row.key} className={`grid ${colClass} divide-x divide-gold/10 ${rowIdx > 0 ? "border-t border-gold/10" : ""}`}>
                  {/* Label column on mobile: we use a left-spanning approach */}
                  {items.map((p, ci) => {
                    const isWinner = winnerIdx === ci;
                    const val = p[row.key];
                    return (
                      <div key={p.id} className={`p-4 ${isWinner ? "bg-gold/5" : ""}`}>
                        {ci === 0 && (
                          <div className="text-[10px] uppercase tracking-[0.18em] text-taupe mb-1 font-medium">{row.label}</div>
                        )}
                        {/* Content varies by row type */}
                        {row.key === "price" && (
                          <div className={`font-semibold ${isWinner ? "text-green-700" : "text-espresso"}`}>
                            ₹{val?.toLocaleString("en-IN")}
                            {isWinner && <span className="ml-1.5 text-[10px] font-normal text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">Best Price</span>}
                          </div>
                        )}
                        {row.key === "rating" && (
                          <div className="flex flex-col gap-0.5">
                            <Stars rating={val || 0} />
                            <span className={`text-sm font-medium ${isWinner ? "text-green-700" : "text-espresso"}`}>
                              {val?.toFixed(1)}
                              {isWinner && <span className="ml-1 text-[10px] text-green-600">★ Top Rated</span>}
                            </span>
                          </div>
                        )}
                        {row.key === "reviews" && (
                          <div className={`text-sm ${isWinner ? "text-green-700 font-semibold" : "text-taupe"}`}>
                            {val?.toLocaleString("en-IN")} reviews
                          </div>
                        )}
                        {row.key === "actives" && (
                          <div className="flex flex-wrap gap-1">
                            {(val || []).slice(0, 4).map(a => (
                              <span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-rosemist/50 text-espresso">{a}</span>
                            ))}
                            {(val || []).length === 0 && <span className="text-xs text-taupe/60">—</span>}
                          </div>
                        )}
                        {row.key === "badges" && (
                          <div className="flex flex-wrap gap-1">
                            {(val || []).slice(0, 3).map(b => (
                              <span key={b} className="text-[10px] px-2 py-0.5 rounded-full bg-champagne/30 text-espresso">{b}</span>
                            ))}
                            {(val || []).length === 0 && <span className="text-xs text-taupe/60">—</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Add all to cart */}
          {items.length > 1 && (
            <div className="mt-6 text-center">
              <Button onClick={addAllToCart}
                className="h-12 px-8 rounded-full bg-gold text-espresso hover:bg-gold/90 font-semibold gap-2">
                <ShoppingBag className="w-4 h-4" /> Add All to Cart
              </Button>
            </div>
          )}

        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
