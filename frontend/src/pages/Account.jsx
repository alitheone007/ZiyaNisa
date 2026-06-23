import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { LogOut, Package, ShoppingBag, User, ChevronRight, CheckCircle2, Clock, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import MobileBottomNav from "@/components/site/MobileBottomNav";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import api from "@/lib/api";

const STATUS_MAP = {
  pending_payment:   { label: "Awaiting Payment", color: "text-amber-600 bg-amber-50",  icon: Clock },
  payment_confirmed: { label: "Payment Confirmed", color: "text-green-700 bg-green-50", icon: CheckCircle2 },
  dispatched:        { label: "Dispatched",        color: "text-blue-600 bg-blue-50",   icon: Package },
};

export default function Account() {
  const { user, logout, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("orders");

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["orders-mine"],
    queryFn: () => api.get("/orders/mine").then(r => r.data),
    enabled: isLoggedIn,
    retry: false,
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookings-mine"],
    queryFn: () => api.get("/bookings/mine").then(r => r.data),
    enabled: isLoggedIn,
    retry: false,
  });

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-ivory text-espresso">
        <Header />
        <main className="pt-28 pb-20 flex flex-col items-center justify-center gap-6 px-5 min-h-[60vh]">
          <div className="w-20 h-20 rounded-full bg-rosemist grid place-items-center">
            <User className="w-9 h-9 text-taupe" />
          </div>
          <h1 className="font-serif text-2xl text-espresso">Sign in to your account</h1>
          <p className="text-taupe text-center max-w-sm text-sm">
            Track your orders, save your wishlist, and get personalised recommendations.
          </p>
          <Button onClick={() => navigate("/login", { state: { from: "/account" } })}
            className="rounded-full bg-espresso text-ivory px-8 h-12">
            Sign In / Create Account
          </Button>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  function handleLogout() {
    logout();
    toast.success("Signed out successfully");
    navigate("/");
  }

  const initials = user.name
    ? user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : (user.contact?.replace("@", "").slice(0, 2) ?? "?").toUpperCase();

  return (
    <div className="min-h-screen bg-ivory text-espresso">
      <Header />
      <main className="pt-24 md:pt-28 pb-24">
        <div className="max-w-3xl mx-auto px-5 md:px-10">

          {/* Profile card */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-pearl rounded-2xl border border-gold/15 p-5 md:p-6 flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold to-champagne grid place-items-center shrink-0 shadow-goldGlow">
              <span className="font-serif text-xl text-pearl">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-serif text-xl text-espresso">{user.name || "Your Account"}</h2>
              <p className="text-sm text-taupe truncate">{user.contact}</p>
            </div>
            <Button variant="ghost" onClick={handleLogout}
              className="rounded-full text-taupe hover:text-espresso hover:bg-rosemist/60 gap-1.5 text-sm">
              <LogOut className="w-4 h-4" /> Sign out
            </Button>
          </motion.div>

          {/* Quick links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            {[
              { label: "Shop",      icon: ShoppingBag, to: "/shop" },
              { label: "Wishlist",  icon: Package,     to: "/wishlist" },
              { label: "Cart",      icon: ShoppingBag, to: "/cart" },
            ].map(({ label, icon: Icon, to }) => (
              <Link key={label} to={to}
                className="flex items-center gap-2.5 bg-pearl rounded-xl border border-gold/10 px-4 py-3 hover:border-gold/40 hover:shadow-soft transition group">
                <Icon className="w-4 h-4 text-gold" />
                <span className="text-sm font-medium text-espresso">{label}</span>
                <ChevronRight className="w-4 h-4 text-taupe ml-auto group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-pearl rounded-2xl border border-gold/10 p-1 mb-6">
            {[{ key: "orders", label: "My Orders", icon: Package }, { key: "bookings", label: "My Bookings", icon: Scissors }].map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  tab === key ? "bg-espresso text-ivory shadow-sm" : "text-taupe hover:text-espresso"
                }`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          {/* Orders tab */}
          {tab === "orders" && (
            <div>
              {ordersLoading && (
                <div className="space-y-3">
                  {[1, 2].map(i => <div key={i} className="h-24 rounded-2xl bg-rosemist/40 animate-pulse" />)}
                </div>
              )}
              {!ordersLoading && orders.length === 0 && (
                <div className="text-center py-12 bg-pearl rounded-2xl border border-gold/10">
                  <Package className="w-10 h-10 text-taupe mx-auto mb-3" />
                  <p className="text-taupe text-sm">No orders yet.</p>
                  <Button onClick={() => navigate("/shop")} className="mt-4 rounded-full bg-espresso text-ivory px-6 h-10 text-sm">
                    Start Shopping
                  </Button>
                </div>
              )}
              <div className="space-y-3">
                {orders.map((order, i) => {
                  const st = STATUS_MAP[order.status] || STATUS_MAP.pending_payment;
                  const StatusIcon = st.icon;
                  const total = order.total ?? order.items?.reduce((s, it) => s + it.price * it.qty, 0) ?? 0;
                  return (
                    <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }} className="bg-pearl rounded-2xl border border-gold/10 p-4 md:p-5">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <p className="text-xs text-taupe font-mono">#{order.id?.slice(-8).toUpperCase()}</p>
                          <p className="text-sm text-taupe mt-0.5">
                            {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                          <p className="font-semibold text-espresso mt-1">₹{total.toLocaleString("en-IN")}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${st.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" /> {st.label}
                        </span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gold/10 flex gap-2 flex-wrap">
                        {order.items?.slice(0, 3).map((item, j) => (
                          <span key={j} className="text-xs text-taupe bg-rosemist/40 px-2.5 py-1 rounded-full">
                            {item.name} ×{item.qty}
                          </span>
                        ))}
                        {(order.items?.length ?? 0) > 3 && <span className="text-xs text-taupe">+{order.items.length - 3} more</span>}
                      </div>
                      {order.shipping_address && (
                        <p className="text-[11px] text-taupe mt-2 flex items-start gap-1">
                          <span className="shrink-0">To:</span>
                          <span>
                            {order.shipping_address.full_name}, {order.shipping_address.line1}
                            {order.shipping_address.city ? `, ${order.shipping_address.city}` : ""}
                            {order.shipping_address.pin ? ` — ${order.shipping_address.pin}` : ""}
                          </span>
                        </p>
                      )}
                      {order.upi_ref && (
                        <p className="text-[11px] text-taupe mt-1">UPI Ref: <span className="font-mono">{order.upi_ref}</span></p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bookings tab */}
          {tab === "bookings" && (
            <div>
              {bookingsLoading && (
                <div className="space-y-3">
                  {[1, 2].map(i => <div key={i} className="h-24 rounded-2xl bg-rosemist/40 animate-pulse" />)}
                </div>
              )}
              {!bookingsLoading && bookings.length === 0 && (
                <div className="text-center py-12 bg-pearl rounded-2xl border border-gold/10">
                  <Scissors className="w-10 h-10 text-taupe mx-auto mb-3" />
                  <p className="text-taupe text-sm">No bookings yet.</p>
                  <Button onClick={() => navigate("/services")} className="mt-4 rounded-full bg-espresso text-ivory px-6 h-10 text-sm">
                    Book a Service
                  </Button>
                </div>
              )}
              <div className="space-y-3">
                {bookings.map((b, i) => (
                  <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }} className="bg-pearl rounded-2xl border border-gold/10 p-4 md:p-5">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-medium text-espresso text-sm">{b.service_name}</p>
                        <p className="text-xs text-taupe mt-0.5">
                          {new Date(b.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} · {b.time_slot}
                        </p>
                        <p className="font-semibold text-espresso mt-1">₹{b.service_price?.toLocaleString("en-IN")}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
                        b.status === "confirmed" ? "text-green-700 bg-green-50" :
                        b.status === "completed" ? "text-blue-600 bg-blue-50" :
                        "text-amber-600 bg-amber-50"
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {b.status === "confirmed" ? "Confirmed" : b.status === "completed" ? "Completed" : "Cancelled"}
                      </span>
                    </div>
                    {b.address && (
                      <p className="text-[11px] text-taupe mt-2 pt-2 border-t border-gold/10">
                        {b.address.full_name} · {b.address.line1}, {b.address.city} — {b.address.pin}
                      </p>
                    )}
                  </motion.div>
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
