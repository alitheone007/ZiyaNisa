import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Phone, ArrowRight, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

function isEmail(s) {
  return s.includes("@");
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuth();
  const from = location.state?.from || "/";

  const [step, setStep]       = useState(0); // 0 = enter contact, 1 = enter OTP
  const [contact, setContact] = useState("");
  const [otp, setOtp]         = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [devOtp, setDevOtp]   = useState(null);
  const otpRefs = useRef([]);

  // countdown for resend
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function handleSendOtp(e) {
    e.preventDefault();
    const c = contact.trim();
    if (!c) { toast.error("Please enter your email or phone number"); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/send-otp", { contact: c });
      setStep(1);
      setResendIn(30);
      setOtp(["", "", "", "", "", ""]);
      if (data.dev_otp) {
        setDevOtp(data.dev_otp);
        toast.info(`Dev OTP: ${data.dev_otp}`, { duration: 30000 });
      }
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not send OTP. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleOtpKey(index, e) {
    const val = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = val;
    setOtp(next);
    if (val && index < 5) otpRefs.current[index + 1]?.focus();
    if (e.key === "Backspace" && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) { toast.error("Please enter the complete 6-digit OTP"); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/verify-otp", { contact: contact.trim(), otp: code });
      setAuth(data);
      const greeting = data.user.name ? `Welcome back, ${data.user.name.split(" ")[0]}!` : "Welcome to ZiyaNisa!";
      toast.success(greeting);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid OTP. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendIn > 0) return;
    setLoading(true);
    try {
      const { data } = await api.post("/auth/send-otp", { contact: contact.trim() });
      setResendIn(30);
      setOtp(["", "", "", "", "", ""]);
      if (data.dev_otp) {
        setDevOtp(data.dev_otp);
        toast.info(`Dev OTP: ${data.dev_otp}`, { duration: 30000 });
      }
      toast.success("OTP resent");
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch {
      toast.error("Could not resend OTP");
    } finally {
      setLoading(false);
    }
  }

  const contactLabel = contact && isEmail(contact) ? "email" : "phone";

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center px-5">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-peach/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-aqua/15 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative"
      >
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <span className="w-9 h-9 rounded-full bg-gradient-to-br from-gold to-champagne shadow-goldGlow grid place-items-center">
            <span className="text-pearl font-serif text-base">Z</span>
          </span>
          <span className="font-serif text-2xl text-espresso tracking-[0.18em]">
            ZIYA<span className="text-gold">NISA</span>
          </span>
        </Link>

        <div className="bg-pearl rounded-3xl border border-gold/15 shadow-soft p-6 md:p-8">
          <AnimatePresence mode="wait">

            {/* ── Step 0: Enter email or phone ── */}
            {step === 0 && (
              <motion.div key="contact" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h1 className="font-serif text-2xl text-espresso mb-1">Sign in or Create Account</h1>
                <p className="text-taupe text-sm mb-6">Enter your email or phone number — we'll send you a one-time code.</p>

                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-taupe mb-1.5 block">
                      Email or Phone Number
                    </label>
                    <div className="relative">
                      {contact && isEmail(contact)
                        ? <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-taupe" />
                        : <Phone className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-taupe" />
                      }
                      <Input
                        type="text"
                        value={contact}
                        onChange={e => setContact(e.target.value)}
                        placeholder="you@email.com or 9876543210"
                        inputMode="email"
                        autoComplete="email"
                        autoFocus
                        className="pl-11 h-11 rounded-full border-gold/25 bg-ivory/60 focus-visible:ring-gold/40"
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full h-11 rounded-full bg-espresso text-ivory hover:bg-espresso/90">
                    {loading ? "Sending OTP…" : <><span>Get OTP</span> <ArrowRight className="w-4 h-4 ml-1" /></>}
                  </Button>
                </form>

                <p className="text-center text-xs text-taupe mt-5">
                  By continuing you agree to ZiyaNisa's Terms & Privacy Policy.
                </p>
              </motion.div>
            )}

            {/* ── Step 1: Enter OTP ── */}
            {step === 1 && (
              <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <button onClick={() => setStep(0)} className="flex items-center gap-1 text-taupe text-sm hover:text-espresso transition mb-4">
                  <ArrowLeft className="w-4 h-4" /> Change {contactLabel}
                </button>

                <h1 className="font-serif text-2xl text-espresso mb-1">Enter OTP</h1>
                <p className="text-taupe text-sm mb-1">
                  Sent to <span className="text-espresso font-medium">{contact}</span>
                </p>
                {devOtp && (
                  <div className="text-xs bg-gold/10 text-espresso px-3 py-2 rounded-lg mb-4 font-mono">
                    Dev mode OTP: <strong>{devOtp}</strong>
                  </div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-5 mt-4">
                  <div className="flex gap-2 justify-between">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={el => otpRefs.current[i] = el}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpKey(i, e)}
                        onKeyDown={e => {
                          if (e.key === "Backspace" && !otp[i] && i > 0) {
                            otpRefs.current[i - 1]?.focus();
                          }
                        }}
                        onPaste={e => {
                          const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                          if (pasted.length > 0) {
                            e.preventDefault();
                            const next = [...otp];
                            pasted.split("").forEach((ch, idx) => { if (idx < 6) next[idx] = ch; });
                            setOtp(next);
                            const lastFilled = Math.min(pasted.length, 5);
                            otpRefs.current[lastFilled]?.focus();
                          }
                        }}
                        className="w-12 h-12 text-center text-xl font-semibold text-espresso rounded-xl border border-gold/30 bg-ivory focus:outline-none focus:border-espresso/60 transition"
                      />
                    ))}
                  </div>

                  <Button type="submit" disabled={loading} className="w-full h-11 rounded-full bg-espresso text-ivory hover:bg-espresso/90">
                    {loading ? "Verifying…" : <><span>Verify & Continue</span> <ArrowRight className="w-4 h-4 ml-1" /></>}
                  </Button>
                </form>

                <div className="flex items-center justify-center gap-2 mt-4">
                  <button
                    onClick={handleResend}
                    disabled={resendIn > 0 || loading}
                    className="flex items-center gap-1 text-xs text-taupe hover:text-espresso disabled:opacity-40 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend OTP"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
