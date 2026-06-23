import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Copy, ArrowLeft, Smartphone, AlertCircle, MapPin } from "lucide-react";
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

const STEP_LABELS = ["Review", "Delivery", "Pay via UPI", "Confirm"];

// Steps: 0=review, 1=delivery address, 2=pay, 3=confirm, 4=done
export default function Checkout() {
  const { items, totalPrice, clearCart } = useCart();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [step,       setStep]       = useState(0);
  const [upiRef,     setUpiRef]     = useState("");
  const [orderId,    setOrderId]    = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const deliveryFee = totalPrice >= 999 ? 0 : 79;
  const grandTotal  = totalPrice + deliveryFee;

  // Delivery form
  const [ship, setShip] = useState({
    full_name: user?.name || "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pin: "",
  });
  const [sameAddress, setSameAddress] = useState(true);
  const [bill, setBill] = useState({
    full_name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pin: "",
  });

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
    const req = ["full_name", "phone", "line1", "city", "state", "pin"];
    for (const f of req) {
      if (!ship[f]?.trim()) {
        toast.error(`Please fill in: ${f.replace("_", " ").replace("line1", "address line 1")}`);
        return false;
      }
    }
    if (ship.phone.replace(/\D/g, "").length < 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return false;
    }
    if (ship.pin.replace(/\D/g, "").length !== 6) {
      toast.error("Please enter a valid 6-digit PIN code");
      return false;
    }
    if (!sameAddress) {
      const billReq = ["full_name", "line1", "city", "state", "pin"];
      for (const f of billReq) {
        if (!bill[f]?.trim()) {
          toast.error(`Billing: please fill in ${f.replace("_", " ")}`);
          return false;
        }
      }
    }
    return true;
  }

  async function handlePlaceOrder() {
    if (!validateDelivery()) return;
    if (ship.full_name && !user?.name) {
      try { await api.patch("/auth/profile", { name: ship.full_name }); updateUser({ name: ship.full_name }); } catch {}
    }
    setSubmitting(true);
    try {
      const res = await api.post("/orders", {
        items: items.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
        total: grandTotal,
        shipping_address: ship,
        billing_address: sameAddress ? ship : bill,
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
    if (!upiRef.trim()) {
      toast.error("Please enter your UPI transaction ID or last 4 digits");
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/orders/${orderId}/confirm`, { upi_ref: upiRef.trim() });
      clearCart();
      setStep(4);
    } catch {
      toast.error("Confirmation failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function copyUpiId() {
    navigator.clipboard.writeText(UPI_ID);
    toast.success("UPI ID copied!");
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

          {/* Step indicator */}
          {step < 4 && (
            <div className="flex items-center gap-2 mb-8 flex-wrap">
              {STEP_LABELS.map((label, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full grid place-items-center text-xs font-semibold transition-colors ${
                    i <= step ? "bg-espresso text-ivory" : "bg-rosemist text-taupe"
                  }`}>
                    {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-xs hidden sm:inline ${i <= step ? "text-espresso font-medium" : "text-taupe"}`}>
                    {label}
                  </span>
                  {i < STEP_LABELS.length - 1 && <div className={`h-px w-4 sm:w-8 ${i < step ? "bg-espresso" : "bg-gold/20"}`} />}
                </div>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">

            {/* ── Step 0: Review Order ── */}
            {step === 0 && (
              <motion.div key="review" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
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
                        Rs.{(item.price * item.qty).toLocaleString("en-IN")}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-pearl rounded-2xl border border-gold/15 p-5 space-y-3 text-sm mb-6">
                  <div className="flex justify-between text-taupe">
                    <span>Subtotal</span><span>Rs.{totalPrice.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-taupe">
                    <span>Delivery</span>
                    <span className={deliveryFee === 0 ? "text-green-600 font-medium" : ""}>
                      {deliveryFee === 0 ? "FREE" : `Rs.${deliveryFee}`}
                    </span>
                  </div>
                  <div className="border-t border-gold/15 pt-3 flex justify-between font-semibold text-base text-espresso">
                    <span>Total to Pay</span><span>Rs.{grandTotal.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <Button onClick={() => setStep(1)} className="w-full h-12 rounded-full bg-espresso text-ivory hover:bg-espresso/90 text-base font-medium">
                  Continue to Delivery Details
                </Button>
              </motion.div>
            )}

            {/* ── Step 1: Delivery Address ── */}
            {step === 1 && (
              <motion.div key="delivery" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                <h1 className="font-serif text-3xl text-espresso mb-2 flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-gold" /> Delivery Details
                </h1>
                <p className="text-taupe text-sm mb-6">Where should we deliver your order?</p>

                <div className="bg-pearl rounded-2xl border border-gold/15 p-5 space-y-4 mb-5">
                  <AddressForm values={ship} onChange={setShip} label="Shipping Address" />
                </div>

                {/* Billing address toggle */}
                <label className="flex items-center gap-3 cursor-pointer px-1 mb-5 select-none">
                  <input
                    type="checkbox"
                    checked={sameAddress}
                    onChange={e => setSameAddress(e.target.checked)}
                    className="w-4 h-4 accent-espresso rounded"
                  />
                  <span className="text-sm text-espresso">Billing address is same as shipping address</span>
                </label>

                {!sameAddress && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-5"
                  >
                    <div className="bg-pearl rounded-2xl border border-gold/15 p-5 space-y-4">
                      <AddressForm values={bill} onChange={setBill} label="Billing Address" />
                    </div>
                  </motion.div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(0)} className="flex-1 h-12 rounded-full border-gold/40 text-espresso">
                    Back
                  </Button>
                  <Button onClick={handlePlaceOrder} disabled={submitting} className="flex-1 h-12 rounded-full bg-espresso text-ivory hover:bg-espresso/90 text-base font-medium">
                    {submitting ? "Placing order…" : "Continue to Pay"}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: UPI Payment ── */}
            {step === 2 && (
              <motion.div key="pay" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                <h1 className="font-serif text-3xl text-espresso mb-2">Pay via UPI</h1>
                <p className="text-taupe text-sm mb-6">
                  Scan the QR code or use the UPI ID below. Pay exactly{" "}
                  <span className="font-semibold text-espresso">Rs.{grandTotal.toLocaleString("en-IN")}</span>.
                </p>

                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="bg-pearl rounded-2xl border border-gold/15 p-5 flex flex-col items-center gap-3 w-full md:w-auto">
                    <p className="text-xs uppercase tracking-[0.18em] text-taupe">Scan & Pay</p>
                    <img src={buildQrUrl(grandTotal)} alt="UPI QR Code" className="w-52 h-52 rounded-xl" />
                    <div className="text-center">
                      <p className="text-xs text-taupe">MS BILIION SALES AND SERVICES</p>
                      <div className="flex items-center gap-1.5 mt-1 justify-center">
                        <span className="text-sm font-semibold text-espresso">{UPI_ID}</span>
                        <button onClick={copyUpiId} className="text-taupe hover:text-espresso transition">
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
                        `Enter amount Rs.${grandTotal.toLocaleString("en-IN")} exactly`,
                        "Complete the payment and note the Transaction ID",
                        "Come back here, then tap I've Paid to confirm",
                      ].map((s, i) => (
                        <div key={i} className="flex gap-2.5 text-sm text-taupe">
                          <span className="w-4 h-4 rounded-full bg-espresso/10 text-espresso text-[10px] grid place-items-center shrink-0 mt-0.5 font-semibold">{i + 1}</span>
                          {s}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-start gap-2 bg-gold/10 rounded-xl p-3 text-xs text-taupe">
                      <AlertCircle className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                      Orders are dispatched within 24 hours after payment is verified by our team.
                    </div>
                  </div>
                </div>

                <Button onClick={() => setStep(3)} className="w-full mt-6 h-12 rounded-full bg-espresso text-ivory hover:bg-espresso/90 text-base font-medium">
                  I've Paid — Confirm Now
                </Button>
              </motion.div>
            )}

            {/* ── Step 3: Confirm ── */}
            {step === 3 && (
              <motion.div key="confirm" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                <h1 className="font-serif text-3xl text-espresso mb-2">Confirm Payment</h1>
                <p className="text-taupe text-sm mb-6">
                  Enter your UPI Transaction ID (or last 4 digits) so we can verify your payment quickly.
                </p>

                <div className="bg-pearl rounded-2xl border border-gold/15 p-5 space-y-5">
                  <div>
                    <label className="text-xs uppercase tracking-[0.18em] text-taupe block mb-2">
                      UPI Transaction ID / Reference
                    </label>
                    <Input
                      type="text"
                      value={upiRef}
                      onChange={e => setUpiRef(e.target.value)}
                      placeholder="e.g. 407812345678 or last 4 digits"
                      className="h-11 rounded-xl border-gold/30 bg-ivory text-espresso placeholder:text-taupe/60 focus-visible:ring-gold/40"
                    />
                  </div>
                  <div className="flex justify-between text-sm border-t border-gold/10 pt-4">
                    <span className="text-taupe">Amount paid</span>
                    <span className="font-semibold text-espresso">Rs.{grandTotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-taupe">UPI ID</span>
                    <span className="font-medium text-espresso">{UPI_ID}</span>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-12 rounded-full border-gold/40 text-espresso">
                    Back
                  </Button>
                  <Button onClick={handleConfirm} disabled={submitting} className="flex-1 h-12 rounded-full bg-espresso text-ivory hover:bg-espresso/90">
                    {submitting ? "Confirming…" : "Confirm Order"}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── Step 4: Success ── */}
            {step === 4 && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="w-20 h-20 rounded-full bg-rosemist grid place-items-center mx-auto mb-5">
                  <CheckCircle2 className="w-10 h-10 text-espresso" />
                </div>
                <h1 className="font-serif text-3xl text-espresso mb-2">Order Confirmed!</h1>
                <p className="text-taupe text-sm max-w-sm mx-auto mb-1">
                  Thank you! Our team will verify your payment and dispatch within 24 hours.
                </p>
                <p className="text-xs text-taupe mb-8">
                  Order ID: <span className="font-mono text-espresso">{orderId}</span>
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={() => navigate("/shop")} className="rounded-full bg-espresso text-ivory px-8 h-12">
                    Continue Shopping
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/account")} className="rounded-full border-gold/40 text-espresso px-8 h-12">
                    View My Orders
                  </Button>
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
          <Input value={values.full_name} onChange={e => set("full_name", e.target.value)}
            placeholder="Ziya Nisa" className="h-10 rounded-xl border-gold/25 bg-ivory/70" />
        </FormField>
        <FormField label="Phone Number" required>
          <Input value={values.phone} onChange={e => set("phone", e.target.value)}
            placeholder="9876543210" inputMode="tel" className="h-10 rounded-xl border-gold/25 bg-ivory/70" />
        </FormField>
      </div>
      <FormField label="Address Line 1" required>
        <Input value={values.line1} onChange={e => set("line1", e.target.value)}
          placeholder="House / Flat / Building / Street" className="h-10 rounded-xl border-gold/25 bg-ivory/70" />
      </FormField>
      <FormField label="Address Line 2">
        <Input value={values.line2} onChange={e => set("line2", e.target.value)}
          placeholder="Area / Locality (optional)" className="h-10 rounded-xl border-gold/25 bg-ivory/70" />
      </FormField>
      <div className="grid sm:grid-cols-3 gap-4">
        <FormField label="City" required>
          <Input value={values.city} onChange={e => set("city", e.target.value)}
            placeholder="Hyderabad" className="h-10 rounded-xl border-gold/25 bg-ivory/70" />
        </FormField>
        <FormField label="State" required>
          <select value={values.state} onChange={e => set("state", e.target.value)}
            className="w-full h-10 rounded-xl border border-gold/25 bg-ivory/70 px-3 text-sm text-espresso focus:outline-none focus:border-espresso/50 transition">
            <option value="">Select state</option>
            {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </FormField>
        <FormField label="PIN Code" required>
          <Input value={values.pin} onChange={e => set("pin", e.target.value)}
            placeholder="500001" inputMode="numeric" maxLength={6} className="h-10 rounded-xl border-gold/25 bg-ivory/70" />
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
