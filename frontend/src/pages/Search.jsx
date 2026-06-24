import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Search as SearchIcon, X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import MobileBottomNav from "@/components/site/MobileBottomNav";
import { ProductCard } from "@/components/site/ProductTeaser";
import { CATEGORIES } from "@/data/seed";
import api from "@/lib/api";

const SORT_OPTIONS = [
  { value: "",           label: "Relevance" },
  { value: "reviews",   label: "Most Popular" },
  { value: "rating",    label: "Top Rated" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc",label: "Price: High to Low" },
];

function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [input, setInput]   = useState(searchParams.get("q") || "");
  const [sort, setSort]     = useState("");
  const [category, setCat]  = useState("");
  const [page, setPage]     = useState(1);

  const q = useDebounced(input);

  // Reset page when query changes
  useEffect(() => { setPage(1); }, [q, sort, category]);

  // Sync URL
  useEffect(() => {
    const params = {};
    if (q) params.q = q;
    setSearchParams(params, { replace: true });
  }, [q, setSearchParams]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["search", q, sort, category, page],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "16", page: String(page) });
      if (q)        params.set("q", q);
      if (sort)     params.set("sort", sort);
      if (category) params.set("category", category);
      return api.get(`/products?${params}`).then(r => r.data);
    },
    enabled: true,
    placeholderData: prev => prev,
    staleTime: 30_000,
  });

  const items      = data?.items || [];
  const total      = data?.total || 0;
  const totalPages = data?.total_pages || 1;

  return (
    <div className="min-h-screen bg-ivory text-espresso">
      <Header />

      <main className="pt-24 md:pt-28 pb-24">
        <div className="max-w-7xl mx-auto px-5 md:px-10">

          {/* Search bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-taupe pointer-events-none" />
              <input
                autoFocus
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Search products, brands, ingredients…"
                className="w-full h-12 pl-12 pr-10 rounded-full border border-stone-200 bg-pearl text-espresso placeholder:text-taupe/60 focus:outline-none focus:ring-2 focus:ring-gold/40 shadow-soft text-sm"
              />
              {input && (
                <button onClick={() => setInput("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-taupe hover:text-espresso transition">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap gap-2 mb-6 items-center">
            <SlidersHorizontal className="w-4 h-4 text-taupe shrink-0" />

            {/* Category chips */}
            <button onClick={() => setCat("")}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${!category ? "bg-espresso text-ivory border-espresso" : "border-stone-200 text-taupe hover:border-espresso hover:text-espresso"}`}>
              All
            </button>
            {CATEGORIES.slice(0, 6).map(c => (
              <button key={c.id} onClick={() => setCat(cat => cat === c.id ? "" : c.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${category === c.id ? "bg-espresso text-ivory border-espresso" : "border-stone-200 text-taupe hover:border-espresso hover:text-espresso"}`}>
                {c.label}
              </button>
            ))}

            {/* Sort select */}
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="ml-auto text-xs border border-stone-200 rounded-full px-3 py-1.5 bg-pearl text-espresso focus:outline-none focus:ring-1 focus:ring-gold cursor-pointer">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Results count */}
          <div className="flex items-center gap-2 mb-6 min-h-[24px]">
            {q && !isLoading && (
              <p className="text-sm text-taupe">
                {total > 0
                  ? <><span className="font-medium text-espresso">{total}</span> result{total !== 1 ? "s" : ""} for "<span className="italic">{q}</span>"</>
                  : <>No results for "<span className="italic">{q}</span>"</>}
              </p>
            )}
            {isFetching && <span className="text-xs text-taupe animate-pulse">Searching…</span>}
          </div>

          {/* Grid */}
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-2xl bg-rosemist/40 animate-pulse aspect-[3/4]" />
                ))}
              </motion.div>
            ) : items.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-center py-20">
                <p className="text-5xl mb-4">🔍</p>
                <p className="text-taupe text-lg mb-2">No products found</p>
                <p className="text-taupe text-sm mb-6">
                  {q ? `Try a different search term or browse by category` : `Enter something to search`}
                </p>
                <div className="flex gap-2 flex-wrap justify-center">
                  {["serum", "moisturizer", "ittar", "kajal"].map(s => (
                    <button key={s} onClick={() => setInput(s)}
                      className="text-xs px-4 py-2 rounded-full border border-gold/40 text-espresso hover:bg-rosemist/40 transition capitalize">
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {items.map((p, i) => (
                  <ProductCard key={p.id} p={p} delay={(i % 4) * 0.04} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="rounded-full border-stone-200 text-espresso">← Prev</Button>
              <span className="text-sm text-taupe px-2">{page} / {totalPages}</span>
              <Button variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                className="rounded-full border-stone-200 text-espresso">Next →</Button>
            </div>
          )}

        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
