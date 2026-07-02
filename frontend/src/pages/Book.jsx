import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, Star, ArrowLeft, ChevronRight, CheckCircle2,
  MapPin, CalendarDays, Sparkles, Navigation, Loader2, User,
  ShieldCheck, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import MobileBottomNav from "@/components/site/MobileBottomNav";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import api from "@/lib/api";
import { SERVICES } from "@/data/seed";

const HYD_AREAS = [
  { name: "Banjara Hills",  lat: 17.4126, lng: 78.4357, pin: "500034" },
  { name: "Jubilee Hills",  lat: 17.4239, lng: 78.4072, pin: "500033" },
  { name: "Madhapur",       lat: 17.4481, lng: 78.3915, pin: "500081" },
  { name: "Hitech City",    lat: 17.4435, lng: 78.3772, pin: "500084" },
  { name: "Gachibowli",     lat: 17.4401, lng: 78.3489, pin: "500032" },
  { name: "Kondapur",       lat: 17.4600, lng: 78.3600, pin: "500084" },
  { name: "Panjagutta",     lat: 17.4270, lng: 78.4441, pin: "500082" },
  { name: "Ameerpet",       lat: 17.4375, lng: 78.4483, pin: "500016" },
  { name: "Masab Tank",     lat: 17.3961, lng: 78.4677, pin: "500028" },
  { name: "Film Nagar",     lat: 17.4082, lng: 78.3979, pin: "500008" },
  { name: "Somajiguda",     lat: 17.4281, lng: 78.4618, pin: "500082" },
  { name: "Begumpet",       lat: 17.4412, lng: 78.4709, pin: "500016" },
  { name: "Kukatpally",     lat: 17.4842, lng: 78.4002, pin: "500072" },
  { name: "KPHB Colony",    lat: 17.4884, lng: 78.3912, pin: "500072" },
  { name: "Secunderabad",   lat: 17.4399, lng: 78.4983, pin: "500003" },
  { name: "Dilsukhnagar",   lat: 17.3686, lng: 78.5263, pin: "500060" },
  { name: "LB Nagar",       lat: 17.3497, lng: 78.5513, pin: "500074" },
  { name: "Manikonda",      lat: 17.4003, lng: 78.3897, pin: "500089" },
  { name: "Kompally",       lat: 17.5456, lng: 78.4691, pin: "500100" },
  { name: "Nizampet",       lat: 17.5053, lng: 78.3873, pin: "500090" },
  { name: "Miyapur",        lat: 17.4963, lng: 78.3544, pin: "500049" },
  { name: "Tolichowki",     lat: 17.3917, lng: 78.4218, pin: "500008" },
  { name: "Mehdipatnam",    lat: 17.3965, lng: 78.4417, pin: "500028" },
  { name: "Nanakramguda",   lat: 17.4177, lng: 78.3560, pin: "500032" },
];

const TIME_SLOTS = [
  "08:00 AM - 09:00 AM","09:00 AM - 10:00 AM","10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM","12:00 PM - 01:00 PM","02:00 PM - 03:00 PM",
  "03:00 PM - 04:00 PM","04:00 PM - 05:00 PM","05:00 PM - 06:00 PM",
  "06:00 PM - 07:00 PM",
];

const STEPS = ["Date & Time", "Your Area", "Beautician", "Confirm"];

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

export default function Book() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { user, isLoggedIn, setAuth } = useAuth();

  const [step, setStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [beauticians, setBeauticians] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [zoneExpanded, setZoneExpanded] = useState(false);
  const [selectedBeautician, setSelectedBeautician] = useState(null);
  const [address, setAddress] = useState({
    full_name: user?.name || "",
    phone: user?.contact?.replace("@", "").match(/^\d/) ? user.contact : "",
    line1: "", line2: "", city: "", state: "Telangana", pin: "",
  });
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [bookingId, setBookingId] = useState(null);

  // OTP auto-login state (for unauthenticated users in confirm step)
  const [otpPhase, setOtpPhase] = useState("idle"); // idle | sending | sent | verifying | verified
  const [otpCode, setOtpCode] = useState("");
  const [otpContact, setOtpContact] = useState(""); // the phone we sent OTP to

  const { data: services = SERVICES } = useQuery({
    queryKey: ["services"],
    queryFn: () => api.get("/services").then(r => r.data),
    placeholderData: SERVICES,
  });

  const service = services.find(s => s.id === serviceId);

  useEffect(() => {
    if (user?.name && !address.full_name)
      setAddress(a => ({ ...a, full_name: user.name }));
  }, [user]);

  useEffect(() => {
    if (selectedArea)
      setAddress(a => ({ ...a, city: selectedArea.name, pin: selectedArea.pin || a.pin }));
  }, [selectedArea]);

  async function doSearch(area) {
    if (!area || !selectedDate || !selectedSlot) return;
    setSearchLoading(true);
    setBeauticians([]);
    setSelectedBeautician(null);
    setSearchDone(false);
    try {
      const { data } = await api.post("/services/search", {
        service_id: serviceId,
        lat: area.lat,
        lng: area.lng,
        date: selectedDate.toISOString().split("T")[0],
        time_slot: selectedSlot,
      });
      setBeauticians(data.beauticians || []);
      setZoneExpanded(data.zone_expanded || false);
      setSearchDone(true);
    } catch {
      toast.error("Could not search beauticians. Try again.");
      setSearchDone(true);
    } finally {
      setSearchLoading(false);
    }
  }

  function handleAreaSelect(area) {
    setSelectedArea(area);
    setSearchDone(false);
    setBeauticians([]);
    doSearch(area);
  }

  function handleGPS() {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported on this browser.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        let nearest = HYD_AREAS[0];
        let minDist = Infinity;
        for (const a of HYD_AREAS) {
          const d = (a.lat - lat) ** 2 + (a.lng - lng) ** 2;
          if (d < minDist) { minDist = d; nearest = a; }
        }
        const gpsArea = { name: `${nearest.name} (GPS)`, lat, lng };
        setSelectedArea(gpsArea);
        setGpsLoading(false);
        doSearch(gpsArea);
        toast.success(`Location detected: near ${nearest.name}`);
      },
      () => {
        setGpsLoading(false);
        toast.error("Could not get your location. Please select your area.");
      },
    );
  }

  // OTP flow helpers
  async function sendOtp(phone) {
    const contact = phone.replace(/\D/g, "").slice(-10);
    if (contact.length < 10) return;
    setOtpPhase("sending");
    setOtpContact(contact);
    try {
      // Check if account exists first — pre-fill name if so
      try {
        const { data: check } = await api.get(`/auth/check-contact?contact=${contact}`);
        if (check.name && !address.full_name) {
          setAddress(a => ({ ...a, full_name: check.name }));
        }
      } catch { /* ignore */ }
      await api.post("/auth/send-otp", { contact });
      setOtpPhase("sent");
      toast.success("OTP sent to your mobile");
    } catch {
      setOtpPhase("idle");
      toast.error("Failed to send OTP. Check the number and try again.");
    }
  }

  async function verifyOtp() {
    if (otpCode.length < 4) return;
    setOtpPhase("verifying");
    try {
      const { data } = await api.post("/auth/verify-otp", { contact: otpContact, otp: otpCode });
      setAuth(data);
      if (data.user?.name && !address.full_name) {
        setAddress(a => ({ ...a, full_name: data.user.name }));
      }
      setOtpPhase("verified");
      toast.success("Verified! Continuing your booking…");
    } catch (err) {
      setOtpPhase("sent"); // back to OTP entry
      toast.error(err.response?.data?.detail || "Incorrect OTP. Try again.");
    }
  }

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
        <Footer /><MobileBottomNav />
      </div>
    );
  }

  const days = getNextDays(14);
  const noCoverage = searchDone && beauticians.length === 0 && selectedArea;

  function canProceed() {
    if (step === 0) return !!(selectedDate && selectedSlot);
    if (step === 1) return !!(selectedArea) && !searchLoading;
    if (step === 2) return !!selectedBeautician;
    if (step === 3) {
      const phone = address.phone.replace(/\D/g, "");
      return !!(
        address.full_name.trim() &&
        phone.length >= 10 &&
        address.line1.trim() &&
        address.pin.replace(/\D/g, "").length === 6
      );
    }
    return true;
  }

  async function handleConfirm() {
    setSubmitting(true);
    try {
      const { data } = await api.post("/bookings", {
        service_id: service.id,
        service_name: service.name,
        service_price: service.price,
        service_duration: service.duration,
        date: selectedDate.toISOString().split("T")[0],
        time_slot: selectedSlot,
        address,
        notes: notes.trim() || undefined,
        beautician_id: selectedBeautician?.id,
        beautician_name: selectedBeautician?.name,
        expansion_ring: selectedBeautician?.expansion_ring ?? 0,
      });
      setBookingId(data.id);
      setDone(true);
    } catch (err) {
      toast.error("Booking failed", { description: err.response?.data?.detail || "Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (step === 1 && !searchDone && selectedArea) doSearch(selectedArea);
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else handleConfirm();
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
          <p className="text-taupe text-sm mb-1">{service.name} · {selectedSlot}</p>
          <p className="text-taupe text-sm mb-6">
            {selectedDate?.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <div className="bg-pearl border border-gold/15 rounded-2xl p-5 max-w-sm w-full text-left mb-6">
            {selectedBeautician && (
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gold/10">
                {selectedBeautician.photo && (
                  <img src={selectedBeautician.photo} alt={selectedBeautician.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium text-espresso">{selectedBeautician.name}</p>
                  <p className="text-xs text-taupe">{selectedBeautician.area} · ⭐ {selectedBeautician.rating}</p>
                </div>
              </div>
            )}
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
            Our beautician will call you 1 hour before arrival. Pay by UPI or cash at your door.
          </p>
          <div className="flex gap-3 flex-wrap justify-center">
            <Button onClick={() => navigate("/services")} variant="outline"
              className="rounded-full border-gold/30 text-espresso px-6">
              Book Another
            </Button>
            <Button onClick={() => navigate("/account")} className="rounded-full bg-espresso text-ivory px-6">
              My Bookings
            </Button>
          </div>
        </main>
        <Footer /><MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory text-espresso">
      <Header />
      <main className="pt-24 md:pt-28 pb-24">
        <div className="max-w-2xl mx-auto px-5 md:px-10">
          <Link to="/services" className="inline-flex items-center gap-1.5 text-sm text-taupe hover:text-espresso mb-6 transition">
            <ArrowLeft className="w-4 h-4" /> All Services
          </Link>

          {/* Service card */}
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
          <div className="flex items-center gap-1 mb-8">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div className={`w-7 h-7 rounded-full text-xs font-medium grid place-items-center shrink-0 transition-colors ${
                  i < step ? "bg-espresso text-ivory" : i === step ? "bg-espresso text-ivory ring-4 ring-espresso/20" : "bg-rosemist text-taupe"
                }`}>
                  {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-[10px] hidden sm:block ${i === step ? "text-espresso font-medium" : "text-taupe"}`}>{s}</span>
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
                          isSelected ? "border-espresso bg-espresso text-ivory" : "border-gold/15 bg-pearl text-espresso hover:border-gold/40"
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
                        selectedSlot === slot ? "border-espresso bg-espresso text-ivory" : "border-gold/15 bg-pearl text-espresso hover:border-gold/40"
                      }`}>
                      {slot}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 1 — Your Area */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="font-serif text-xl text-espresso mb-2 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gold" /> Your Area in Hyderabad
                </h2>
                <p className="text-xs text-taupe mb-5">
                  We'll find the nearest available beautician for{" "}
                  <span className="font-medium text-espresso">{selectedSlot}</span> on{" "}
                  <span className="font-medium text-espresso">
                    {selectedDate?.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>.
                </p>

                <Button variant="outline" onClick={handleGPS} disabled={gpsLoading}
                  className="w-full mb-4 rounded-xl border-gold/30 text-espresso gap-2 h-11">
                  {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4 text-gold" />}
                  {gpsLoading ? "Detecting location…" : "Use My Current Location (GPS)"}
                </Button>

                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gold/15" />
                  <span className="text-[11px] text-taupe uppercase tracking-wider">or select your area</span>
                  <div className="flex-1 h-px bg-gold/15" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {HYD_AREAS.map(area => (
                    <button key={area.name} onClick={() => handleAreaSelect(area)}
                      className={`py-2 px-3 rounded-xl border text-xs font-medium text-left transition-all ${
                        selectedArea?.name === area.name
                          ? "border-espresso bg-espresso text-ivory"
                          : "border-gold/15 bg-pearl text-espresso hover:border-gold/40"
                      }`}>
                      {area.name}
                    </button>
                  ))}
                </div>

                {/* Serviceability feedback */}
                {selectedArea && (
                  <div className="mt-4">
                    {searchLoading && (
                      <div className="flex items-center gap-2 text-xs text-taupe bg-champagne/20 border border-gold/15 rounded-xl px-3 py-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-gold shrink-0" />
                        Checking availability in <span className="font-medium text-espresso">{selectedArea.name}</span>…
                      </div>
                    )}
                    {!searchLoading && noCoverage && (
                      <div className="flex items-start gap-2.5 text-xs bg-red-50 border border-red-200 rounded-xl px-3 py-3">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-700">No beauticians available in {selectedArea.name}</p>
                          <p className="text-red-500 mt-0.5">for this slot. Try a nearby area or change the date/time.</p>
                        </div>
                      </div>
                    )}
                    {!searchLoading && searchDone && beauticians.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        <span>{beauticians.length} beautician{beauticians.length !== 1 ? "s" : ""} available near <strong>{selectedArea.name}</strong></span>
                        {zoneExpanded && <span className="text-green-600/70">(expanded zone)</span>}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 2 — Choose Beautician */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="font-serif text-xl text-espresso mb-2 flex items-center gap-2">
                  <User className="w-5 h-5 text-gold" /> Select Your Beautician
                </h2>

                {searchLoading ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-taupe">
                    <Loader2 className="w-8 h-8 animate-spin text-gold" />
                    <p className="text-sm">Searching near {selectedArea?.name}…</p>
                  </div>
                ) : beauticians.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-taupe text-sm mb-2">No beauticians available at this slot.</p>
                    <p className="text-xs text-taupe">Try a different time or date.</p>
                    <Button variant="outline" onClick={() => setStep(0)} className="mt-4 rounded-full border-gold/30 px-6">
                      Change Date/Time
                    </Button>
                  </div>
                ) : (
                  <>
                    {zoneExpanded && (
                      <div className="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                        ⚡ All beauticians in {selectedArea?.name} are booked — showing nearest from surrounding areas.
                      </div>
                    )}
                    <p className="text-xs text-taupe mb-4">
                      {beauticians.length} beautician{beauticians.length !== 1 ? "s" : ""} available · ranked by distance & rating
                    </p>
                    <div className="space-y-3">
                      {beauticians.map((b) => (
                        <button key={b.id} onClick={() => setSelectedBeautician(b)}
                          className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${
                            selectedBeautician?.id === b.id
                              ? "border-espresso bg-espresso/5 ring-2 ring-espresso/20"
                              : "border-gold/15 bg-pearl hover:border-gold/40"
                          }`}>
                          {b.photo ? (
                            <img src={b.photo} alt={b.name}
                              className="w-14 h-14 rounded-full object-cover shrink-0 border-2 border-gold/20" />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-rosemist/50 grid place-items-center shrink-0">
                              <User className="w-6 h-6 text-taupe" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-espresso text-sm">{b.name}</p>
                            <p className="text-xs text-taupe mt-0.5">{b.area}</p>
                            <div className="flex items-center gap-3 mt-1.5 text-xs">
                              <span className="flex items-center gap-1 text-gold font-medium">
                                <Star className="w-3 h-3 fill-gold" />{b.rating}
                              </span>
                              <span className="text-taupe">{b.reviews_count} reviews</span>
                              <span className="text-taupe">
                                <MapPin className="w-3 h-3 inline mr-0.5" />{b.distance_km} km away
                              </span>
                            </div>
                          </div>
                          {selectedBeautician?.id === b.id && (
                            <CheckCircle2 className="w-5 h-5 text-espresso shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* STEP 3 — Confirm */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="font-serif text-xl text-espresso mb-5 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-gold" /> Review & Confirm
                </h2>
                <div className="space-y-4">

                  {selectedBeautician && (
                    <InfoBlock title="Your Beautician">
                      <div className="flex items-center gap-3">
                        {selectedBeautician.photo && (
                          <img src={selectedBeautician.photo} alt={selectedBeautician.name}
                            className="w-10 h-10 rounded-full object-cover shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-espresso">{selectedBeautician.name}</p>
                          <p className="text-xs text-taupe">
                            {selectedBeautician.area} · ⭐ {selectedBeautician.rating} · {selectedBeautician.distance_km} km away
                          </p>
                        </div>
                      </div>
                    </InfoBlock>
                  )}

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

                  {/* Address */}
                  <div className="bg-pearl border border-gold/15 rounded-2xl p-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-taupe mb-3">Your Address</p>
                    <div className="space-y-3">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <Field label="Full Name *" value={address.full_name}
                          onChange={v => setAddress(a => ({ ...a, full_name: v }))} placeholder="Your name" />
                        {/* Phone field with inline OTP */}
                        <div>
                          <label className="block text-xs text-taupe mb-1.5">Mobile * {isLoggedIn || otpPhase === "verified" ? <span className="text-green-600 font-medium">✓ Verified</span> : ""}</label>
                          <div className="flex gap-2">
                            <input
                              type="tel"
                              value={address.phone}
                              onChange={e => {
                                const v = e.target.value.replace(/\D/g, "").slice(0, 10);
                                setAddress(a => ({ ...a, phone: v }));
                                if (otpPhase !== "idle") { setOtpPhase("idle"); setOtpCode(""); }
                              }}
                              placeholder="10-digit mobile"
                              disabled={otpPhase === "verified" || isLoggedIn}
                              className="flex-1 h-10 rounded-xl border border-gold/20 bg-white px-3 text-sm text-espresso focus:outline-none focus:border-espresso focus:ring-1 focus:ring-espresso/20 placeholder:text-taupe/50 disabled:bg-stone-50"
                            />
                            {!isLoggedIn && otpPhase === "idle" && address.phone.replace(/\D/g, "").length === 10 && (
                              <Button size="sm" onClick={() => sendOtp(address.phone)}
                                className="h-10 px-3 rounded-xl bg-espresso text-ivory text-xs shrink-0">
                                Send OTP
                              </Button>
                            )}
                            {otpPhase === "sending" && <Loader2 className="w-5 h-5 animate-spin text-gold self-center shrink-0" />}
                          </div>
                          {/* OTP input row */}
                          {(otpPhase === "sent" || otpPhase === "verifying") && (
                            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 mt-2">
                              <input
                                type="tel"
                                inputMode="numeric"
                                value={otpCode}
                                onChange={e => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder="Enter OTP"
                                className="flex-1 h-10 rounded-xl border border-gold/20 bg-white px-3 text-sm text-espresso focus:outline-none focus:border-espresso tracking-widest"
                              />
                              <Button size="sm" disabled={otpPhase === "verifying" || otpCode.length < 4}
                                onClick={verifyOtp}
                                className="h-10 px-3 rounded-xl bg-green-600 text-white text-xs shrink-0 hover:bg-green-700 disabled:opacity-50">
                                {otpPhase === "verifying" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                              </Button>
                              <button type="button" onClick={() => sendOtp(address.phone)}
                                className="text-xs text-taupe hover:text-espresso shrink-0 self-center">Resend</button>
                            </motion.div>
                          )}
                          {!isLoggedIn && otpPhase === "idle" && address.phone.replace(/\D/g, "").length < 10 && (
                            <p className="text-[10px] text-taupe/70 mt-1">Enter your mobile to verify & save this booking to your account.</p>
                          )}
                        </div>
                      </div>
                      <Field label="Address Line 1 *" value={address.line1}
                        onChange={v => setAddress(a => ({ ...a, line1: v }))} placeholder="Flat/House No, Street, Locality" />
                      <Field label="Landmark (optional)" value={address.line2}
                        onChange={v => setAddress(a => ({ ...a, line2: v }))} placeholder="Near landmark" />
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="City *" value={address.city}
                          onChange={v => setAddress(a => ({ ...a, city: v }))} placeholder="City" />
                        <Field label="PIN *" value={address.pin} type="tel" maxLength={6}
                          onChange={v => setAddress(a => ({ ...a, pin: v.replace(/\D/g, "") }))} placeholder="PIN Code" />
                      </div>
                      <div>
                        <label className="block text-xs text-taupe mb-1.5">Special requests (optional)</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                          placeholder="Any allergies, preferences or instructions…"
                          className="w-full rounded-xl border border-gold/20 bg-white px-3 py-2 text-sm text-espresso resize-none focus:outline-none focus:border-espresso focus:ring-1 focus:ring-espresso/20 placeholder:text-taupe/50" />
                      </div>
                    </div>
                  </div>

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
              disabled={!canProceed() || submitting || searchLoading}
              onClick={handleNext}
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
      <Footer /><MobileBottomNav />
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", maxLength }) {
  return (
    <div>
      <label className="block text-xs text-taupe mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} maxLength={maxLength}
        className="w-full h-10 rounded-xl border border-gold/20 bg-white px-3 text-sm text-espresso focus:outline-none focus:border-espresso focus:ring-1 focus:ring-espresso/20 placeholder:text-taupe/50" />
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
