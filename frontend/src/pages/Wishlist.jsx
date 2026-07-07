import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/site/Header";
import Seo from "@/components/site/Seo";
import Footer from "@/components/site/Footer";
import MobileBottomNav from "@/components/site/MobileBottomNav";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

export default function Wishlist() {
  const { items, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-ivory text-espresso">
        <Seo title="My Wishlist" noindex />
      <Header />
        <main className="pt-28 pb-20 flex flex-col items-center justify-center gap-6 px-5 min-h-[60vh]">
          <div className="w-24 h-24 rounded-full bg-rosemist grid place-items-center">
            <Heart className="w-10 h-10 text-taupe" />
          </div>
          <h1 className="font-serif text-2xl text-espresso">
            Your wishlist is empty
          </h1>
          <p className="text-taupe text-center max-w-sm">
            Save your favourites and come back to them anytime.
          </p>
          <Button
            onClick={() => navigate("/shop")}
            className="rounded-full bg-espresso text-ivory px-8 h-12"
          >
            Explore Products
          </Button>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory text-espresso">
      <Seo title="My Wishlist" noindex />
      <Header />
      <main className="pt-24 md:pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <div className="mb-8">
            <div className="text-xs uppercase tracking-[0.25em] text-gold mb-1">
              My Wishlist
            </div>
            <h1 className="font-serif text-3xl md:text-4xl text-espresso">
              Saved <span className="italic font-light">favourites</span>
            </h1>
            <p className="text-taupe text-sm mt-1">
              {items.length} item{items.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="group relative bg-pearl rounded-2xl border border-gold/10 hover:border-gold/40 hover:shadow-cardLift transition-all overflow-hidden"
              >
                {/* Remove button */}
                <button
                  onClick={() => removeFromWishlist(item.id)}
                  aria-label="Remove from wishlist"
                  className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-pearl/90 grid place-items-center hover:bg-errorRose/20 transition"
                >
                  <X className="w-3.5 h-3.5 text-espresso" />
                </button>

                <Link to={`/product/${item.id}`} className="block">
                  <div className="aspect-square overflow-hidden bg-rosemist/30">
                    <img
                      src={item.img}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  <div className="p-3 md:p-4">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-taupe">
                      {item.brand}
                    </div>
                    <h3 className="text-sm font-medium text-espresso mt-0.5 line-clamp-2">
                      {item.name}
                    </h3>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-semibold text-sm">
                        ₹{item.price.toLocaleString("en-IN")}
                      </span>
                      {item.mrp > item.price && (
                        <span className="text-taupe text-xs line-through">
                          ₹{item.mrp.toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>

                <div className="px-3 pb-3 md:px-4 md:pb-4">
                  <Button
                    onClick={() => {
                      addToCart(item);
                      removeFromWishlist(item.id);
                      toast.success(`${item.name} added to cart`);
                    }}
                    className="w-full h-9 rounded-full bg-espresso text-ivory hover:bg-espresso/90 text-xs"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 mr-1" /> Move to Cart
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
