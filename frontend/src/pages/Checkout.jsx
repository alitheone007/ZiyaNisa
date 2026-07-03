import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Copy, ArrowLeft, Smartphone, AlertCircle, MapPin,
  Tag, Sparkles, X, Home, Briefcase, MapPinned, RotateCcw,
  Upload, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import MobileBottomNav from "@/components/site/MobileBottomNav";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import api from "@/lib/api";

const UPI_ID   = "biliion@indianbnk";
const MERCHANT = "MS BILIION SALES AND SERVICES";

function buildUpiUrl(amount) {
  return `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(MERCHANT)}&cu=INR&am=${amount}`;
}

function buildQrUrl(amount) {
  const data = encodeURIComponent(buildUpiUrl(amount));
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&color=3d2314&bgcolor=fdf8f4&data=${data}`;
}

const INDIA_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan",
  "Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Delhi","Jammu & Kashmir","Ladakh","Puducherry","Chandigarh",
];

const STEP_LABELS = ["Review", "Delivery", "Pay via UPI", "Confirm Order"];

const LABEL_ICON = { Home, Work: Briefcase, Other: MapPinned };

// ── Coupon box ────────────────────────────────────────────────────────────────
function CouponBox({ subtotal, appliedCoupon, onApply, onRemove }) {
  const { isLoggedIn } = useAuth();
  const [code, setCode]      = useState("");
  const [loading, setLoad]   = useState(false);
  const [bestLoad, setBL]    = useState(false);
  const [errMsg, setErr]     = useState("");

  async function apply(overrideCode) {
    const target = (overrideCode || code).trim().toUpperCase();
    if (!target) return;
    setLoad(true); setErr("");
    try {
      const res = await api.post("/coupons/validate", { code: target, total: subtotal });
      onApply(res.data);
      setCode("");
      toast.success(`${res.data.label} applied!`);
    } catch (err) {
      setErr(err?.response?.data?.detail || "Coupon not found or expired");
    } finally { setLoad(false); }
  }

  async function findBest() {
    setBL(true);
    try {
      const res = await api.get(`/coupons/best?total=${subtotal}`);
      if (res.data) {
        onApply(res.data);
        toast.success(`Best offer applied: ${res.data.code} — ${res.data.label}`);
      } else {
        toast("No better offer available for this order");
      }
    } catch { toast("Couldn't fetch offers right now"); }
    finally { setBL(false); }
  }

  if (appliedCoupon) {
    return (
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-semibold text-sm">{appliedCoupon.code}</span>
          <span className="text-xs text-green-600">{appliedCoupon.label}</span>
        </div>
        <button onClick={onRemove} className="text-green-600 hover:text-red-500 transition p-1">
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-taupe" />
          <Input
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setErr(""); }}
            onKeyDown={e => e.key === "Enter" && apply()}
            placeholder="PROMO CODE"
            className="pl-9 h-10 rounded-xl border-gold/30 bg-ivory text-espresso placeholder:text-taupe/50 font-mono text-sm tracking-widest"
          />
        </div>
        <Button onClick={() => apply()} disabled={!code.trim() || loading}
          className="h-10 px-4 rounded-xl bg-espresso text-ivory text-sm shrink-0 hover:bg-espresso/90">
          {loading ? "…" : "Apply"}
        </Button>
      </div>
      {errMsg && <p className="text-xs text-red-500 pl-1">{errMsg}</p>}
      {isLoggedIn && (
        <button onClick={findBest} disabled={bestLoad}
          className="flex items-center gap-1.5 text-xs text-gold hover:text-espresso transition font-medium pl-1">
          <Sparkles className="w-3.5 h-3.5" />
          {bestLoad ? "Finding best offer…" : "Find best offer for me"}
        </button>
      )}
    </div>
  );
}

// ── Saved address picker ──────────────────────────────────────────────────────
function SavedAddressPicker({ addresses, selectedId, onSelect, onAddNew }) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.18em] text-taupe font-medium">Your Saved Addresses</p>
      {addresses.map(addr => {
        const Icon = LABEL_ICON[addr.label] || MapPin;
        const active = selectedId === addr.id;
        return (
          <button key={addr.id} onClick={() => onSelect(addr)}
            className={`w-full flex items-start gap-3 rounded-xl border-2 p-3.5 text-left transition-all ${
              active ? "border-espresso bg-espresso/5" : "border-gold/20 bg-ivory/60 hover:border-gold/50"
            }`}>
            <div className={`w-8 h-8 rounded-full grid place-items-center shrink-0 mt-0.5 ${active ? "bg-espresso text-ivory" : "bg-rosemist/60 text-taupe"}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-espresso">{addr.label}</span>
                {addr.is_default && (
                  <span className="text-[10px] bg-gold/20 text-espresso px-1.5 py-0.5 rounded-full">Default</span>
                )}
              </div>
              <p className="text-xs text-taupe mt-0.5 line-clamp-1">
                {addr.full_name} · {addr.line1}, {addr.city} — {addr.pin}
              </p>
            </div>
            <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-1 ${active ? "border-espresso bg-espresso" : "border-gold/40"}`} />
          </button>
        );
      })}
      <button onClick={onAddNew}
        className="w-full text-xs text-taupe hover:text-espresso transition py-2 border border-dashed border-gold/30 rounded-xl hover:border-gold/60">
        + Enter a different address
      </button>
    </div>
  );
}

// Steps: 0=review, 1=delivery, 2=pay, 3=confirm, 4=done
export default function Checkout() {
  const { items, totalPrice, clearCart } = useCart();
  const { user, updateUser, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [step,       setStep]       = useState(0);
  const [upiRef,     setUpiRef]     = useState("");
  const [orderId,    setOrderId]    = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Payment confirmation state
  const [txnId,             setTxnId]             = useState("");
  const [screenshot,        setScreenshot]        = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);

  // Coupon
  const [coupon, setCoupon] = useState(null);

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddrId, setSelectedAddrId] = useState(null);
  const [showNewForm, setShowNewForm]        = useState(true);
  const [saveAddr, setSaveAddr]              = useState(false);

  const [ship, setShip] = useState({
    full_name: user?.name || "", phone: "", line1: "", line2: "", city: "", state: "", pin: "",
  });
  const [sameAddress, setSameAddress] = useState(true);
  const [bill, setBill] = useState({ full_name:"",phone:"",line1:"",line2:"",city:"",state:"",pin:"" });

  useEffect(() => {
    if (!isLoggedIn) return;
    api.get("/addresses").then(r => {
      const addrs = r.data || [];
      setSavedAddresses(addrs);
      if (addrs.length > 0) {
        const def = addrs.find(a => a.is_default) || addrs[0];
        setSelectedAddrId(def.id);
        setShip({ full_name:def.full_name,phone:def.phone,line1:def.line1,line2:def.line2||"",city:def.city,state:def.state,pin:def.pin });
        setShowNewForm(false);
      }
    }).catch(() => {});
  }, [isLoggedIn]);

  const deliveryFee = totalPrice >= 999 ? 0 : 79;
  const discount    = coupon?.discount || 0;
  const grandTotal  = Math.max(0, totalPrice + deliveryFee - discount);

  if (items.length === 0 && step < 4) {
    return (
      <div className="min-h-screen bg-ivory text-espresso">
        <Header />
        <main className="pt-28 pb-20 flex flex-col items-center gap-6 px-5 min-h-[60vh] justify-center">
          <p className="text-taupe text-lg">Your cart is empty.</p>
          <Button onClick={() => navigate("/shop")} className="rounded-full bg-espresso text-ivory px-8 h-12">
            Browse Products
          </Button>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  function validateDelivery() {
    for (const f of ["full_name","phone","line1","city","state","pin"]) {
      if (!ship[f]?.trim()) {
        toast.error(`Please fill in: ${f.replace("_"," ").replace("line1","address line 1")}`);
        return false;
      }
    }
    if (ship.phone.replace(/\D/g,"").length < 10) { toast.error("Valid 10-digit phone required"); return false; }
    if (ship.pin.replace(/\D/g,"").length !== 6)  { toast.error("Valid 6-digit PIN required");   return false; }
    if (!sameAddress) {
      for (const f of ["full_name","line1","city","state","pin"]) {
        if (!bill[f]?.trim()) { toast.error(`Billing: please fill in ${f.replace("_"," ")}`); return false; }
      }
    }
    return true;
  }

  async function handlePlaceOrder() {
    if (!validateDelivery()) return;
    if (ship.full_name && !user?.name) {
      try { await api.patch("/auth/profile", { name: ship.full_name }); updateUser({ name: ship.full_name }); } catch {}
    }
    if (saveAddr && showNewForm && isLoggedIn) {
      try { await api.post("/addresses", { ...ship, label: "Home", is_default: savedAddresses.length === 0 }); } catch {}
    }
    setSubmitting(true);
    try {
      const res = await api.post("/orders", {
        items: items.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
        total: grandTotal,
        shipping_address: ship,
        billing_address: sameAddress ? ship : bill,
        coupon_code: coupon?.code || null,
        discount,
      });
      setOrderId(res.data.id);
      setStep(2);
    } catch {
      toast.error("Could not place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm() {
    if (!txnId.trim()) { toast.error("Please enter your UPI Transaction / UTR ID"); return; }
    setSubmitting(true);
    try {
      // Upload screenshot in background if provided (for admin manual review)
      if (screenshot) {
        try {
          const fd = new FormData();
          fd.append("transaction_id", txnId.trim());
          fd.append("amount", String(Math.round(grandTotal)));
          fd.append("screenshot", screenshot);
          await api.post("/payments/verify", fd);
        } catch { /* non-blocking — admin can verify manually */ }
      }
      await api.patch(`/orders/${orderId}/confirm`, { upi_ref: txnId.trim() });
      clearCart();
      setStep(4);
    } catch (err) {
      const msg = err?.response?.data?.detail || "Confirmation failed. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-ivory text-espresso">
      <Header />
      <main className="pt-24 md:pt-28 pb-24">
        <div className="max-w-3xl mx-auto px-5 md:px-10">

          {step < 4 && (
            <Link to="/cart" className="inline-flex items-center gap-1.5 text-sm text-taupe hover:text-espresso mb-6 transition">
              <ArrowLeft className="w-4 h-4" /> Back to Cart
            </Link>
          )}

          {step < 4 && (
            <div className="flex items-center gap-2 mb-8 flex-wrap">
              {STEP_LABELS.map((label, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full grid place-items-center text-xs font-semibold transition-colors ${i <= step ? "bg-espresso text-ivory" : "bg-rosemist text-taupe"}`}>
                    {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-xs hidden sm:inline ${i <= step ? "text-espresso font-medium" : "text-taupe"}`}>{label}</span>
                  {i < STEP_LABELS.length - 1 && <div className={`h-px w-4 sm:w-8 ${i < step ? "bg-espresso" : "bg-gold/20"}`} />}
                </div>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">

            {/* ── Step 0: Review ── */}
            {step === 0 && (
              <motion.div key="review" initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-16 }}>
                <h1 className="font-serif text-3xl text-espresso mb-6">Review Your Order</h1>

                <div className="space-y-3 mb-6">
                  {items.map(item => (
                    <div key={item.id} className="flex gap-4 bg-pearl rounded-xl p-4 border border-gold/10">
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-rosemist/30 shrink-0">
                        <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-taupe">{item.brand}</div>
                        <div className="text-sm font-medium text-espresso line-clamp-1 mt-0.5">{item.name}</div>
                        <div className="text-xs text-taupe mt-1">Qty: {item.qty}</div>
                      </div>
                      <div className="text-sm font-semibold text-espresso shrink-0">
                        ₹{(item.price * item.qty).toLocaleString("en-IN")}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Coupon */}
                <div className="bg-pearl rounded-2xl border border-gold/15 p-5 mb-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-taupe font-medium mb-3 flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-gold" /> Have a promo code?
                  </p>
                  <CouponBox subtotal={totalPrice} appliedCoupon={coupon} onApply={setCoupon} onRemove={() => setCoupon(null)} />
                </div>

                {/* Summary */}
                <div className="bg-pearl rounded-2xl border border-gold/15 p-5 space-y-3 text-sm mb-6">
                  <div className="flex justify-between text-taupe"><span>Subtotal</span><span>₹{totalPrice.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between text-taupe">
                    <span>Delivery</span>
                    <span className={deliveryFee === 0 ? "text-green-600 font-medium" : ""}>{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
                  </div>
                  {discount > 0 && (
                    <motion.div initial={{ opacity:0,height:0 }} animate={{ opacity:1,height:"auto" }}
                      className="flex justify-between text-green-600 font-medium">
                      <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" />{coupon.code}</span>
                      <span>−₹{discount.toLocaleString("en-IN")}</span>
                    </motion.div>
                  )}
                  <div className="border-t border-gold/15 pt-3 flex justify-between font-semibold text-base text-espresso">
                    <span>Total to Pay</span>
                    <div className="text-right">
                      {discount > 0 && <span className="text-xs text-taupe line-through mr-2">₹{(totalPrice+deliveryFee).toLocaleString("en-IN")}</span>}
                      <span>₹{grandTotal.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>

                <Button onClick={() => setStep(1)} className="w-full h-12 rounded-full bg-espresso text-ivory hover:bg-espresso/90 text-base font-medium">
                  Continue to Delivery Details
                </Button>
              </motion.div>
            )}

            {/* ── Step 1: Delivery ── */}
            {step === 1 && (
              <motion.div key="delivery" initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-16 }}>
                <h1 className="font-serif text-3xl text-espresso mb-2 flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-gold" /> Delivery Details
                </h1>
                <p className="text-taupe text-sm mb-6">Where should we deliver your order?</p>

                {savedAddresses.length > 0 && !showNewForm ? (
                  <div className="bg-pearl rounded-2xl border border-gold/15 p-5 mb-4">
                    <SavedAddressPicker
                      addresses={savedAddresses}
                      selectedId={selectedAddrId}
                      onSelect={addr => {
                        setSelectedAddrId(addr.id);
                        setShip({ full_name:addr.full_name,phone:addr.phone,line1:addr.line1,line2:addr.line2||"",city:addr.city,state:addr.state,pin:addr.pin });
                        setShowNewForm(false);
                      }}
                      onAddNew={() => {
                        setSelectedAddrId(null);
                        setShowNewForm(true);
                        setShip({ full_name:user?.name||"",phone:"",line1:"",line2:"",city:"",state:"",pin:"" });
                      }}
                    />
                  </div>
                ) : (
                  <>
                    {savedAddresses.length > 0 && (
                      <button onClick={() => { setShowNewForm(false); const a=savedAddresses.find(x=>x.is_default)||savedAddresses[0]; setSelectedAddrId(a.id); setShip({ full_name:a.full_name,phone:a.phone,line1:a.line1,line2:a.line2||"",city:a.city,state:a.state,pin:a.pin }); }}
                        className="inline-flex items-center gap-1.5 text-xs text-taupe hover:text-espresso transition mb-3">
                        <RotateCcw className="w-3 h-3" /> Use saved address
                      </button>
                    )}
                    <div className="bg-pearl rounded-2xl border border-gold/15 p-5 space-y-4 mb-4">
                      <AddressForm values={ship} onChange={setShip} label="Shipping Address" />
                    </div>
                    {isLoggedIn && (
                      <label className="flex items-center gap-2.5 cursor-pointer px-1 mb-3 select-none">
                        <input type="checkbox" checked={saveAddr} onChange={e => setSaveAddr(e.target.checked)} className="w-4 h-4 accent-espresso rounded" />
                        <span className="text-sm text-espresso">Save this address for future orders</span>
                      </label>
                    )}
                  </>
                )}

                <label className="flex items-center gap-3 cursor-pointer px-1 mb-5 select-none">
                  <input type="checkbox" checked={sameAddress} onChange={e => setSameAddress(e.target.checked)} className="w-4 h-4 accent-espresso rounded" />
                  <span className="text-sm text-espresso">Billing address is same as shipping address</span>
                </label>

                {!sameAddress && (
                  <motion.div initial={{ opacity:0,height:0 }} animate={{ opacity:1,height:"auto" }} exit={{ opacity:0,height:0 }} className="overflow-hidden mb-5">
                    <div className="bg-pearl rounded-2xl border border-gold/15 p-5 space-y-4">
                      <AddressForm values={bill} onChange={setBill} label="Billing Address" />
                    </div>
                  </motion.div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(0)} className="flex-1 h-12 rounded-full border-gold/40 text-espresso">Back</Button>
                  <Button onClick={handlePlaceOrder} disabled={submitting} className="flex-1 h-12 rounded-full bg-espresso text-ivory hover:bg-espresso/90 text-base font-medium">
                    {submitting ? "Placing order…" : "Continue to Pay"}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: UPI ── */}
            {step === 2 && (
              <motion.div key="pay" initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-16 }}>
                <h1 className="font-serif text-3xl text-espresso mb-2">Pay via UPI</h1>
                <p className="text-taupe text-sm mb-6">
                  Scan the QR code or use the UPI ID below. Pay exactly{" "}
                  <span className="font-semibold text-espresso">₹{grandTotal.toLocaleString("en-IN")}</span>.
                </p>

                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {/* Branded QR card */}
                  <div className="flex flex-col items-center gap-3 w-full md:w-auto">
                    <div className="relative rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.35)] border-2 border-gold/60">
                      <img
                        src="/upi-qr.jpg"
                        alt="Scan & Pay — M S BILION SALES AND SERVICES"
                        className="w-72 md:w-80 object-cover"
                        onError={e => { e.currentTarget.style.display = "none"; e.currentTarget.nextSibling.style.display = "flex"; }}
                      />
                      {/* Fallback if image not yet placed */}
                      <div style={{ display: "none" }} className="w-72 md:w-80 h-80 bg-espresso flex-col items-center justify-center gap-3 rounded-2xl">
                        <img src={buildQrUrl(grandTotal)} alt="UPI QR Code" className="w-52 h-52 rounded-xl bg-white p-2" />
                        <p className="text-gold text-xs font-semibold uppercase tracking-widest">MS BILION SALES AND SERVICES</p>
                        <p className="text-champagne text-xs">{UPI_ID}</p>
                      </div>
                    </div>
                    {/* Amount + copy row */}
                    <div className="w-72 md:w-80 flex items-center justify-between bg-espresso/5 border border-gold/20 rounded-full px-4 py-2.5">
                      <div>
                        <p className="text-[10px] text-taupe uppercase tracking-wider">Pay exactly</p>
                        <p className="text-lg font-semibold text-espresso">₹{grandTotal.toLocaleString("en-IN")}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-espresso font-medium">{UPI_ID}</span>
                        <button onClick={() => { navigator.clipboard.writeText(UPI_ID); toast.success("Copied!"); }}
                          className="text-taupe hover:text-espresso transition">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="bg-rosemist/30 rounded-xl p-4 space-y-2.5">
                      <div className="flex items-center gap-2 text-espresso font-medium text-sm">
                        <Smartphone className="w-4 h-4" /> How to pay
                      </div>
                      {[
                        "Open PhonePe, GPay, Paytm or any UPI app",
                        "Scan the QR code or enter UPI ID manually",
                        `Enter amount ₹${grandTotal.toLocaleString("en-IN")} exactly`,
                        "Complete the payment and note the Transaction ID",
                        "Come back here, then tap I've Paid to confirm",
                      ].map((s, i) => (
                        <div key={i} className="flex gap-2.5 text-sm text-taupe">
                          <span className="w-4 h-4 rounded-full bg-espresso/10 text-espresso text-[10px] grid place-items-center shrink-0 mt-0.5 font-semibold">{i+1}</span>
                          {s}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-start gap-2 bg-gold/10 rounded-xl p-3 text-xs text-taupe">
                      <AlertCircle className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                      Orders are dispatched within 24 hours after payment is verified by our team.
                    </div>
                    {discount > 0 && (
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-xs">
                        <span className="text-green-700 font-medium">Coupon saving</span>
                        <span className="text-green-700 font-bold">−₹{discount.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Button onClick={() => setStep(3)} className="w-full mt-6 h-12 rounded-full bg-espresso text-ivory hover:bg-espresso/90 text-base font-medium">
                  I've Paid — Confirm Now
                </Button>
              </motion.div>
            )}

            {/* ── Step 3: Confirm ── */}
            {step === 3 && (
              <motion.div key="confirm" initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-16 }}>
                <h1 className="font-serif text-3xl text-espresso mb-2">Confirm Your Order</h1>
                <p className="text-taupe text-sm mb-6">
                  Enter your UPI Transaction ID to confirm. Optionally attach a screenshot — our team will verify and dispatch within 24 hours.
                </p>

                <div className="bg-pearl rounded-2xl border border-gold/15 p-5 space-y-5">

                  {/* Transaction ID */}
                  <div>
                    <label className="text-xs uppercase tracking-[0.18em] text-taupe block mb-2">
                      UPI Transaction / UTR ID <span className="text-errorRose">*</span>
                    </label>
                    <Input
                      type="text"
                      value={txnId}
                      onChange={e => setTxnId(e.target.value)}
                      placeholder="e.g. 407812345678  (12-digit UTR)"
                      className="h-11 rounded-xl border-gold/30 bg-ivory text-espresso placeholder:text-taupe/60 font-mono tracking-wider focus-visible:ring-gold/40"
                    />
                    <p className="text-[11px] text-taupe mt-1.5">
                      Find this in your UPI app → Payment History → Transaction Details
                    </p>
                  </div>

                  {/* Screenshot upload — optional */}
                  <div>
                    <label className="text-xs uppercase tracking-[0.18em] text-taupe block mb-2">
                      Payment Screenshot <span className="text-taupe/60 normal-case tracking-normal">(optional)</span>
                    </label>
                    {!screenshotPreview ? (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gold/30 rounded-xl cursor-pointer hover:border-gold/60 hover:bg-rosemist/20 transition-all group">
                        <Upload className="w-5 h-5 text-taupe mb-1.5 group-hover:text-espresso transition" />
                        <span className="text-sm text-taupe group-hover:text-espresso transition">Tap to attach screenshot</span>
                        <span className="text-xs text-taupe/60 mt-0.5">PNG, JPEG or WEBP · max 15 MB</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) { setScreenshot(f); setScreenshotPreview(URL.createObjectURL(f)); }
                          }}
                        />
                      </label>
                    ) : (
                      <div className="relative">
                        <img
                          src={screenshotPreview}
                          alt="Payment screenshot"
                          className="w-full max-h-72 object-contain rounded-xl border border-gold/20 bg-stone-50"
                        />
                        <button
                          onClick={() => { setScreenshot(null); setScreenshotPreview(null); }}
                          className="absolute top-2 right-2 w-7 h-7 bg-espresso/85 text-ivory rounded-full grid place-items-center hover:bg-espresso transition shadow-md">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Order summary */}
                  <div className="space-y-2 border-t border-gold/10 pt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-taupe">Amount paid</span>
                      <span className="font-semibold text-espresso">₹{grandTotal.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-taupe">UPI ID</span>
                      <span className="font-medium text-espresso">{UPI_ID}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button variant="outline" onClick={() => setStep(2)}
                    className="flex-1 h-12 rounded-full border-gold/40 text-espresso">
                    Back
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={submitting || !txnId.trim()}
                    className="flex-1 h-12 rounded-full bg-espresso text-ivory hover:bg-espresso/90 font-medium">
                    {submitting
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Confirming…</>
                      : <><CheckCircle2 className="w-4 h-4 mr-2" /> Confirm Order</>}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── Step 4: Done ── */}
            {step === 4 && (
              <motion.div key="done" initial={{ opacity:0,scale:0.95 }} animate={{ opacity:1,scale:1 }} className="text-center py-12">
                <div className="w-20 h-20 rounded-full bg-rosemist grid place-items-center mx-auto mb-5">
                  <CheckCircle2 className="w-10 h-10 text-espresso" />
                </div>
                <h1 className="font-serif text-3xl text-espresso mb-2">Order Confirmed!</h1>
                <p className="text-taupe text-sm max-w-sm mx-auto mb-1">
                  Thank you! Our team will verify your payment and dispatch within 24 hours.
                </p>
                {discount > 0 && (
                  <p className="text-xs text-green-600 mb-1 font-medium">
                    You saved ₹{discount.toLocaleString("en-IN")} with coupon {coupon?.code}!
                  </p>
                )}
                <p className="text-xs text-taupe mb-8">Order ID: <span className="font-mono text-espresso">{orderId}</span></p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={() => navigate("/shop")} className="rounded-full bg-espresso text-ivory px-8 h-12">Continue Shopping</Button>
                  <Button variant="outline" onClick={() => navigate("/account")} className="rounded-full border-gold/40 text-espresso px-8 h-12">View My Orders</Button>
                </div>
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

function AddressForm({ values, onChange, label }) {
  const set = (key, val) => onChange(prev => ({ ...prev, [key]: val }));
  return (
    <>
      <h3 className="text-xs uppercase tracking-[0.2em] text-taupe font-medium">{label}</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <FormField label="Full Name" required>
          <Input value={values.full_name} onChange={e => set("full_name", e.target.value)} placeholder="Ziya Nisa" className="h-10 rounded-xl border-gold/25 bg-ivory/70" />
        </FormField>
        <FormField label="Phone Number" required>
          <Input value={values.phone} onChange={e => set("phone", e.target.value)} placeholder="9876543210" inputMode="tel" className="h-10 rounded-xl border-gold/25 bg-ivory/70" />
        </FormField>
      </div>
      <FormField label="Address Line 1" required>
        <Input value={values.line1} onChange={e => set("line1", e.target.value)} placeholder="House / Flat / Building / Street" className="h-10 rounded-xl border-gold/25 bg-ivory/70" />
      </FormField>
      <FormField label="Address Line 2">
        <Input value={values.line2} onChange={e => set("line2", e.target.value)} placeholder="Area / Locality (optional)" className="h-10 rounded-xl border-gold/25 bg-ivory/70" />
      </FormField>
      <div className="grid sm:grid-cols-3 gap-4">
        <FormField label="City" required>
          <Input value={values.city} onChange={e => set("city", e.target.value)} placeholder="Hyderabad" className="h-10 rounded-xl border-gold/25 bg-ivory/70" />
        </FormField>
        <FormField label="State" required>
          <select value={values.state} onChange={e => set("state", e.target.value)}
            className="w-full h-10 rounded-xl border border-gold/25 bg-ivory/70 px-3 text-sm text-espresso focus:outline-none focus:border-espresso/50 transition">
            <option value="">Select state</option>
            {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </FormField>
        <FormField label="PIN Code" required>
          <Input value={values.pin} onChange={e => set("pin", e.target.value)} placeholder="500001" inputMode="numeric" maxLength={6} className="h-10 rounded-xl border-gold/25 bg-ivory/70" />
        </FormField>
      </div>
    </>
  );
}

function FormField({ label, required, children }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-[0.16em] text-taupe mb-1 block">
        {label}{required && <span className="text-errorRose ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
