import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ShoppingBag, Heart, SlidersHorizontal, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import Header from "@/components/site/Header";
import Seo from "@/components/site/Seo";
import Footer from "@/components/site/Footer";
import MobileBottomNav from "@/components/site/MobileBottomNav";
import api from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { CATEGORIES, PRODUCTS } from "@/data/seed";
import { toast } from "sonner";

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { value: "featured",   label: "Featured" },
  { value: "price_asc",  label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating",     label: "Top Rated" },
  { value: "discount",   label: "Biggest Discount" },
];

function ProductSkeleton() {
  return (
    <div className="rounded-2xl bg-pearl border border-gold/10 overflow-hidden animate-pulse">
      <div className="aspect-square bg-rosemist/60" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-rosemist/60 rounded w-1/3" />
        <div className="h-4 bg-rosemist/60 rounded w-2/3" />
        <div className="h-3 bg-rosemist/60 rounded w-1/4" />
        <div className="h-5 bg-rosemist/60 rounded w-1/2" />
      </div>
    </div>
  );
}

export default function Shop() {
  const { category } = useParams();
  const navigate     = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery  = searchParams.get("q") || "";

  const { addToCart }             = useCart();
  const { toggle, isWishlisted }  = useWishlist();
  const [sort, setSort]           = useState("featured");
  const [showFilters, setShowFilters] = useState(false);
  const [priceMax, setPriceMax]   = useState(12000);
  const [brandFilter, setBrandFilter] = useState("");
  const [page, setPage]           = useState(1);
  const [accumulated, setAccumulated] = useState([]);

  // Reset pagination when filters/search/category changes
  useEffect(() => {
    setPage(1);
    setAccumulated([]);
  }, [category, searchQuery]);

  const seedFallback = useMemo(() => ({
    items: PRODUCTS.filter(p =>
      (!category    || p.category_id === category) &&
      (!searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       p.brand.toLowerCase().includes(searchQuery.toLowerCase()))
    ).slice(0, PAGE_SIZE),
    total: PRODUCTS.length, page: 1, total_pages: Math.ceil(PRODUCTS.length / PAGE_SIZE),
  }), [category, searchQuery]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["products", category, searchQuery, page],
    queryFn: async () => {
      const params = { page, limit: PAGE_SIZE };
      if (category)    params.category = category;
      if (searchQuery) params.q = searchQuery;
      const res = await api.get("/products", { params });
      return res.data;
    },
    placeholderData: seedFallback,
  });

  // Accumulate pages into a single list
  useEffect(() => {
    if (!data?.items) return;
    setAccumulated(prev => page === 1 ? data.items : [...prev, ...data.items]);
  }, [data?.items, page]);

  const products = accumulated.length > 0 ? accumulated : (data?.items ?? []);
  const totalPages   = data?.total_pages ?? 1;
  const totalCount   = data?.total ?? 0;
  const hasMore      = page < totalPages;

  // All unique brands from accumulated result set
  const allBrands = useMemo(() => [...new Set(products.map(p => p.brand))].sort(), [products]);

  const sorted = useMemo(() => {
    let list = products.filter(p =>
      p.price <= priceMax &&
      (!brandFilter || p.brand === brandFilter)
    );
    if (sort === "price_asc")  return [...list].sort((a, b) => a.price - b.price);
    if (sort === "price_desc") return [...list].sort((a, b) => b.price - a.price);
    if (sort === "rating")     return [...list].sort((a, b) => b.rating - a.rating);
    if (sort === "discount")   return [...list].sort((a, b) => (b.mrp - b.price) / b.mrp - (a.mrp - a.price) / a.mrp);
    return list;
  }, [products, sort, priceMax, brandFilter]);

  const activeCat     = CATEGORIES.find(c => c.id === category);
  const activeFilters = (brandFilter ? 1 : 0) + (priceMax < 12000 ? 1 : 0);

  function clearFilters() {
    setPriceMax(12000);
    setBrandFilter("");
  }

  return (
    <div className="min-h-screen bg-ivory text-espresso">
      <Seo title="Shop Beauty & Lifestyle Products" description="Explore premium skincare, K-beauty and lifestyle products. Free delivery over ₹999." path="/shop" />
      <Header />
      <main className="pt-24 md:pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-5 md:px-10">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-taupe mb-6 flex-wrap">
            <Link to="/" className="hover:text-espresso transition">Home</Link>
            <span>/</span>
            <Link to="/shop" className="hover:text-espresso transition">Shop</Link>
            {activeCat && <><span>/</span><span className="text-espresso">{activeCat.label}</span></>}
            {searchQuery && <><span>/</span><span className="text-espresso">"{searchQuery}"</span></>}
          </div>

          {/* Page title */}
          <div className="mb-6">
            <div className="text-xs uppercase tracking-[0.25em] text-gold mb-1">
              {searchQuery ? "Search Results" : activeCat ? activeCat.label : "All Products"}
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-espresso leading-tight">
              {searchQuery
                ? <>Results for <span className="italic font-light">"{searchQuery}"</span></>
                : activeCat ? activeCat.label
                : <>K-Glow <span className="italic font-light">Marketplace</span></>}
            </h1>
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button onClick={() => navigate("/shop")}
              className={`px-4 py-1.5 rounded-full text-sm border transition-all ${
                !category ? "bg-espresso text-ivory border-espresso"
                          : "bg-pearl text-espresso border-gold/30 hover:border-gold/60"}`}>
              All
            </button>
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => navigate(`/shop/${c.id}`)}
                className={`px-4 py-1.5 rounded-full text-sm border transition-all ${
                  category === c.id ? "bg-espresso text-ivory border-espresso"
                                    : "bg-pearl text-espresso border-gold/30 hover:border-gold/60"}`}>
                {c.label}
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <p className="text-sm text-taupe">
                <span className="text-espresso font-medium">{totalCount || sorted.length}</span> products
              </p>
              <button onClick={() => setShowFilters(v => !v)}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-all ${
                  showFilters || activeFilters > 0
                    ? "bg-espresso text-ivory border-espresso"
                    : "bg-pearl text-espresso border-gold/30 hover:border-gold/60"}`}>
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filters
                {activeFilters > 0 && <span className="w-4 h-4 rounded-full bg-gold text-pearl text-[10px] grid place-items-center font-semibold">{activeFilters}</span>}
              </button>
              {activeFilters > 0 && (
                <button onClick={clearFilters} className="text-xs text-taupe hover:text-espresso flex items-center gap-1 transition">
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-48 h-9 rounded-full border-gold/30 text-sm bg-pearl">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-pearl border-gold/20">
                {SORT_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-espresso focus:bg-rosemist">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filter panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-6"
              >
                <div className="bg-pearl rounded-2xl border border-gold/15 p-5 grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs uppercase tracking-[0.18em] text-taupe mb-3 block">
                      Max Price — ₹{priceMax.toLocaleString("en-IN")}
                    </label>
                    <input type="range" min={100} max={12000} step={100}
                      value={priceMax} onChange={e => setPriceMax(Number(e.target.value))}
                      className="w-full accent-espresso" />
                    <div className="flex justify-between text-xs text-taupe mt-1">
                      <span>₹100</span><span>₹12,000</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.18em] text-taupe mb-3 block">Brand</label>
                    <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                      {allBrands.map(b => (
                        <button key={b} onClick={() => setBrandFilter(prev => prev === b ? "" : b)}
                          className={`px-3 py-1 rounded-full text-xs border transition-all ${
                            brandFilter === b
                              ? "bg-espresso text-ivory border-espresso"
                              : "bg-ivory text-espresso border-gold/30 hover:border-gold/60"}`}>
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {isLoading && page === 1
              ? Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)
              : sorted.map((p, i) => (
                  <ShopProductCard key={p.id} p={p} delay={(i % 4) * 0.04}
                    onAdd={() => { addToCart(p); toast.success(`${p.name} added`); }}
                    wishlisted={isWishlisted(p.id)} onWishlist={() => toggle(p)} />
                ))}
          </div>

          {/* Empty state */}
          {!isLoading && sorted.length === 0 && (
            <div className="text-center py-24">
              <p className="text-taupe text-lg">No products found.</p>
              <Button onClick={() => { navigate("/shop"); clearFilters(); }}
                className="mt-4 rounded-full bg-espresso text-ivory">
                Browse all products
              </Button>
            </div>
          )}

          {/* Load More */}
          {hasMore && sorted.length > 0 && (
            <div className="mt-10 flex justify-center">
              <Button
                onClick={() => setPage(p => p + 1)}
                disabled={isFetching}
                variant="outline"
                className="rounded-full border-gold/40 text-espresso h-11 px-8 hover:bg-rosemist/60 gap-2"
              >
                {isFetching
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
                  : `Load More (${totalCount - sorted.length} remaining)`}
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

function ShopProductCard({ p, delay, onAdd, wishlisted, onWishlist }) {
  const discount = Math.round(((p.mrp - p.price) / p.mrp) * 100);
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }} whileHover={{ y: -6 }}
      className="group relative bg-pearl rounded-2xl border border-gold/10 hover:border-gold/40 hover:shadow-cardLift transition-all overflow-hidden"
    >
      <Link to={`/product/${p.id}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-rosemist/30">
          <img src={p.img} alt={p.name} loading="lazy"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
          {p.badges?.slice(0, 1).map(b => (
            <span key={b} className="absolute top-2.5 left-2.5 text-[10px] uppercase tracking-[0.16em] px-2 py-1 rounded-full bg-pearl/90 text-espresso border border-gold/30">
              {b}
            </span>
          ))}
          {discount > 0 && (
            <span className="absolute top-2.5 right-2.5 text-[10px] font-semibold px-2 py-1 rounded-full bg-errorRose/95 text-pearl">
              -{discount}%
            </span>
          )}
        </div>
        <div className="p-3 md:p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-taupe">{p.brand}</div>
          <h3 className="text-sm md:text-base font-medium text-espresso mt-0.5 line-clamp-2 leading-snug">{p.name}</h3>
          <div className="mt-2 flex items-center gap-1 text-xs">
            <Star className="w-3.5 h-3.5 fill-gold text-gold" />
            <span className="font-medium">{p.rating}</span>
            <span className="text-taupe">({p.reviews?.toLocaleString()})</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-semibold">₹{p.price.toLocaleString("en-IN")}</span>
            {p.mrp > p.price && (
              <span className="text-taupe text-xs line-through">₹{p.mrp.toLocaleString("en-IN")}</span>
            )}
          </div>
        </div>
      </Link>

      <div className="px-3 pb-3 md:px-4 md:pb-4 flex gap-2">
        <Button onClick={e => { e.preventDefault(); onAdd(); }}
          className="flex-1 h-9 rounded-full bg-espresso text-ivory hover:bg-espresso/90 text-xs">
          <ShoppingBag className="w-3.5 h-3.5 mr-1" /> Add to Cart
        </Button>
        <Button size="icon" variant="outline" onClick={e => { e.preventDefault(); onWishlist(); }}
          className={`h-9 w-9 rounded-full border-gold/40 ${wishlisted ? "bg-rosemist" : "bg-pearl/90"}`}>
          <Heart className={`w-3.5 h-3.5 text-espresso ${wishlisted ? "fill-espresso" : ""}`} />
        </Button>
      </div>
    </motion.article>
  );
}
