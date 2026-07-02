import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scissors, Loader2, CheckCircle2, XCircle, TrendingUp,
  Phone, MapPin, Star, CalendarDays, Zap, ToggleLeft, ToggleRight,
  ClipboardList, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const SKILL_NAMES = {
  s1: "Korean Glow Facial", s2: "Saffron Cleanup", s3: "Bridal Makeup",
  s4: "Pedicure", s5: "Hair Spa", s6: "Manicure", s7: "Waxing", s8: "Party Makeup",
};

export default function BeauticianPortal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [phone, setPhone] = useState("");
  const [profile, setProfile] = useState(null);
  const [application, setApplication] = useState(null); // null | {status, rejection_reason, ...}
  const [surgeZones, setSurgeZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function doLookup(digits) {
    setLoading(true);
    try {
      const [profRes, surgeRes] = await Promise.all([
        api.get(`/beauticians/profile?phone=${digits}`),
        api.get("/beauticians/surge-zones"),
      ]);
      setProfile(profRes.data);
      setApplication(null);
      setSurgeZones(surgeRes.data || []);
    } catch (err) {
      if (err.response?.status === 404) {
        try {
          const appRes = await api.get(`/beauticians/application-status?phone=${digits}`);
          setApplication(appRes.data);
        } catch {
          setApplication({ status: "none" });
        }
      } else {
        toast.error("Could not fetch profile. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleLookup(e) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) { toast.error("Enter a valid 10-digit mobile number"); return; }
    await doLookup(digits);
  }

  // Auto-load profile for logged-in users so refresh doesn't reset the page
  useEffect(() => {
    if (!user?.contact || user.contact.includes("@")) return;
    const digits = user.contact.replace(/\D/g, "").slice(-10);
    if (digits.length < 10) return;
    setPhone(digits);
    doLookup(digits);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDutyToggle(newStatus) {
    setToggling(true);
    let locationPayload = {};
    if (newStatus && navigator.geolocation) {
      try {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 6000, maximumAge: 60000 })
        );
        locationPayload = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch {
        toast("Location not detected — using registered area", { icon: "📍" });
      }
    }
    try {
      const { data } = await api.patch("/beauticians/duty", {
        phone: profile.phone,
        on_duty: newStatus,
        ...locationPayload,
      });
      setProfile(prev => ({ ...prev, on_duty: data.on_duty, area: data.area || prev.area }));
      if (newStatus) {
        toast.success(
          locationPayload.lat
            ? `On Duty — customers near ${data.area || "your location"} can book you!`
            : "You're now On Duty — customers can book you!"
        );
      } else {
        toast.success("You're now Off Duty");
      }
    } catch {
      toast.error("Failed to update status. Try again.");
    } finally {
      setToggling(false);
    }
  }

  const isOnDuty = profile?.on_duty !== false;
  const isSurgeZone = profile && surgeZones.some(z => z.area === profile.area);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-white flex flex-col">
      {/* Header */}
      <div className="px-5 pt-8 pb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gold/20 grid place-items-center">
          <Scissors className="w-5 h-5 text-gold" />
        </div>
        <div>
          <h1 className="font-semibold text-sm text-white">ZiyaNisa Beautician Portal</h1>
          <p className="text-[11px] text-white/50">Manage your duty & earning opportunities</p>
        </div>
      </div>

      <div className="flex-1 px-5 pb-10 max-w-sm mx-auto w-full">
        <AnimatePresence mode="wait">

          {/* Application status screens */}
          {!profile && application && (
            <motion.div key="app-status" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-10">
              {application.status === "pending_review" && (
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-amber-500/15 border border-amber-400/30 grid place-items-center mx-auto mb-5">
                    <ClipboardList className="w-9 h-9 text-amber-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2">Application Under Review</h2>
                  <p className="text-sm text-white/50 mb-6 leading-relaxed">
                    Our team is reviewing your documents. This usually takes 2–3 business days.
                    We'll notify you once a decision is made.
                  </p>
                  <div className="bg-amber-500/10 border border-amber-400/20 rounded-2xl p-4 text-left text-xs text-amber-200/70 space-y-1.5">
                    <p><strong className="text-amber-300">Name:</strong> {application.name}</p>
                    <p><strong className="text-amber-300">Area:</strong> {application.area}</p>
                    <p><strong className="text-amber-300">Status:</strong> Pending Review</p>
                  </div>
                  <button onClick={() => { setApplication(null); setPhone(""); }}
                    className="mt-6 text-xs text-white/30 hover:text-white/50">
                    ← Use a different number
                  </button>
                </div>
              )}

              {application.status === "rejected" && (
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-red-500/15 border border-red-400/30 grid place-items-center mx-auto mb-5">
                    <AlertCircle className="w-9 h-9 text-red-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2">Application Not Approved</h2>
                  {application.rejection_reason && (
                    <div className="bg-red-500/10 border border-red-400/20 rounded-2xl p-4 mb-5 text-left">
                      <p className="text-xs text-red-300/70 uppercase tracking-widest mb-1">Reason</p>
                      <p className="text-sm text-white/70">{application.rejection_reason}</p>
                    </div>
                  )}
                  <p className="text-sm text-white/50 mb-6">
                    You may re-apply with updated documents.
                  </p>
                  <Button onClick={() => navigate("/beautician/apply")}
                    className="rounded-full bg-gold text-espresso font-semibold h-11 px-6 hover:bg-gold/90">
                    Re-apply Now
                  </Button>
                  <button onClick={() => { setApplication(null); setPhone(""); }}
                    className="mt-4 block mx-auto text-xs text-white/30 hover:text-white/50">
                    ← Use a different number
                  </button>
                </div>
              )}

              {application.status === "none" && (
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-gold/10 border border-gold/20 grid place-items-center mx-auto mb-5">
                    <Scissors className="w-9 h-9 text-gold" />
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2">Not Registered Yet</h2>
                  <p className="text-sm text-white/50 mb-6 leading-relaxed">
                    No beautician account or application found for this number.
                    Apply now to join ZiyaNisa's partner network.
                  </p>
                  <Button onClick={() => navigate("/beautician/apply")}
                    className="rounded-full bg-gold text-espresso font-semibold h-11 px-7 hover:bg-gold/90 w-full">
                    Apply as Beautician
                  </Button>
                  <button onClick={() => { setApplication(null); setPhone(""); }}
                    className="mt-4 text-xs text-white/30 hover:text-white/50">
                    ← Try a different number
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Phone Entry */}
          {!profile && !application && (
            <motion.div key="lookup" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mt-10 mb-8 text-center">
                <div className="w-20 h-20 rounded-full bg-gold/10 border border-gold/20 grid place-items-center mx-auto mb-5">
                  <Phone className="w-9 h-9 text-gold" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-1">Enter Your Mobile</h2>
                <p className="text-sm text-white/50">
                  Use the phone number registered with ZiyaNisa
                </p>
              </div>

              <form onSubmit={handleLookup} className="space-y-4">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-sm">+91</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="98765 43210"
                    inputMode="numeric"
                    className="w-full h-14 bg-white/10 border border-white/15 rounded-2xl pl-14 pr-4 text-white text-lg tracking-wider placeholder:text-white/25 focus:outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/20"
                  />
                </div>
                <Button type="submit" disabled={loading || phone.replace(/\D/g,"").length < 10}
                  className="w-full h-12 rounded-xl bg-gold text-espresso font-semibold text-sm hover:bg-gold/90 disabled:opacity-40">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Get My Profile"}
                </Button>
              </form>

              <div className="mt-10 bg-white/5 border border-white/10 rounded-2xl p-5">
                <p className="text-[11px] uppercase tracking-widest text-white/40 mb-3">What you can do here</p>
                <ul className="space-y-2.5">
                  {[
                    "Toggle On/Off duty in real-time",
                    "See today's assigned bookings",
                    "Spot surge zones near you",
                    "Know when customers are looking",
                  ].map(t => (
                    <li key={t} className="flex items-center gap-2 text-sm text-white/70">
                      <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}

          {/* Profile Dashboard */}
          {profile && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              {/* Profile card */}
              <div className="mt-6 bg-white/8 border border-white/10 rounded-3xl p-5 mb-4">
                <div className="flex items-center gap-4 mb-4">
                  {profile.photo ? (
                    <img src={profile.photo} alt={profile.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-gold/30 shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/20 grid place-items-center shrink-0">
                      <Scissors className="w-7 h-7 text-gold" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-base">{profile.name}</p>
                    <p className="text-xs text-white/50 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />{profile.area}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-gold" />{profile.rating}
                      </span>
                      <span className="text-xs text-white/40">·</span>
                      <span className="text-xs text-white/50">{profile.reviews_count} reviews</span>
                    </div>
                  </div>
                </div>
                {/* Skills */}
                <div className="flex flex-wrap gap-1.5">
                  {(profile.skills || []).map(sk => (
                    <span key={sk} className="text-[11px] bg-white/10 text-white/70 px-2.5 py-1 rounded-full">
                      {SKILL_NAMES[sk] || sk}
                    </span>
                  ))}
                </div>
              </div>

              {/* Today's bookings */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
                  <CalendarDays className="w-5 h-5 text-gold mb-2" />
                  <p className="text-2xl font-bold text-white">{profile.bookings_today}</p>
                  <p className="text-xs text-white/50 mt-0.5">Bookings today</p>
                </div>
                <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
                  <TrendingUp className="w-5 h-5 text-green-400 mb-2" />
                  <p className="text-2xl font-bold text-white">{profile.area.split(" ")[0]}</p>
                  <p className="text-xs text-white/50 mt-0.5">Your service zone</p>
                </div>
              </div>

              {/* Surge zone alert */}
              {isSurgeZone && (
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
                  className="bg-amber-500/15 border border-amber-400/30 rounded-2xl p-4 mb-4 flex items-start gap-3">
                  <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-300">Surge Zone — {profile.area}</p>
                    <p className="text-xs text-amber-200/70 mt-0.5">
                      Very few beauticians on duty here. Go online now to grab more bookings!
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Duty toggle — the main action */}
              <div className={`rounded-3xl border p-6 mb-4 transition-colors ${
                isOnDuty ? "bg-green-500/10 border-green-500/25" : "bg-white/5 border-white/10"
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold text-white text-base">Duty Status</p>
                    <p className="text-xs text-white/50 mt-0.5">
                      {isOnDuty
                        ? "Customers can book you right now"
                        : "You won't appear in search results"}
                    </p>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                    isOnDuty ? "bg-green-500/20 text-green-300" : "bg-white/10 text-white/50"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnDuty ? "bg-green-400 animate-pulse" : "bg-white/30"}`} />
                    {isOnDuty ? "On Duty" : "Off Duty"}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    disabled={toggling}
                    onClick={() => handleDutyToggle(!isOnDuty)}
                    className={`relative w-16 h-8 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gold/30 ${
                      isOnDuty ? "bg-green-500" : "bg-white/20"
                    } disabled:opacity-50`}>
                    <motion.span
                      layout
                      className="absolute top-1 w-6 h-6 rounded-full bg-white shadow"
                      animate={{ left: isOnDuty ? "calc(100% - 1.75rem)" : "0.25rem" }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  </button>
                  <span className="text-sm text-white/70">
                    {toggling ? "Updating…" : isOnDuty ? "Tap to go Off Duty" : "Tap to go On Duty"}
                  </span>
                  {toggling && <Loader2 className="w-4 h-4 animate-spin text-white/50" />}
                </div>
              </div>

              {/* Surge zones nearby */}
              {surgeZones.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
                  <p className="text-[11px] uppercase tracking-widest text-white/40 mb-3">
                    Surge zones right now
                  </p>
                  <div className="space-y-2">
                    {surgeZones.slice(0, 5).map(z => (
                      <div key={z.area} className="flex items-center justify-between">
                        <span className="text-sm text-white/70 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          {z.area}
                        </span>
                        <span className="text-xs text-amber-300 font-medium">
                          {z.on_duty_count === 0 ? "No one on duty" : `${z.on_duty_count} on duty`}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-white/30 mt-3">
                    Areas with few on-duty beauticians — go online to capture these bookings.
                  </p>
                </div>
              )}

              <button onClick={() => { setProfile(null); setPhone(""); }}
                className="w-full text-center text-xs text-white/30 hover:text-white/50 py-2 transition">
                ← Switch account
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
