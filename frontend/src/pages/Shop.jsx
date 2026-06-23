import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Star, ShoppingBag, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import MobileBottomNav from "@/components/site/MobileBottomNav";
import api from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { CATEGORIES, PRODUCTS } from "@/data/seed";
import { toast } from "sonner";

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
  { value: "discount", label: "Biggest Discount" },
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
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggle, isWishlisted } = useWishlist();
  const [sort, setSort] = useState("featured");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", category],
    queryFn: async () => {
      const res = await api.get("/products", {
        params: category ? { category } : {},
      });
      return res.data;
    },
    placeholderData: PRODUCTS.filter(
      (p) => !category || p.category_id === category
    ),
  });

  const sorted = [...products].sort((a, b) => {
    if (sort === "price_asc") return a.price - b.price;
    if (sort === "price_desc") return b.price - a.price;
    if (sort === "rating") return b.rating - a.rating;
    if (sort === "discount")
      return (b.mrp - b.price) / b.mrp - (a.mrp - a.price) / a.mrp;
    return 0;
  });

  const activeCat = CATEGORIES.find((c) => c.id === category);

  return (
    <div className="min-h-screen bg-ivory text-espresso">
      <Header />
      <main className="pt-24 md:pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-taupe mb-6">
            <Link to="/" className="hover:text-espresso transition">
              Home
            </Link>
            <span>/</span>
            <Link to="/shop" className="hover:text-espresso transition">
              Shop
            </Link>
            {activeCat && (
              <>
                <span>/</span>
                <span className="text-espresso">{activeCat.label}</span>
              </>
            )}
          </div>

          {/* Page title */}
          <div className="mb-8">
            <div className="text-xs uppercase tracking-[0.25em] text-gold mb-1">
              {activeCat ? activeCat.label : "All Products"}
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-espresso leading-tight">
              {activeCat ? (
                activeCat.label
              ) : (
                <>
                  K-Glow{" "}
                  <span className="italic font-light">Marketplace</span>
                </>
              )}
            </h1>
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => navigate("/shop")}
              className={`px-4 py-1.5 rounded-full text-sm border transition-all ${
                !category
                  ? "bg-espresso text-ivory border-espresso"
                  : "bg-pearl text-espresso border-gold/30 hover:border-gold/60"
              }`}
            >
              All
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/shop/${c.id}`)}
                className={`px-4 py-1.5 rounded-full text-sm border transition-all ${
                  category === c.id
                    ? "bg-espresso text-ivory border-espresso"
                    : "bg-pearl text-espresso border-gold/30 hover:border-gold/60"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-taupe">
              <span className="text-espresso font-medium">{sorted.length}</span>{" "}
              products
            </p>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-48 h-9 rounded-full border-gold/30 text-sm bg-pearl">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-pearl border-gold/20">
                {SORT_OPTIONS.map((o) => (
                  <SelectItem
                    key={o.value}
                    value={o.value}
                    className="text-espresso focus:bg-rosemist"
                  >
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <ProductSkeleton key={i} />
                ))
              : sorted.map((p, i) => (
                  <ShopProductCard
                    key={p.id}
                    p={p}
                    delay={(i % 4) * 0.06}
                    onAdd={() => {
                      addToCart(p);
                      toast.success(`${p.name} added to cart`);
                    }}
                    wishlisted={isWishlisted(p.id)}
                    onWishlist={() => toggle(p)}
                  />
                ))}
          </div>

          {!isLoading && sorted.length === 0 && (
            <div className="text-center py-24">
              <p className="text-taupe text-lg">
                No products found in this category.
              </p>
              <Button
                onClick={() => navigate("/shop")}
                className="mt-4 rounded-full bg-espresso text-ivory"
              >
                Browse all products
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
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -6 }}
      className="group relative bg-pearl rounded-2xl border border-gold/10 hover:border-gold/40 hover:shadow-cardLift transition-all overflow-hidden"
      data-testid={`shop-product-${p.id}`}
    >
      <Link to={`/product/${p.id}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-rosemist/30">
          <img
            src={p.img}
            alt={p.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
          {p.badges?.slice(0, 1).map((b) => (
            <span
              key={b}
              className="absolute top-2.5 left-2.5 text-[10px] uppercase tracking-[0.16em] px-2 py-1 rounded-full bg-pearl/90 text-espresso border border-gold/30"
            >
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
          <div className="text-[10px] uppercase tracking-[0.18em] text-taupe">
            {p.brand}
          </div>
          <h3 className="text-sm md:text-base font-medium text-espresso mt-0.5 line-clamp-2 leading-snug">
            {p.name}
          </h3>
          <div className="mt-2 flex items-center gap-1 text-xs">
            <Star className="w-3.5 h-3.5 fill-gold text-gold" />
            <span className="font-medium">{p.rating}</span>
            <span className="text-taupe">({p.reviews?.toLocaleString()})</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-semibold">
              ₹{p.price.toLocaleString("en-IN")}
            </span>
            {p.mrp > p.price && (
              <span className="text-taupe text-xs line-through">
                ₹{p.mrp.toLocaleString("en-IN")}
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="px-3 pb-3 md:px-4 md:pb-4 flex gap-2">
        <Button
          data-testid={`shop-add-${p.id}`}
          onClick={(e) => {
            e.preventDefault();
            onAdd();
          }}
          className="flex-1 h-9 rounded-full bg-espresso text-ivory hover:bg-espresso/90 text-xs"
        >
          <ShoppingBag className="w-3.5 h-3.5 mr-1" /> Add to Cart
        </Button>
        <Button
          data-testid={`shop-wish-${p.id}`}
          size="icon"
          variant="outline"
          onClick={(e) => {
            e.preventDefault();
            onWishlist();
          }}
          className={`h-9 w-9 rounded-full border-gold/40 ${
            wishlisted ? "bg-rosemist" : "bg-pearl/90"
          }`}
        >
          <Heart
            className={`w-3.5 h-3.5 text-espresso ${
              wishlisted ? "fill-espresso" : ""
            }`}
          />
        </Button>
      </div>
    </motion.article>
  );
}
