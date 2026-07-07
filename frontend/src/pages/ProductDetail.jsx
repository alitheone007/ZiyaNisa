import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ShoppingBag, Heart, ChevronRight, Check, MessageSquare, GitCompareArrows, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/site/Header";
import Seo from "@/components/site/Seo";
import Footer from "@/components/site/Footer";
import MobileBottomNav from "@/components/site/MobileBottomNav";
import api from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import { useCompare } from "@/context/CompareContext";
import { PRODUCTS } from "@/data/seed";
import { toast } from "sonner";

// ── Notify Me when back in stock ─────────────────────────────────────────────
function NotifyMeBox({ productId }) {
  const [contact, setContact] = useState("");
  const [sent, setSent] = useState(false);

  const { mutate: notify, isPending } = useMutation({
    mutationFn: () => api.post(`/products/${productId}/notify`, { contact }),
    onSuccess: () => setSent(true),
    onError: () => toast.error("Could not save. Try again."),
  });

  if (sent) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
        <Check className="w-4 h-4" /> Got it — we'll notify you when it's back!
      </div>
    );
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <input
        type="text"
        placeholder="Enter email or phone to be notified"
        value={contact}
        onChange={e => setContact(e.target.value)}
        className="flex-1 h-11 rounded-full border border-gold/30 px-4 text-sm text-espresso placeholder:text-taupe/60 focus:outline-none focus:ring-2 focus:ring-gold/40 bg-pearl min-w-[180px]"
      />
      <Button
        onClick={() => contact.trim() && notify()}
        disabled={!contact.trim() || isPending}
        className="rounded-full bg-espresso text-ivory h-11 px-6 text-sm gap-2"
      >
        <BellRing className="w-4 h-4" />
        {isPending ? "Saving…" : "Notify Me"}
      </Button>
    </div>
  );
}

// ── Star Rating Input ─────────────────────────────────────────────────────────
function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button"
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="focus:outline-none">
          <Star className={`w-6 h-6 transition-colors ${
            n <= (hover || value) ? "fill-gold text-gold" : "text-stone-300"
          }`} />
        </button>
      ))}
    </div>
  );
}

// ── Star display (read-only) ──────────────────────────────────────────────────
function Stars({ rating, size = "w-4 h-4" }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={`${size} ${n <= Math.round(rating) ? "fill-gold text-gold" : "text-stone-300"}`} />
      ))}
    </span>
  );
}

// ── Reviews section ───────────────────────────────────────────────────────────
function ReviewsSection({ productId }) {
  const { isLoggedIn } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating]     = useState(0);
  const [comment, setComment]   = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["reviews", productId],
    queryFn: () => api.get(`/products/${productId}/reviews`).then(r => r.data),
    staleTime: 60_000,
  });

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () => api.post(`/products/${productId}/reviews`, { rating, comment }),
    onSuccess: () => {
      toast.success("Review submitted!");
      setShowForm(false);
      setRating(0);
      setComment("");
      qc.invalidateQueries({ queryKey: ["reviews", productId] });
    },
    onError: (err) => {
      const msg = err?.response?.data?.detail || "Could not submit review.";
      toast.error(msg);
    },
  });

  const reviews    = data?.items || [];
  const total      = data?.total || 0;
  const avgRating  = data?.avg_rating || 0;

  return (
    <div className="mt-20">
      <div className="text-xs uppercase tracking-[0.25em] text-gold mb-2">Customer Reviews</div>
      <div className="flex items-end gap-4 mb-6 flex-wrap">
        <h2 className="font-serif text-2xl text-espresso">
          {total > 0 ? `${total} Review${total !== 1 ? "s" : ""}` : "No Reviews Yet"}
        </h2>
        {total > 0 && (
          <div className="flex items-center gap-2 mb-1">
            <Stars rating={avgRating} />
            <span className="text-sm font-medium text-espresso">{avgRating}</span>
            <span className="text-sm text-taupe">/ 5</span>
          </div>
        )}
      </div>

      {/* Write a review */}
      {isLoggedIn && !showForm && (
        <Button onClick={() => setShowForm(true)} variant="outline"
          className="rounded-full border-espresso text-espresso gap-2 mb-6 hover:bg-rosemist/40">
          <MessageSquare className="w-4 h-4" /> Write a Review
        </Button>
      )}
      {!isLoggedIn && (
        <p className="text-sm text-taupe mb-6">
          <Link to="/login" className="underline underline-offset-2 hover:text-espresso">Sign in</Link> to leave a review.
        </p>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-pearl rounded-2xl border border-gold/15 p-5 mb-6">
            <h3 className="font-medium text-espresso mb-4">Your Review</h3>
            <div className="mb-3">
              <p className="text-xs text-taupe mb-1.5">Rating</p>
              <StarInput value={rating} onChange={setRating} />
            </div>
            <div className="mb-4">
              <p className="text-xs text-taupe mb-1.5">Comment</p>
              <textarea
                rows={3}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Share your experience with this product…"
                className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm text-espresso placeholder:text-taupe/60 focus:outline-none focus:ring-1 focus:ring-gold resize-none"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => submit()} disabled={isPending || rating === 0 || !comment.trim()}
                className="rounded-full bg-espresso text-ivory px-6">
                {isPending ? "Submitting…" : "Submit Review"}
              </Button>
              <Button variant="ghost" onClick={() => { setShowForm(false); setRating(0); setComment(""); }}
                className="rounded-full text-taupe">
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review list */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-24 rounded-2xl bg-rosemist/40 animate-pulse" />)}
        </div>
      )}
      {!isLoading && reviews.length === 0 && (
        <p className="text-taupe text-sm">Be the first to review this product.</p>
      )}
      <div className="space-y-4">
        {reviews.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-pearl rounded-2xl border border-gold/10 p-4">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <p className="text-sm font-medium text-espresso">{r.user_name}</p>
                <p className="text-[11px] text-taupe mt-0.5">
                  {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <Stars rating={r.rating} size="w-3.5 h-3.5" />
            </div>
            <p className="text-sm text-taupe mt-2 leading-relaxed">{r.comment}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggle, isWishlisted } = useWishlist();
  const { toggle: toggleCompare, isComparing, isFull } = useCompare();
  const [qty, setQty]           = useState(1);
  const [added, setAdded]       = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const res = await api.get(`/products/${slug}`);
      return res.data;
    },
    placeholderData: PRODUCTS.find((p) => p.id === slug),
    retry: false,
  });

  const { data: relatedPage } = useQuery({
    queryKey: ["related", product?.category_id],
    queryFn: () =>
      product?.category_id
        ? api.get(`/products?category=${product.category_id}&limit=5`).then(r => r.data)
        : Promise.resolve({ items: [] }),
    enabled: !!product?.category_id,
    placeholderData: {
      items: PRODUCTS.filter(p => p.category_id === product?.category_id).slice(0, 5),
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading && !product) {
    return (
      <div className="min-h-screen bg-ivory">
        <Header />
        <div className="pt-28 max-w-7xl mx-auto px-5 md:px-10 grid md:grid-cols-2 gap-12 animate-pulse">
          <div className="aspect-square rounded-3xl bg-rosemist/60" />
          <div className="space-y-4 pt-4">
            <div className="h-4 bg-rosemist/60 rounded w-1/4" />
            <div className="h-8 bg-rosemist/60 rounded w-3/4" />
            <div className="h-6 bg-rosemist/60 rounded w-1/3" />
            <div className="h-4 bg-rosemist/60 rounded w-full" />
            <div className="h-4 bg-rosemist/60 rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="min-h-screen bg-ivory flex flex-col items-center justify-center gap-4">
        <p className="text-taupe text-lg">Product not found.</p>
        <Button
          onClick={() => navigate("/shop")}
          className="rounded-full bg-espresso text-ivory"
        >
          Back to Shop
        </Button>
      </div>
    );
  }

  const discount = Math.round(((product.mrp - product.price) / product.mrp) * 100);
  const wishlisted = isWishlisted(product.id);

  const handleAddToCart = () => {
    for (let i = 0; i < qty; i++) addToCart(product);
    setAdded(true);
    toast.success(`${product.name} added to cart`);
    setTimeout(() => setAdded(false), 2000);
  };

  const related = (relatedPage?.items || []).filter(p => p.id !== product.id).slice(0, 4);

  return (
    <div className="min-h-screen bg-ivory text-espresso">
      <Seo
        title={product.name}
        description={`${product.name} by ${product.brand || "ZiyaNisa"} — ₹${product.price?.toLocaleString("en-IN")}. ${(product.actives || []).slice(0, 3).join(", ")}`.slice(0, 158)}
        path={`/product/${product.id}`}
        image={product.img}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          image: product.img,
          description: (product.actives || []).join(", ") || product.name,
          brand: { "@type": "Brand", name: product.brand || "ZiyaNisa" },
          offers: {
            "@type": "Offer",
            url: `https://ziyanisa.bilionsales.com/product/${product.id}`,
            priceCurrency: "INR",
            price: product.price,
            availability: "https://schema.org/InStock",
            seller: { "@type": "Organization", name: "M S BILION SALES AND SERVICES" },
          },
        }}
      />
      <Header />
      <main className="pt-24 md:pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          {/* Breadcrumb */}
          <div className="flex items-center flex-wrap gap-1.5 text-xs text-taupe mb-6">
            <Link to="/" className="hover:text-espresso transition">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to="/shop" className="hover:text-espresso transition">Shop</Link>
            {product.category_id && (
              <>
                <ChevronRight className="w-3 h-3" />
                <Link
                  to={`/shop/${product.category_id}`}
                  className="hover:text-espresso transition capitalize"
                >
                  {product.category_id}
                </Link>
              </>
            )}
            <ChevronRight className="w-3 h-3" />
            <span className="text-espresso line-clamp-1">{product.name}</span>
          </div>

          <div className="grid md:grid-cols-2 gap-10 md:gap-16">
            {/* Image gallery */}
            {(() => {
              const allImgs = [product.img, ...(product.images || [])].filter(Boolean);
              const current = allImgs[activeImg] || allImgs[0];
              return (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6 }} className="relative flex flex-col gap-3">

                  {/* Main image */}
                  <div className="relative aspect-square rounded-3xl overflow-hidden bg-rosemist/30 border border-gold/15 group">
                    <AnimatePresence mode="wait">
                      <motion.img key={current} src={current} alt={product.name}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    </AnimatePresence>
                    {discount > 0 && product.in_stock !== false && (
                      <span className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-errorRose/95 text-pearl text-sm font-semibold">
                        -{discount}% OFF
                      </span>
                    )}
                    {product.in_stock === false && (
                      <div className="absolute inset-0 bg-stone-900/40 flex items-center justify-center rounded-3xl">
                        <span className="text-white font-semibold bg-stone-800/80 px-6 py-2.5 rounded-full text-base">
                          Out of Stock
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Thumbnails — only if multiple images */}
                  {allImgs.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {allImgs.map((img, i) => (
                        <button key={i} onClick={() => setActiveImg(i)}
                          className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                            i === activeImg ? "border-espresso shadow-goldGlow" : "border-gold/20 hover:border-gold/60"
                          }`}>
                          <img src={img} alt={`view ${i + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })()}

            {/* Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col"
            >
              <div className="text-xs uppercase tracking-[0.25em] text-gold">
                {product.brand}
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-espresso mt-2 leading-tight">
                {product.name}
              </h1>

              {/* Rating */}
              <div className="mt-3 flex items-center gap-2 text-sm">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(product.rating)
                          ? "fill-gold text-gold"
                          : "text-taupe/40"
                      }`}
                    />
                  ))}
                </div>
                <span className="font-medium">{product.rating}</span>
                <span className="text-taupe">
                  ({product.reviews?.toLocaleString()} reviews)
                </span>
              </div>

              {/* Badges */}
              {product.badges?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {product.badges.map((b) => (
                    <span
                      key={b}
                      className="text-xs px-3 py-1 rounded-full bg-aqua/15 border border-aqua/40 text-espresso"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              )}

              {/* Price */}
              <div className="mt-5 flex items-baseline gap-3">
                <span className="text-3xl font-semibold">
                  ₹{product.price.toLocaleString("en-IN")}
                </span>
                {product.mrp > product.price && (
                  <>
                    <span className="text-taupe text-lg line-through">
                      ₹{product.mrp.toLocaleString("en-IN")}
                    </span>
                    <span className="text-green-600 text-sm font-medium">
                      Save ₹{(product.mrp - product.price).toLocaleString("en-IN")}
                    </span>
                  </>
                )}
              </div>

              {/* Key actives */}
              {product.actives?.length > 0 && (
                <div className="mt-5">
                  <div className="text-xs uppercase tracking-[0.2em] text-taupe mb-2">
                    Key Actives
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.actives.map((a) => (
                      <span
                        key={a}
                        className="text-xs px-3 py-1.5 rounded-full bg-pearl border border-gold/30 text-espresso"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Qty */}
              <div className="mt-6 flex items-center gap-4">
                <span className="text-xs uppercase tracking-[0.2em] text-taupe">
                  Qty
                </span>
                <div className="flex items-center border border-gold/30 rounded-full overflow-hidden">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 grid place-items-center hover:bg-rosemist/60 transition text-espresso text-lg"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-sm font-medium">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty((q) => q + 1)}
                    className="w-10 h-10 grid place-items-center hover:bg-rosemist/60 transition text-espresso text-lg"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* CTAs */}
              <div className="mt-6">
                {product.in_stock === false ? (
                  <div>
                    <div className="flex items-center gap-3 mb-4 p-3 rounded-2xl bg-stone-100 border border-stone-200">
                      <span className="text-sm font-semibold text-red-500">Out of Stock</span>
                      <span className="text-xs text-taupe">— temporarily unavailable</span>
                    </div>
                    <NotifyMeBox productId={product.id} />
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button
                      data-testid="pdp-add-cart"
                      onClick={handleAddToCart}
                      className="flex-1 h-12 rounded-full bg-espresso text-ivory hover:bg-espresso/90 text-base"
                    >
                      {added ? (
                        <><Check className="w-4 h-4 mr-2" /> Added!</>
                      ) : (
                        <><ShoppingBag className="w-4 h-4 mr-2" /> Add to Cart</>
                      )}
                    </Button>
                    <Button
                      data-testid="pdp-wishlist"
                      size="icon"
                      variant="outline"
                      onClick={() => toggle(product)}
                      className={`h-12 w-12 rounded-full border-gold/40 ${wishlisted ? "bg-rosemist" : ""}`}
                    >
                      <Heart className={`w-5 h-5 ${wishlisted ? "fill-espresso text-espresso" : "text-espresso"}`} />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => {
                        if (!isComparing(product.id) && isFull) { toast("Max 3 products in compare"); return; }
                        toggleCompare(product);
                        toast(isComparing(product.id) ? "Removed from compare" : "Added to compare — see bar below");
                      }}
                      title={isComparing(product.id) ? "Remove from compare" : "Compare this product"}
                      className={`h-12 w-12 rounded-full border-gold/40 ${isComparing(product.id) ? "bg-espresso text-ivory border-espresso" : ""}`}
                    >
                      <GitCompareArrows className={`w-5 h-5 ${isComparing(product.id) ? "text-ivory" : "text-espresso"}`} />
                    </Button>
                  </div>
                )}
              </div>

              {/* Trust pills */}
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  "Free delivery above ₹999",
                  "Verified brand",
                  "Easy returns",
                ].map((t) => (
                  <span
                    key={t}
                    className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-full bg-pearl border border-gold/20 text-taupe"
                  >
                    <Check className="w-3 h-3 text-gold" /> {t}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Reviews */}
          <ReviewsSection productId={product.id} />

          {/* Related products */}
          {related.length > 0 && (
            <div className="mt-20">
              <div className="text-xs uppercase tracking-[0.25em] text-gold mb-2">
                You May Also Like
              </div>
              <h2 className="font-serif text-2xl text-espresso mb-8">
                More from this category
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {related.map((p) => (
                  <Link
                    key={p.id}
                    to={`/product/${p.id}`}
                    className="group rounded-2xl overflow-hidden bg-pearl border border-gold/10 hover:border-gold/40 hover:shadow-cardLift transition-all"
                  >
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={p.img}
                        alt={p.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    </div>
                    <div className="p-3">
                      <div className="text-[10px] text-taupe uppercase tracking-[0.18em]">
                        {p.brand}
                      </div>
                      <div className="text-sm font-medium text-espresso mt-0.5 line-clamp-2">
                        {p.name}
                      </div>
                      <div className="text-sm mt-1 font-medium">
                        ₹{p.price.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
