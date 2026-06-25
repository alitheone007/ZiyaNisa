import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut, Package, ShoppingBag, User, ChevronRight, CheckCircle2,
  Clock, Scissors, MapPin, Trash2, Star, RefreshCw, Home, Briefcase, MapPinned,
  Plus, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import MobileBottomNav from "@/components/site/MobileBottomNav";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import api from "@/lib/api";

const STATUS_MAP = {
  pending_payment:   { label: "Awaiting Payment",   color: "text-amber-600 bg-amber-50",  icon: Clock },
  payment_confirmed: { label: "Payment Confirmed",  color: "text-green-700 bg-green-50",  icon: CheckCircle2 },
  dispatched:        { label: "Dispatched",          color: "text-blue-600 bg-blue-50",    icon: Package },
  delivered:         { label: "Delivered",           color: "text-green-700 bg-green-50",  icon: CheckCircle2 },
  cancelled:         { label: "Cancelled",           color: "text-red-500 bg-red-50",      icon: Clock },
};

const LABEL_ICON = { Home, Work: Briefcase, Other: MapPinned };

const INDIA_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan",
  "Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Delhi","Jammu & Kashmir","Ladakh","Puducherry","Chandigarh",
];

const ADDR_LABELS = ["Home", "Work", "Other"];

export default function Account() {
  const { user, logout, isLoggedIn } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const qc = useQueryClient();
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

  const { data: addresses = [], isLoading: addrsLoading } = useQuery({
    queryKey: ["addresses"],
    queryFn: () => api.get("/addresses").then(r => r.data),
    enabled: isLoggedIn,
    retry: false,
  });

  const deleteAddr = useMutation({
    mutationFn: id => api.delete(`/addresses/${id}`),
    onSuccess: () => qc.invalidateQueries(["addresses"]),
    onError: () => toast.error("Could not delete address"),
  });

  const setDefault = useMutation({
    mutationFn: id => api.patch(`/addresses/${id}/default`),
    onSuccess: () => qc.invalidateQueries(["addresses"]),
  });

  const [pendingRatings, setPendingRatings] = useState({});
  const rateBooking = useMutation({
    mutationFn: ({ id, rating, comment }) => api.patch(`/bookings/${id}/rate`, { rating, comment }),
    onSuccess: () => {
      toast.success("Thank you for your feedback!");
      qc.invalidateQueries(["bookings-mine"]);
    },
    onError: err => toast.error(err?.response?.data?.detail || "Could not submit rating"),
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

  function reorder(order) {
    (order.items || []).forEach(item => addItem({ id: item.id, name: item.name, brand: item.brand || "", price: item.price, img: item.img || "" }));
    toast.success(`${order.items?.length || 0} item${order.items?.length > 1 ? "s" : ""} added to cart`);
    navigate("/cart");
  }

  const initials = user.name
    ? user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : (user.contact?.replace("@", "").slice(0, 2) ?? "?").toUpperCase();

  const TABS = [
    { key: "orders",    label: "Orders",    icon: Package },
    { key: "bookings",  label: "Bookings",  icon: Scissors },
    { key: "addresses", label: "Addresses", icon: MapPin },
  ];

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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { label: "Shop",       icon: ShoppingBag, to: "/shop" },
              { label: "Wishlist",   icon: Package,     to: "/wishlist" },
              { label: "Skin Quiz",  icon: Sparkles,    to: "/skin-quiz" },
              { label: "Cart",       icon: ShoppingBag, to: "/cart" },
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
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  tab === key ? "bg-espresso text-ivory shadow-sm" : "text-taupe hover:text-espresso"
                }`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* ── Orders tab ── */}
            {tab === "orders" && (
              <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {ordersLoading && (
                  <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 rounded-2xl bg-rosemist/40 animate-pulse" />)}</div>
                )}
                {!ordersLoading && orders.length === 0 && (
                  <div className="text-center py-12 bg-pearl rounded-2xl border border-gold/10">
                    <Package className="w-10 h-10 text-taupe mx-auto mb-3" />
                    <p className="text-taupe text-sm">No orders yet.</p>
                    <Button onClick={() => navigate("/shop")} className="mt-4 rounded-full bg-espresso text-ivory px-6 h-10 text-sm">Start Shopping</Button>
                  </div>
                )}
                <div className="space-y-3">
                  {orders.map((order, i) => {
                    const st = STATUS_MAP[order.status] || STATUS_MAP.pending_payment;
                    const StatusIcon = st.icon;
                    const total = order.total ?? 0;
                    return (
                      <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }} className="bg-pearl rounded-2xl border border-gold/10 p-4 md:p-5">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <p className="text-xs text-taupe font-mono">#{order.id?.slice(-8).toUpperCase()}</p>
                            <p className="text-sm text-taupe mt-0.5">
                              {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="font-semibold text-espresso">₹{total.toLocaleString("en-IN")}</p>
                              {order.discount > 0 && (
                                <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                                  saved ₹{order.discount}
                                </span>
                              )}
                            </div>
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
                            <span>{order.shipping_address.full_name}, {order.shipping_address.line1}{order.shipping_address.city ? `, ${order.shipping_address.city}` : ""}{order.shipping_address.pin ? ` — ${order.shipping_address.pin}` : ""}</span>
                          </p>
                        )}
                        <div className="mt-3 pt-3 border-t border-gold/10 flex items-center justify-between gap-3">
                          <Link to={`/orders/${order.id}`}
                            className="text-xs font-medium text-espresso underline underline-offset-2 hover:text-gold transition">
                            View full order →
                          </Link>
                          <button onClick={() => reorder(order)}
                            className="inline-flex items-center gap-1.5 text-xs text-taupe hover:text-espresso transition border border-gold/20 rounded-full px-3 py-1.5 hover:border-gold/50">
                            <RefreshCw className="w-3 h-3" /> Reorder
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── Bookings tab ── */}
            {tab === "bookings" && (
              <motion.div key="bookings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {bookingsLoading && (
                  <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 rounded-2xl bg-rosemist/40 animate-pulse" />)}</div>
                )}
                {!bookingsLoading && bookings.length === 0 && (
                  <div className="text-center py-12 bg-pearl rounded-2xl border border-gold/10">
                    <Scissors className="w-10 h-10 text-taupe mx-auto mb-3" />
                    <p className="text-taupe text-sm">No bookings yet.</p>
                    <Button onClick={() => navigate("/services")} className="mt-4 rounded-full bg-espresso text-ivory px-6 h-10 text-sm">Book a Service</Button>
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
                          b.status === "completed" ? "text-blue-600 bg-blue-50" : "text-amber-600 bg-amber-50"
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
                      {b.status === "completed" && (
                        <div className="mt-3 pt-3 border-t border-gold/10">
                          {b.rating ? (
                            <p className="text-xs text-taupe flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-gold text-gold" />
                              You rated this {b.rating}/5
                            </p>
                          ) : (
                            <div>
                              <p className="text-xs text-taupe mb-2">Rate your experience</p>
                              <div className="flex items-center gap-1 mb-2">
                                {[1,2,3,4,5].map(n => (
                                  <button key={n} onClick={() => setPendingRatings(p => ({ ...p, [b.id]: { ...p[b.id], star: n } }))}
                                    className="focus:outline-none">
                                    <Star className={`w-6 h-6 transition-colors ${
                                      (pendingRatings[b.id]?.star || 0) >= n ? "fill-gold text-gold" : "text-stone-300"}`} />
                                  </button>
                                ))}
                              </div>
                              {pendingRatings[b.id]?.star > 0 && (
                                <div className="flex gap-2 mt-1">
                                  <input
                                    type="text"
                                    placeholder="Optional comment…"
                                    value={pendingRatings[b.id]?.comment || ""}
                                    onChange={e => setPendingRatings(p => ({ ...p, [b.id]: { ...p[b.id], comment: e.target.value } }))}
                                    className="flex-1 text-xs border border-gold/30 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gold bg-ivory"
                                  />
                                  <button
                                    onClick={() => rateBooking.mutate({ id: b.id, rating: pendingRatings[b.id].star, comment: pendingRatings[b.id].comment || "" })}
                                    disabled={rateBooking.isPending}
                                    className="text-xs bg-espresso text-ivory px-3 py-1.5 rounded-lg disabled:opacity-50">
                                    Submit
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Addresses tab ── */}
            {tab === "addresses" && (
              <motion.div key="addresses" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AddressBook
                  addresses={addresses}
                  isLoading={addrsLoading}
                  onDelete={id => deleteAddr.mutate(id)}
                  onSetDefault={id => setDefault.mutate(id)}
                  onRefresh={() => qc.invalidateQueries(["addresses"])}
                />
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}

// ── Address Book sub-component ────────────────────────────────────────────────
function AddressBook({ addresses, isLoading, onDelete, onSetDefault, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "Home", full_name: "", phone: "", line1: "", line2: "", city: "", state: "", pin: "", is_default: false });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  async function saveAddress() {
    for (const f of ["full_name","phone","line1","city","state","pin"]) {
      if (!form[f]?.trim()) { toast.error(`Please fill in: ${f.replace("_"," ")}`); return; }
    }
    setSaving(true);
    try {
      await api.post("/addresses", form);
      onRefresh();
      setShowForm(false);
      setForm({ label:"Home",full_name:"",phone:"",line1:"",line2:"",city:"",state:"",pin:"",is_default:false });
      toast.success("Address saved");
    } catch { toast.error("Could not save address"); }
    finally { setSaving(false); }
  }

  if (isLoading) {
    return <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 rounded-2xl bg-rosemist/40 animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-3">
      {addresses.length === 0 && !showForm && (
        <div className="text-center py-12 bg-pearl rounded-2xl border border-gold/10">
          <MapPin className="w-10 h-10 text-taupe mx-auto mb-3" />
          <p className="text-taupe text-sm mb-4">No saved addresses yet.</p>
          <Button onClick={() => setShowForm(true)} className="rounded-full bg-espresso text-ivory px-6 h-10 text-sm gap-2">
            <Plus className="w-4 h-4" /> Add Address
          </Button>
        </div>
      )}

      {addresses.map((addr, i) => {
        const Icon = LABEL_ICON[addr.label] || MapPin;
        return (
          <motion.div key={addr.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="bg-pearl rounded-2xl border border-gold/10 p-4 flex gap-3">
            <div className="w-10 h-10 rounded-full bg-rosemist/50 grid place-items-center shrink-0">
              <Icon className="w-5 h-5 text-taupe" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-espresso">{addr.label}</span>
                {addr.is_default && (
                  <span className="text-[10px] bg-gold/20 text-espresso px-2 py-0.5 rounded-full font-medium">Default</span>
                )}
              </div>
              <p className="text-xs text-taupe mt-0.5">{addr.full_name} · {addr.phone}</p>
              <p className="text-xs text-taupe mt-0.5">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p>
              <p className="text-xs text-taupe">{addr.city}, {addr.state} — {addr.pin}</p>
              <div className="flex items-center gap-3 mt-2">
                {!addr.is_default && (
                  <button onClick={() => onSetDefault(addr.id)}
                    className="text-xs text-taupe hover:text-espresso transition underline underline-offset-2">
                    Set as default
                  </button>
                )}
                <button onClick={() => onDelete(addr.id)}
                  className="text-xs text-red-400 hover:text-red-600 transition flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* Add new address */}
      {!showForm ? (
        <button onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 border border-dashed border-gold/30 rounded-2xl py-4 text-sm text-taupe hover:text-espresso hover:border-gold/60 transition">
          <Plus className="w-4 h-4" /> Add New Address
        </button>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-pearl rounded-2xl border border-gold/15 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-espresso">New Address</h3>
            <button onClick={() => setShowForm(false)} className="text-taupe hover:text-espresso transition text-xs">Cancel</button>
          </div>

          {/* Label selector */}
          <div className="flex gap-2">
            {ADDR_LABELS.map(l => (
              <button key={l} onClick={() => set("label", l)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${form.label === l ? "bg-espresso text-ivory border-espresso" : "border-gold/25 text-taupe hover:border-espresso hover:text-espresso"}`}>
                {l}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <AddrField label="Full Name" required>
              <Input value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="Ziya Nisa" className="h-10 rounded-xl border-gold/25" />
            </AddrField>
            <AddrField label="Phone" required>
              <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="9876543210" inputMode="tel" className="h-10 rounded-xl border-gold/25" />
            </AddrField>
          </div>
          <AddrField label="Address Line 1" required>
            <Input value={form.line1} onChange={e => set("line1", e.target.value)} placeholder="House / Building / Street" className="h-10 rounded-xl border-gold/25" />
          </AddrField>
          <AddrField label="Address Line 2">
            <Input value={form.line2} onChange={e => set("line2", e.target.value)} placeholder="Area / Locality (optional)" className="h-10 rounded-xl border-gold/25" />
          </AddrField>
          <div className="grid sm:grid-cols-3 gap-4">
            <AddrField label="City" required>
              <Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Hyderabad" className="h-10 rounded-xl border-gold/25" />
            </AddrField>
            <AddrField label="State" required>
              <select value={form.state} onChange={e => set("state", e.target.value)}
                className="w-full h-10 rounded-xl border border-gold/25 bg-ivory px-3 text-sm text-espresso focus:outline-none focus:border-espresso/50 transition">
                <option value="">Select</option>
                {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </AddrField>
            <AddrField label="PIN" required>
              <Input value={form.pin} onChange={e => set("pin", e.target.value)} placeholder="500001" inputMode="numeric" maxLength={6} className="h-10 rounded-xl border-gold/25" />
            </AddrField>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={form.is_default} onChange={e => set("is_default", e.target.checked)} className="w-4 h-4 accent-espresso rounded" />
            <span className="text-sm text-espresso">Set as default address</span>
          </label>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1 h-10 rounded-full border-gold/40 text-espresso">Cancel</Button>
            <Button onClick={saveAddress} disabled={saving} className="flex-1 h-10 rounded-full bg-espresso text-ivory hover:bg-espresso/90 text-sm">
              {saving ? "Saving…" : "Save Address"}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function AddrField({ label, required, children }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-[0.16em] text-taupe mb-1 block">
        {label}{required && <span className="text-errorRose ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
