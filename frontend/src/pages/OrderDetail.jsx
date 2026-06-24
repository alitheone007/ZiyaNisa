import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Package, ChevronRight, CheckCircle2, Clock, Truck, XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import MobileBottomNav from "@/components/site/MobileBottomNav";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

const STATUS_STEPS = [
  { key: "pending_payment",   label: "Order Placed",       icon: Clock },
  { key: "payment_confirmed", label: "Payment Confirmed",  icon: CheckCircle2 },
  { key: "dispatched",        label: "Dispatched",         icon: Truck },
  { key: "delivered",         label: "Delivered",          icon: Package },
];

const STATUS_META = {
  pending_payment:   { label: "Awaiting Payment", color: "text-amber-600 bg-amber-50 border-amber-200" },
  payment_confirmed: { label: "Payment Confirmed", color: "text-blue-600 bg-blue-50 border-blue-200" },
  dispatched:        { label: "Dispatched",        color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  delivered:         { label: "Delivered",         color: "text-green-700 bg-green-50 border-green-200" },
  cancelled:         { label: "Cancelled",         color: "text-red-600 bg-red-50 border-red-200" },
};

function StatusTimeline({ status }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
        <XCircle className="w-5 h-5" /> This order was cancelled.
      </div>
    );
  }
  const currentIdx = STATUS_STEPS.findIndex(s => s.key === status);
  return (
    <div className="flex items-start gap-0">
      {STATUS_STEPS.map((step, i) => {
        const done    = i <= currentIdx;
        const current = i === currentIdx;
        const Icon    = step.icon;
        return (
          <div key={step.key} className="flex-1 flex flex-col items-center relative">
            {i < STATUS_STEPS.length - 1 && (
              <div className={`absolute top-4 left-1/2 w-full h-0.5 ${i < currentIdx ? "bg-espresso" : "bg-stone-200"}`} />
            )}
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 ${
              done ? "border-espresso bg-espresso" : "border-stone-300 bg-white"
            } ${current ? "ring-2 ring-offset-2 ring-espresso" : ""}`}>
              <Icon className={`w-4 h-4 ${done ? "text-white" : "text-stone-400"}`} />
            </div>
            <p className={`text-[10px] mt-1.5 text-center leading-tight px-1 ${done ? "text-espresso font-medium" : "text-taupe"}`}>
              {step.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function OrderDetail() {
  const { orderId } = useParams();
  const navigate    = useNavigate();
  const { isLoggedIn } = useAuth();

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => api.get(`/orders/${orderId}`).then(r => r.data),
    enabled: isLoggedIn && !!orderId,
    retry: false,
  });

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-ivory">
        <Header />
        <main className="pt-28 pb-20 flex flex-col items-center justify-center gap-4">
          <p className="text-taupe">Please sign in to view your order.</p>
          <Button onClick={() => navigate("/login")} className="rounded-full bg-espresso text-ivory px-6">
            Sign In
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ivory">
        <Header />
        <main className="pt-28 pb-20 max-w-2xl mx-auto px-5 space-y-4 animate-pulse">
          <div className="h-6 w-32 bg-rosemist/50 rounded" />
          <div className="h-40 bg-rosemist/50 rounded-2xl" />
          <div className="h-60 bg-rosemist/50 rounded-2xl" />
        </main>
        <Footer />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="min-h-screen bg-ivory">
        <Header />
        <main className="pt-28 pb-20 flex flex-col items-center justify-center gap-4">
          <p className="text-taupe">Order not found.</p>
          <Button onClick={() => navigate("/account")} className="rounded-full bg-espresso text-ivory px-6">
            Back to Account
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const meta      = STATUS_META[order.status] || STATUS_META.pending_payment;
  const subtotal  = order.items?.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0) ?? order.total;
  const shipping  = subtotal >= 999 ? 0 : 49;
  const dateStr   = order.created_at
    ? new Date(order.created_at).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "—";

  return (
    <div className="min-h-screen bg-ivory text-espresso">
      <Header />

      <main className="pt-24 md:pt-28 pb-24">
        <div className="max-w-2xl mx-auto px-5">

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-taupe mb-6 flex-wrap">
            <Link to="/" className="hover:text-espresso transition">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to="/account" className="hover:text-espresso transition">Account</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-espresso">Order #{order.id?.slice(-8).toUpperCase()}</span>
          </div>

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

            {/* Header card */}
            <div className="bg-pearl rounded-2xl border border-gold/15 p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs text-taupe font-mono uppercase tracking-wider">
                    Order #{order.id?.slice(-8).toUpperCase()}
                  </p>
                  <p className="text-sm text-taupe mt-0.5">{dateStr}</p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${meta.color}`}>
                  {meta.label}
                </span>
              </div>

              {/* Status timeline */}
              <div className="mt-6">
                <StatusTimeline status={order.status} />
              </div>

              {order.upi_ref && (
                <p className="text-xs text-taupe mt-4 pt-3 border-t border-gold/10">
                  UPI Reference: <span className="font-mono text-espresso">{order.upi_ref}</span>
                </p>
              )}
              {order.tracking_url && (
                <div className="mt-4 pt-3 border-t border-gold/10">
                  <a href={order.tracking_url} target="_blank" rel="noopener noreferrer">
                    <Button className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-9 text-sm px-5">
                      <Truck className="w-4 h-4" /> Track Your Order
                    </Button>
                  </a>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="bg-pearl rounded-2xl border border-gold/15 p-5">
              <h2 className="font-medium text-espresso mb-4">
                Items ({order.items?.length || 0})
              </h2>
              <div className="space-y-4">
                {order.items?.map((item, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    {item.img ? (
                      <img src={item.img} alt={item.name}
                        className="w-16 h-16 rounded-xl object-cover shrink-0 border border-gold/10" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-rosemist/40 shrink-0 grid place-items-center">
                        <Package className="w-6 h-6 text-taupe" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-espresso leading-snug line-clamp-2">{item.name}</p>
                      {item.brand && <p className="text-xs text-taupe mt-0.5">{item.brand}</p>}
                      <p className="text-xs text-taupe mt-0.5">Qty: {item.qty || 1}</p>
                    </div>
                    <p className="text-sm font-semibold text-espresso shrink-0">
                      ₹{((item.price || 0) * (item.qty || 1)).toLocaleString("en-IN")}
                    </p>
                  </div>
                ))}
              </div>

              {/* Price breakdown */}
              <div className="mt-4 pt-4 border-t border-gold/10 space-y-2">
                <div className="flex justify-between text-sm text-taupe">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm text-taupe">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? <span className="text-green-600">Free</span> : `₹${shipping}`}</span>
                </div>
                <div className="flex justify-between font-semibold text-espresso pt-2 border-t border-gold/10">
                  <span>Total</span>
                  <span>₹{(order.total ?? subtotal + shipping).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* Addresses */}
            {(order.shipping_address || order.billing_address) && (
              <div className="bg-pearl rounded-2xl border border-gold/15 p-5">
                <h2 className="font-medium text-espresso mb-3">Delivery Details</h2>
                {order.shipping_address && (
                  <div className="text-sm text-taupe leading-relaxed">
                    <p className="font-medium text-espresso">{order.shipping_address.full_name}</p>
                    <p>{order.shipping_address.line1}</p>
                    {order.shipping_address.line2 && <p>{order.shipping_address.line2}</p>}
                    <p>
                      {[order.shipping_address.city, order.shipping_address.state, order.shipping_address.pin]
                        .filter(Boolean).join(", ")}
                    </p>
                    {order.shipping_address.phone && (
                      <p className="mt-1">📞 {order.shipping_address.phone}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 flex-wrap">
              <Button onClick={() => navigate("/account")} variant="outline"
                className="rounded-full border-stone-300 text-espresso gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Orders
              </Button>
              <Button onClick={() => navigate("/shop")}
                className="rounded-full bg-espresso text-ivory gap-2">
                Continue Shopping
              </Button>
              {order.tracking_url && (
                <Button asChild className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                  <a href={order.tracking_url} target="_blank" rel="noopener noreferrer">
                    <Truck className="w-4 h-4" /> Track Order
                  </a>
                </Button>
              )}
            </div>

          </motion.div>
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
