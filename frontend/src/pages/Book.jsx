import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Star, ArrowLeft, ChevronRight, CheckCircle2, MapPin, CalendarDays, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import MobileBottomNav from "@/components/site/MobileBottomNav";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import api from "@/lib/api";
import { SERVICES } from "@/data/seed";

const INDIA_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra",
  "Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim",
  "Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Delhi","Jammu & Kashmir","Ladakh","Puducherry","Chandigarh",
];

const TIME_SLOTS = [
  "08:00 AM - 09:00 AM",
  "09:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "12:00 PM - 01:00 PM",
  "02:00 PM - 03:00 PM",
  "03:00 PM - 04:00 PM",
  "04:00 PM - 05:00 PM",
  "05:00 PM - 06:00 PM",
  "06:00 PM - 07:00 PM",
];

function getNextDays(n = 14) {
  const days = [];
  const now = new Date();
  for (let i = 1; i <= n; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push(d);
  }
  return days;
}

const STEPS = ["Date & Time", "Address", "Confirm"];

export default function Book() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();

  const [step, setStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [address, setAddress] = useState({
    full_name: user?.name || "",
    phone: user?.contact?.replace("@", "").match(/^\d/) ? user.contact : "",
    line1: "", line2: "", city: "", state: "Telangana", pin: "",
  });
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [bookingId, setBookingId] = useState(null);

  // Load services from API or seed
  const { data: services = SERVICES } = useQuery({
    queryKey: ["services"],
    queryFn: () => api.get("/services").then(r => r.data),
    placeholderData: SERVICES,
  });

  const service = services.find(s => s.id === serviceId);

  // Prefill name if user has profile
  useEffect(() => {
    if (user?.name && !address.full_name) {
      setAddress(a => ({ ...a, full_name: user.name }));
    }
  }, [user]);

  if (!service) {
    return (
      <div className="min-h-screen bg-ivory text-espresso">
        <Header />
        <main className="pt-28 pb-20 flex flex-col items-center justify-center px-5 min-h-[60vh]">
          <p className="text-taupe mb-4">Service not found.</p>
          <Button onClick={() => navigate("/services")} className="rounded-full bg-espresso text-ivory px-6">
            View All Services
          </Button>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  const days = getNextDays(14);

  function canProceed() {
    if (step === 0) return selectedDate && selectedSlot;
    if (step === 1) {
      const a = address;
      return a.full_name.trim() && a.phone.trim() && a.line1.trim() && a.city.trim() && a.pin.trim();
    }
    return true;
  }

  async function handleConfirm() {
    setSubmitting(true);
    try {
      const payload = {
        service_id: service.id,
        service_name: service.name,
        service_price: service.price,
        service_duration: service.duration,
        date: selectedDate.toISOString().split("T")[0],
        time_slot: selectedSlot,
        address,
        notes: notes.trim() || undefined,
      };
      const { data } = await api.post("/bookings", payload);
      setBookingId(data.id);
      setDone(true);
    } catch (err) {
      toast.error("Booking failed", { description: err.response?.data?.detail || "Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-ivory text-espresso">
        <Header />
        <main className="pt-28 pb-20 flex flex-col items-center justify-center px-5 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
            <div className="w-20 h-20 rounded-full bg-green-50 border border-green-200 grid place-items-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
          </motion.div>
          <h1 className="font-serif text-2xl text-espresso mb-2">Booking Confirmed!</h1>
          <p className="text-taupe text-sm mb-1">
            {service.name} · {selectedSlot}
          </p>
          <p className="text-taupe text-sm mb-6">
            {selectedDate?.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <div className="bg-pearl border border-gold/15 rounded-2xl p-5 max-w-sm w-full text-left mb-6">
            <p className="text-xs text-taupe mb-2">Booking details</p>
            <p className="text-sm font-medium text-espresso">{address.full_name}</p>
            <p className="text-xs text-taupe mt-0.5">{address.line1}, {address.city} — {address.pin}</p>
            <div className="mt-3 pt-3 border-t border-gold/10 flex items-center justify-between">
              <span className="text-xs text-taupe">Amount due at door</span>
              <span className="font-semibold text-espresso">₹{service.price.toLocaleString("en-IN")}</span>
            </div>
            {bookingId && <p className="text-[11px] text-taupe mt-2 font-mono">Ref: #{bookingId.slice(-8).toUpperCase()}</p>}
          </div>
          <p className="text-xs text-taupe mb-6 max-w-xs">
            Our team will call you 1 hour before arrival to confirm. Pay by UPI or cash at your door.
          </p>
          <div className="flex gap-3 flex-wrap justify-center">
            <Button onClick={() => navigate("/services")} variant="outline"
              className="rounded-full border-gold/30 text-espresso px-6">
              Book Another
            </Button>
            {isLoggedIn && (
              <Button onClick={() => navigate("/account")} className="rounded-full bg-espresso text-ivory px-6">
                My Bookings
              </Button>
            )}
          </div>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory text-espresso">
      <Header />
      <main className="pt-24 md:pt-28 pb-24">
        <div className="max-w-2xl mx-auto px-5 md:px-10">

          {/* Back link */}
          <Link to="/services" className="inline-flex items-center gap-1.5 text-sm text-taupe hover:text-espresso mb-6 transition">
            <ArrowLeft className="w-4 h-4" /> All Services
          </Link>

          {/* Service summary card */}
          <div className="bg-pearl rounded-2xl border border-gold/15 overflow-hidden mb-6 flex gap-4 items-center p-4">
            <img src={service.img} alt={service.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="font-serif text-base leading-snug text-espresso mb-0.5 line-clamp-2">{service.name}</h1>
              <div className="flex items-center gap-3 text-xs text-taupe">
                <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-gold text-gold" />{service.rating}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{service.duration}</span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-semibold text-espresso">₹{service.price.toLocaleString("en-IN")}</p>
              <p className="text-[10px] text-taupe">pay at door</p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full text-xs font-medium grid place-items-center shrink-0 transition-colors ${
                  i < step ? "bg-espresso text-ivory" : i === step ? "bg-espresso text-ivory ring-4 ring-espresso/20" : "bg-rosemist text-taupe"
                }`}>
                  {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:block ${i === step ? "text-espresso font-medium" : "text-taupe"}`}>{s}</span>
                {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? "bg-espresso/30" : "bg-gold/15"}`} />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* STEP 0 — Date & Time */}
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="font-serif text-xl text-espresso mb-5 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-gold" /> Choose Date
                </h2>

                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-8">
                  {days.map(d => {
                    const isSelected = selectedDate?.toDateString() === d.toDateString();
                    return (
                      <button key={d.toISOString()} onClick={() => setSelectedDate(d)}
                        className={`flex flex-col items-center py-2.5 px-1 rounded-xl border text-xs transition-all ${
                          isSelected
                            ? "border-espresso bg-espresso text-ivory"
                            : "border-gold/15 bg-pearl text-espresso hover:border-gold/40"
                        }`}>
                        <span className={`text-[10px] uppercase tracking-wide mb-0.5 ${isSelected ? "text-ivory/70" : "text-taupe"}`}>
                          {d.toLocaleDateString("en-IN", { weekday: "short" })}
                        </span>
                        <span className="font-medium text-sm">{d.getDate()}</span>
                        <span className={`text-[9px] ${isSelected ? "text-ivory/70" : "text-taupe"}`}>
                          {d.toLocaleDateString("en-IN", { month: "short" })}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <h2 className="font-serif text-xl text-espresso mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gold" /> Choose Time Slot
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {TIME_SLOTS.map(slot => (
                    <button key={slot} onClick={() => setSelectedSlot(slot)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-medium transition-all ${
                        selectedSlot === slot
                          ? "border-espresso bg-espresso text-ivory"
                          : "border-gold/15 bg-pearl text-espresso hover:border-gold/40"
                      }`}>
                      {slot}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 1 — Address */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="font-serif text-xl text-espresso mb-5 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gold" /> Service Address
                </h2>
                <p className="text-xs text-taupe mb-6">Our beautician will come to this address.</p>

                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Full Name *" value={address.full_name}
                      onChange={v => setAddress(a => ({ ...a, full_name: v }))} placeholder="Your full name" />
                    <Field label="Mobile *" value={address.phone} type="tel"
                      onChange={v => setAddress(a => ({ ...a, phone: v }))} placeholder="10-digit mobile" />
                  </div>
                  <Field label="Address Line 1 *" value={address.line1}
                    onChange={v => setAddress(a => ({ ...a, line1: v }))} placeholder="Flat/House No, Street, Locality" />
                  <Field label="Landmark (optional)" value={address.line2}
                    onChange={v => setAddress(a => ({ ...a, line2: v }))} placeholder="Near landmark, area name" />
                  <div className="grid sm:grid-cols-3 gap-4">
                    <Field label="City *" value={address.city}
                      onChange={v => setAddress(a => ({ ...a, city: v }))} placeholder="City" />
                    <div>
                      <label className="block text-xs text-taupe mb-1.5">State *</label>
                      <select value={address.state} onChange={e => setAddress(a => ({ ...a, state: e.target.value }))}
                        className="w-full h-10 rounded-xl border border-gold/20 bg-pearl px-3 text-sm text-espresso focus:outline-none focus:border-espresso focus:ring-2 focus:ring-espresso/10">
                        {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <Field label="PIN *" value={address.pin} type="tel" maxLength={6}
                      onChange={v => setAddress(a => ({ ...a, pin: v.replace(/\D/g, "") }))} placeholder="PIN Code" />
                  </div>
                  <div>
                    <label className="block text-xs text-taupe mb-1.5">Special requests (optional)</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                      placeholder="Any allergies, preferences or instructions for the beautician…"
                      className="w-full rounded-xl border border-gold/20 bg-pearl px-3 py-2.5 text-sm text-espresso resize-none focus:outline-none focus:border-espresso focus:ring-2 focus:ring-espresso/10 placeholder:text-taupe/50" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2 — Confirm */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="font-serif text-xl text-espresso mb-5 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-gold" /> Review & Confirm
                </h2>

                <div className="space-y-4">
                  <InfoBlock title="Service">
                    <p className="text-sm text-espresso font-medium">{service.name}</p>
                    <p className="text-xs text-taupe">{service.duration} · ₹{service.price.toLocaleString("en-IN")} (pay at door)</p>
                  </InfoBlock>

                  <InfoBlock title="Date & Time">
                    <p className="text-sm text-espresso">
                      {selectedDate?.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    <p className="text-xs text-taupe">{selectedSlot}</p>
                  </InfoBlock>

                  <InfoBlock title="Address">
                    <p className="text-sm text-espresso">{address.full_name} · {address.phone}</p>
                    <p className="text-xs text-taupe">{address.line1}{address.line2 ? `, ${address.line2}` : ""}</p>
                    <p className="text-xs text-taupe">{address.city}, {address.state} — {address.pin}</p>
                    {notes && <p className="text-xs text-taupe mt-1 italic">"{notes}"</p>}
                  </InfoBlock>

                  <div className="bg-champagne/30 border border-gold/20 rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-espresso font-medium">Amount due at door</span>
                      <span className="font-serif text-xl text-espresso">₹{service.price.toLocaleString("en-IN")}</span>
                    </div>
                    <p className="text-xs text-taupe mt-1">Pay by UPI, cash, or card when the beautician arrives.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(s => s - 1)}
                className="rounded-full border-gold/30 text-espresso px-6 h-11">
                Back
              </Button>
            )}
            <Button
              disabled={!canProceed() || submitting}
              onClick={() => step < STEPS.length - 1 ? setStep(s => s + 1) : handleConfirm()}
              className="flex-1 h-11 rounded-full bg-espresso text-ivory hover:bg-espresso/90 gap-1.5 disabled:opacity-50"
            >
              {step === STEPS.length - 1
                ? (submitting ? "Confirming…" : "Confirm Booking")
                : <>Next <ChevronRight className="w-4 h-4" /></>
              }
            </Button>
          </div>

        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", maxLength }) {
  return (
    <div>
      <label className="block text-xs text-taupe mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} maxLength={maxLength}
        className="w-full h-10 rounded-xl border border-gold/20 bg-pearl px-3 text-sm text-espresso focus:outline-none focus:border-espresso focus:ring-2 focus:ring-espresso/10 placeholder:text-taupe/50" />
    </div>
  );
}

function InfoBlock({ title, children }) {
  return (
    <div className="bg-pearl border border-gold/15 rounded-2xl p-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-taupe mb-2">{title}</p>
      {children}
    </div>
  );
}
