import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Copy, ArrowLeft, Smartphone, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import MobileBottomNav from "@/components/site/MobileBottomNav";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import api from "@/lib/api";

const UPI_ID = "biliion@indianbnk";
const MERCHANT = "MS BILIION SALES AND SERVICES";

function buildUpiUrl(amount) {
  return `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(MERCHANT)}&cu=INR&am=${amount}`;
}

function buildQrUrl(amount) {
  const data = encodeURIComponent(buildUpiUrl(amount));
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&color=3d2314&bgcolor=fdf8f4&data=${data}`;
}

// Steps: 0 = review, 1 = pay, 2 = confirm, 3 = done
export default function Checkout() {
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [upiRef, setUpiRef] = useState("");
  const [orderId, setOrderId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const deliveryFee = totalPrice >= 999 ? 0 : 79;
  const grandTotal = totalPrice + deliveryFee;

  if (items.length === 0 && step < 3) {
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

  async function handlePlaceOrder() {
    setSubmitting(true);
    try {
      const res = await api.post("/orders", {
        items: items.map((i) => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
        total: grandTotal,
      });
      setOrderId(res.data.id);
      setStep(1);
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
      setStep(3);
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

          {/* Back link */}
          {step < 3 && (
            <Link to="/cart" className="inline-flex items-center gap-1.5 text-sm text-taupe hover:text-espresso mb-6 transition">
              <ArrowLeft className="w-4 h-4" /> Back to Cart
            </Link>
          )}

          {/* Step indicator */}
          {step < 3 && (
            <div className="flex items-center gap-3 mb-8">
              {["Review", "Pay via UPI", "Confirm"].map((label, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full grid place-items-center text-xs font-semibold transition-colors ${
                    i <= step ? "bg-espresso text-ivory" : "bg-rosemist text-taupe"
                  }`}>
                    {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-xs hidden sm:inline ${i <= step ? "text-espresso font-medium" : "text-taupe"}`}>
                    {label}
                  </span>
                  {i < 2 && <div className={`h-px w-6 sm:w-10 ${i < step ? "bg-espresso" : "bg-gold/20"}`} />}
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
                  {items.map((item) => (
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

                {/* Summary */}
                <div className="bg-pearl rounded-2xl border border-gold/15 p-5 space-y-3 text-sm mb-6">
                  <div className="flex justify-between text-taupe">
                    <span>Subtotal</span>
                    <span>₹{totalPrice.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-taupe">
                    <span>Delivery</span>
                    <span className={deliveryFee === 0 ? "text-green-600 font-medium" : ""}>
                      {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
                    </span>
                  </div>
                  <div className="border-t border-gold/15 pt-3 flex justify-between font-semibold text-base text-espresso">
                    <span>Total to Pay</span>
                    <span>₹{grandTotal.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <Button
                  onClick={handlePlaceOrder}
                  disabled={submitting}
                  className="w-full h-12 rounded-full bg-espresso text-ivory hover:bg-espresso/90 text-base font-medium"
                >
                  {submitting ? "Placing order…" : "Proceed to Pay →"}
                </Button>
              </motion.div>
            )}

            {/* ── Step 1: UPI Payment ── */}
            {step === 1 && (
              <motion.div key="pay" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                <h1 className="font-serif text-3xl text-espresso mb-2">Pay via UPI</h1>
                <p className="text-taupe text-sm mb-6">Scan the QR code or use the UPI ID below. Pay exactly <span className="font-semibold text-espresso">₹{grandTotal.toLocaleString("en-IN")}</span>.</p>

                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {/* QR code */}
                  <div className="bg-pearl rounded-2xl border border-gold/15 p-5 flex flex-col items-center gap-3 w-full md:w-auto">
                    <p className="text-xs uppercase tracking-[0.18em] text-taupe">Scan & Pay</p>
                    <img
                      src={buildQrUrl(grandTotal)}
                      alt="UPI QR Code"
                      className="w-52 h-52 rounded-xl"
                    />
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

                  {/* Instructions */}
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
                      ].map((step, i) => (
                        <div key={i} className="flex gap-2.5 text-sm text-taupe">
                          <span className="w-4 h-4 rounded-full bg-espresso/10 text-espresso text-[10px] grid place-items-center shrink-0 mt-0.5 font-semibold">
                            {i + 1}
                          </span>
                          {step}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-start gap-2 bg-gold/10 rounded-xl p-3 text-xs text-taupe">
                      <AlertCircle className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                      Orders are dispatched within 24 hours after payment is verified by our team.
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setStep(2)}
                  className="w-full mt-6 h-12 rounded-full bg-espresso text-ivory hover:bg-espresso/90 text-base font-medium"
                >
                  I've Paid — Confirm Now →
                </Button>
              </motion.div>
            )}

            {/* ── Step 2: Confirm ── */}
            {step === 2 && (
              <motion.div key="confirm" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                <h1 className="font-serif text-3xl text-espresso mb-2">Confirm Payment</h1>
                <p className="text-taupe text-sm mb-6">
                  Enter your UPI Transaction ID (or the last 4 digits of the transaction reference) so we can verify your payment quickly.
                </p>

                <div className="bg-pearl rounded-2xl border border-gold/15 p-5 space-y-5">
                  <div>
                    <label className="text-xs uppercase tracking-[0.18em] text-taupe block mb-2">
                      UPI Transaction ID / Reference
                    </label>
                    <input
                      type="text"
                      value={upiRef}
                      onChange={(e) => setUpiRef(e.target.value)}
                      placeholder="e.g. 407812345678 or last 4 digits"
                      className="w-full h-11 rounded-xl border border-gold/30 bg-ivory px-4 text-sm text-espresso placeholder:text-taupe/60 focus:outline-none focus:border-espresso/50 transition"
                    />
                  </div>

                  <div className="flex justify-between text-sm border-t border-gold/10 pt-4">
                    <span className="text-taupe">Amount paid</span>
                    <span className="font-semibold text-espresso">₹{grandTotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-taupe">UPI ID</span>
                    <span className="font-medium text-espresso">{UPI_ID}</span>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1 h-12 rounded-full border-gold/40 text-espresso"
                  >
                    ← Back
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={submitting}
                    className="flex-1 h-12 rounded-full bg-espresso text-ivory hover:bg-espresso/90"
                  >
                    {submitting ? "Confirming…" : "Confirm Order"}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Success ── */}
            {step === 3 && (
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
                  Thank you for your order. Our team will verify your payment and dispatch within 24 hours.
                </p>
                <p className="text-xs text-taupe mb-8">Order ID: <span className="font-mono text-espresso">{orderId}</span></p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => navigate("/shop")}
                    className="rounded-full bg-espresso text-ivory px-8 h-12"
                  >
                    Continue Shopping
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/")}
                    className="rounded-full border-gold/40 text-espresso px-8 h-12"
                  >
                    Go Home
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
