import { motion } from "framer-motion";
import { Star, ShoppingBag, Eye, Heart, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PRODUCTS } from "@/data/seed";
import { SectionHead } from "./CategoryGrid";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { toast } from "sonner";

export default function ProductTeaser() {
  const navigate = useNavigate();

  return (
    <section data-testid="products-teaser" id="products" className="py-20 md:py-28 bg-gradient-to-b from-ivory via-rosemist/30 to-ivory">
      <div className="max-w-7xl mx-auto px-5 md:px-10">
        <SectionHead
          overline="K-Glow Picks"
          title={<>Clean actives, <span className="italic font-light">graceful results</span></>}
          subtitle="Eight editorial favourites from our verified brand partners — original formulations, derm-backed."
          action={
            <Button
              data-testid="see-all-products"
              variant="ghost"
              className="rounded-full text-espresso hover:bg-rosemist/70 group"
              onClick={() => navigate("/shop")}
            >
              View all
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition" />
            </Button>
          }
        />

        <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {PRODUCTS.map((p, i) => (
            <ProductCard key={p.id} p={p} delay={(i % 4) * 0.07} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductCard({ p, delay }) {
  const { addToCart } = useCart();
  const { toggle, isWishlisted } = useWishlist();
  const discount = Math.round(((p.mrp - p.price) / p.mrp) * 100);
  const wishlisted = isWishlisted(p.id);

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -8 }}
      className="group relative bg-pearl rounded-2xl border border-gold/10 hover:border-gold/40 hover:shadow-cardLift transition-all overflow-hidden"
      data-testid={`product-${p.id}`}
    >
      {/* Image */}
      <Link to={`/product/${p.id}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-rosemist/40">
          <img
            src={p.img}
            alt={p.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
          />

          {/* Top badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
            {p.badges.slice(0, 1).map((b) => (
              <span key={b} className="text-[10px] uppercase tracking-[0.16em] px-2 py-1 rounded-full bg-pearl/90 text-espresso border border-gold/30">
                {b}
              </span>
            ))}
          </div>
          {discount > 0 && (
            <span className="absolute top-2.5 right-2.5 text-[10px] font-semibold px-2 py-1 rounded-full bg-errorRose/95 text-pearl">
              -{discount}%
            </span>
          )}

          {/* Quick actions overlay */}
          <div className="absolute inset-x-2.5 bottom-2.5 flex items-center gap-1.5 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
            <Button
              data-testid={`add-${p.id}`}
              onClick={(e) => {
                e.preventDefault();
                addToCart(p);
                toast.success(`${p.name} added to cart`);
              }}
              className="flex-1 h-9 rounded-full bg-espresso text-ivory hover:bg-espresso/90 text-xs"
            >
              <ShoppingBag className="w-3.5 h-3.5 mr-1" /> Add
            </Button>
            <Button
              data-testid={`quick-${p.id}`}
              size="icon"
              variant="outline"
              className="h-9 w-9 rounded-full border-gold/40 bg-pearl/95"
              asChild
            >
              <Link to={`/product/${p.id}`}>
                <Eye className="w-3.5 h-3.5 text-espresso" />
              </Link>
            </Button>
            <Button
              data-testid={`save-${p.id}`}
              size="icon"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                toggle(p);
              }}
              className={`h-9 w-9 rounded-full border-gold/40 ${wishlisted ? "bg-rosemist" : "bg-pearl/95"}`}
            >
              <Heart className={`w-3.5 h-3.5 text-espresso ${wishlisted ? "fill-espresso" : ""}`} />
            </Button>
          </div>

          {/* Floating actives capsules */}
          <div className="absolute left-2.5 bottom-14 flex flex-col gap-1 opacity-0 -translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500">
            {p.actives.slice(0, 2).map((a) => (
              <span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-aqua/15 text-espresso border border-aqua/40 backdrop-blur">
                {a}
              </span>
            ))}
          </div>
        </div>
      </Link>

      {/* Body */}
      <Link to={`/product/${p.id}`} className="block p-3 md:p-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-taupe">{p.brand}</div>
        <h3 className="text-sm md:text-base font-medium text-espresso mt-0.5 line-clamp-2 leading-snug">{p.name}</h3>
        <div className="mt-2 flex items-center gap-1 text-xs">
          <Star className="w-3.5 h-3.5 fill-gold text-gold" />
          <span className="text-espresso font-medium">{p.rating}</span>
          <span className="text-taupe">({p.reviews})</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-espresso font-semibold">₹{p.price.toLocaleString("en-IN")}</span>
          <span className="text-taupe text-xs line-through">₹{p.mrp.toLocaleString("en-IN")}</span>
        </div>
      </Link>

      {/* Shimmer border on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 rounded-2xl border border-gold/40" />
      </div>
    </motion.article>
  );
}
