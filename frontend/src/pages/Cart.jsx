import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import MobileBottomNav from "@/components/site/MobileBottomNav";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

export default function Cart() {
  const { items, updateQty, removeFromCart, totalItems, totalPrice } = useCart();
  const navigate = useNavigate();

  const deliveryFee = totalPrice >= 999 ? 0 : 79;
  const grandTotal = totalPrice + deliveryFee;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-ivory text-espresso">
        <Header />
        <main className="pt-28 pb-20 flex flex-col items-center justify-center gap-6 px-5 min-h-[60vh]">
          <div className="w-24 h-24 rounded-full bg-rosemist grid place-items-center">
            <ShoppingBag className="w-10 h-10 text-taupe" />
          </div>
          <h1 className="font-serif text-2xl text-espresso">
            Your cart is empty
          </h1>
          <p className="text-taupe text-center max-w-sm">
            Looks like you haven't added anything yet. Discover K-Glow beauty
            and at-home salon services.
          </p>
          <Button
            onClick={() => navigate("/shop")}
            className="rounded-full bg-espresso text-ivory px-8 h-12"
          >
            Start Shopping
          </Button>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory text-espresso">
      <Header />
      <main className="pt-24 md:pt-28 pb-20">
        <div className="max-w-6xl mx-auto px-5 md:px-10">
          {/* Header row */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-serif text-3xl md:text-4xl text-espresso">
                Your Cart
              </h1>
              <p className="text-taupe text-sm mt-1">
                {totalItems} item{totalItems !== 1 ? "s" : ""}
              </p>
            </div>
            <Link
              to="/shop"
              className="flex items-center gap-1.5 text-sm text-taupe hover:text-espresso transition"
            >
              <ArrowLeft className="w-4 h-4" /> Continue shopping
            </Link>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Items list */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex gap-4 bg-pearl rounded-2xl p-4 border border-gold/10"
                >
                  <Link to={`/product/${item.id}`}>
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-rosemist/30 shrink-0">
                      <img
                        src={item.img}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-taupe">
                      {item.brand}
                    </div>
                    <h3 className="text-sm font-medium text-espresso line-clamp-2 leading-snug mt-0.5">
                      {item.name}
                    </h3>
                    <div className="mt-3 flex items-center justify-between gap-4 flex-wrap">
                      {/* Qty controls */}
                      <div className="flex items-center border border-gold/30 rounded-full overflow-hidden">
                        <button
                          onClick={() => updateQty(item.id, item.qty - 1)}
                          className="w-8 h-8 grid place-items-center hover:bg-rosemist/60 transition"
                          aria-label="Decrease"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-medium">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => updateQty(item.id, item.qty + 1)}
                          className="w-8 h-8 grid place-items-center hover:bg-rosemist/60 transition"
                          aria-label="Increase"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm">
                          ₹{(item.price * item.qty).toLocaleString("en-IN")}
                        </span>
                        <button
                          onClick={() => {
                            removeFromCart(item.id);
                            toast.success("Removed from cart");
                          }}
                          className="text-taupe hover:text-errorRose transition"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Order summary */}
            <div>
              <div className="bg-pearl rounded-2xl border border-gold/15 p-6 sticky top-28">
                <h2 className="font-serif text-xl text-espresso mb-4">
                  Order Summary
                </h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-taupe">
                    <span>Subtotal ({totalItems} items)</span>
                    <span>₹{totalPrice.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-taupe">
                    <span>Delivery</span>
                    <span
                      className={deliveryFee === 0 ? "text-green-600 font-medium" : ""}
                    >
                      {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
                    </span>
                  </div>
                  {/* Free shipping progress */}
                  {deliveryFee > 0 ? (
                    <div className="bg-rosemist/30 rounded-xl p-3 space-y-2">
                      <p className="text-xs text-taupe flex justify-between">
                        <span>Add <span className="text-espresso font-semibold">₹{(999 - totalPrice).toLocaleString("en-IN")}</span> for free delivery</span>
                        <span className="text-espresso font-medium">{Math.round((totalPrice / 999) * 100)}%</span>
                      </p>
                      <div className="h-1.5 bg-gold/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-gold to-champagne rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (totalPrice / 999) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-green-600 bg-green-50 rounded-xl px-3 py-2 font-medium">
                      You've unlocked free delivery!
                    </p>
                  )}
                  <div className="border-t border-gold/15 pt-3 flex justify-between font-semibold text-espresso text-base">
                    <span>Total</span>
                    <span>₹{grandTotal.toLocaleString("en-IN")}</span>
                  </div>
                </div>
                <Button
                  onClick={() => navigate("/checkout")}
                  className="w-full mt-6 h-12 rounded-full bg-espresso text-ivory hover:bg-espresso/90"
                >
                  Proceed to Checkout{" "}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <p className="text-center text-xs text-taupe mt-3">
                  Pay via UPI · Verified by our team
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
