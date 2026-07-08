import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scissors, ArrowRight, ArrowLeft, CheckCircle2, Loader2,
  Camera, Upload, User, Phone, Mail, MapPin, Briefcase, Star,
  ClipboardList, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import api, { isNetworkError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Seo from "@/components/site/Seo";

const HYD_AREAS = [
  "Banjara Hills","Jubilee Hills","Madhapur","Hitech City","Gachibowli","Kondapur",
  "Panjagutta","Ameerpet","Masab Tank","Film Nagar","Somajiguda","Begumpet",
  "Kukatpally","KPHB Colony","Secunderabad","Dilsukhnagar","LB Nagar","Manikonda",
  "Kompally","Nizampet","Miyapur","Tolichowki","Mehdipatnam","Nanakramguda",
];

const SKILLS = [
  { id: "s1", label: "Korean Glow Facial" },
  { id: "s2", label: "Saffron Cleanup" },
  { id: "s3", label: "Bridal Makeup" },
  { id: "s4", label: "Pedicure" },
  { id: "s5", label: "Hair Spa" },
  { id: "s6", label: "Manicure" },
  { id: "s7", label: "Waxing" },
  { id: "s8", label: "Party Makeup" },
];

const ID_TYPES = [
  { value: "aadhaar", label: "Aadhaar Card" },
  { value: "pan", label: "PAN Card" },
  { value: "driving_license", label: "Driving Licence" },
];

const STEPS = ["Personal Details", "Skills & Experience", "Identity Proof", "Review & Submit"];

const EMPTY = {
  name: "", phone: "", email: "", area: "",
  experience_years: 0, skills: [],
  selfie_b64: "", id_proof_b64: "", id_type: "aadhaar",
};

function compressToBase64(file, maxWidth = 720, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image load failed")); };
    img.src = url;
  });
}

export default function BeauticianApply() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Determine if we need an initial status check before showing the form
  const sessionPhone = user?.contact && !user.contact.includes("@")
    ? user.contact.replace(/\D/g, "").slice(-10)
    : null;

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    phone: sessionPhone || "",
  }));
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [statusChecking, setStatusChecking] = useState(!!sessionPhone);
  const [existingStatus, setExistingStatus] = useState(null);
  const selfieRef = useRef();
  const idProofRef = useRef();

  // On mount: if logged-in beautician, check whether they already have an application
  useEffect(() => {
    if (!sessionPhone) return;
    api.get(`/beauticians/profile?phone=${sessionPhone}`)
      .then(() => navigate("/duty", { replace: true }))
      .catch(async (err) => {
        if (err.response?.status === 404) {
          try {
            const { data } = await api.get(`/beauticians/application-status?phone=${sessionPhone}`);
            if (data.status && data.status !== "none") setExistingStatus(data);
          } catch { /* no application — show form normally */ }
        }
        setStatusChecking(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function toggleSkill(id) {
    setForm(f => ({
      ...f,
      skills: f.skills.includes(id) ? f.skills.filter(s => s !== id) : [...f.skills, id],
    }));
  }

  async function handleFileChange(e, field) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { toast.error("Image must be under 15 MB"); return; }
    try {
      const b64 = await compressToBase64(file);
      setField(field, b64);
    } catch {
      toast.error("Failed to read image. Try again.");
    }
  }

  function validateStep() {
    if (step === 0) {
      if (!form.name.trim()) return "Full name is required";
      if (form.phone.replace(/\D/g, "").length < 10) return "Enter a valid 10-digit mobile number";
      if (!form.area) return "Select your service area";
    }
    if (step === 1) {
      if (form.skills.length === 0) return "Select at least one skill";
    }
    if (step === 2) {
      if (!form.selfie_b64) return "Upload your selfie photo";
      if (!form.id_proof_b64) return "Upload your ID proof";
    }
    return null;
  }

  function nextStep() {
    const err = validateStep();
    if (err) { toast.error(err); return; }
    setStep(s => s + 1);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await api.post("/beauticians/apply", {
        ...form,
        phone: form.phone.replace(/\D/g, "").slice(-10),
        experience_years: Number(form.experience_years),
      });
      setSubmitted(true);
    } catch (err) {
      const msg = err.response?.data?.detail;
      if (err.response?.status === 409) {
        toast.error("An application already exists for this number. Check your status at the Beautician Portal.");
      } else if (err.response?.status === 413) {
        toast.error("Your photos are too large to upload. Please re-upload both photos (they will be re-compressed) and try again.", { duration: 8000 });
      } else if (isNetworkError(err)) {
        toast.error("Network is slow — please check your connection and try again.", { duration: 8000 });
      } else {
        toast.error(msg || "Submission failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (statusChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  if (existingStatus?.status === "pending_review") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-white flex flex-col items-center justify-center px-5 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="w-20 h-20 rounded-full bg-amber-500/15 border border-amber-400/30 grid place-items-center mx-auto mb-5">
            <ClipboardList className="w-9 h-9 text-amber-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Application Under Review</h2>
          <p className="text-sm text-white/50 mb-6 leading-relaxed">
            Our team is reviewing your documents. This usually takes 2–3 business days.
            We'll notify you once a decision is made.
          </p>
          <div className="bg-amber-500/10 border border-amber-400/20 rounded-2xl p-4 text-left text-xs text-amber-200/70 space-y-1.5 mb-6 max-w-xs mx-auto">
            {existingStatus.name && <p><strong className="text-amber-300">Name:</strong> {existingStatus.name}</p>}
            {existingStatus.area && <p><strong className="text-amber-300">Area:</strong> {existingStatus.area}</p>}
            <p><strong className="text-amber-300">Status:</strong> Pending Review</p>
          </div>
          <button onClick={() => navigate("/duty")}
            className="rounded-full bg-gold text-espresso font-semibold h-11 px-6 inline-flex items-center hover:bg-gold/90 text-sm">
            Go to Beautician Portal
          </button>
        </motion.div>
      </div>
    );
  }

  if (existingStatus?.status === "rejected") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-white flex flex-col items-center justify-center px-5 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="w-20 h-20 rounded-full bg-red-500/15 border border-red-400/30 grid place-items-center mx-auto mb-5">
            <AlertCircle className="w-9 h-9 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Previous Application Not Approved</h2>
          {existingStatus.rejection_reason && (
            <div className="bg-red-500/10 border border-red-400/20 rounded-2xl p-4 mb-5 text-left max-w-xs mx-auto">
              <p className="text-xs text-red-300/70 uppercase tracking-widest mb-1">Reason</p>
              <p className="text-sm text-white/70">{existingStatus.rejection_reason}</p>
            </div>
          )}
          <p className="text-sm text-white/50 mb-6">
            You can re-apply with updated documents. Your phone number will be pre-filled.
          </p>
          <button onClick={() => setExistingStatus(null)}
            className="rounded-full bg-gold text-espresso font-semibold h-11 px-6 inline-flex items-center hover:bg-gold/90 text-sm">
            Re-apply Now
          </button>
        </motion.div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-white flex flex-col items-center justify-center px-5 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring" }}>
          <div className="w-24 h-24 rounded-full bg-green-500/20 border border-green-400/30 grid place-items-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-400" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Application Submitted!</h2>
          <p className="text-white/60 max-w-xs mx-auto mb-8 text-sm leading-relaxed">
            Our team will review your documents and get back to you within 2–3 business days.
            You can check your status on the Beautician Portal.
          </p>
          <div className="flex flex-col gap-3 max-w-[200px] mx-auto">
            <Button onClick={() => navigate("/duty")}
              className="rounded-full bg-gold text-espresso font-semibold hover:bg-gold/90 h-11">
              Check My Status
            </Button>
            <Button onClick={() => navigate("/")} variant="ghost"
              className="rounded-full text-white/50 hover:text-white/80 h-11">
              Back to Home
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-white flex flex-col">
      <Seo title="Join as a Beautician" description="Work with ZiyaNisa — flexible at-home beauty service work in Hyderabad." path="/beautician/apply" />
      {/* Header */}
      <div className="px-5 pt-8 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl bg-white/10 grid place-items-center hover:bg-white/15 transition">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gold/20 grid place-items-center">
            <Scissors className="w-4 h-4 text-gold" />
          </div>
          <span className="font-semibold text-sm">Beautician Application</span>
        </div>
      </div>

      {/* Step progress */}
      <div className="px-5 mb-6">
        <div className="flex items-center gap-1">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-1 flex-1">
              <div className={`w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold shrink-0 transition-colors ${
                i < step ? "bg-green-500 text-white" : i === step ? "bg-gold text-espresso" : "bg-white/10 text-white/40"
              }`}>
                {i < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 rounded-full transition-colors ${i < step ? "bg-green-500" : "bg-white/10"}`} />
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-white/40 mt-2">{STEPS[step]}</p>
      </div>

      <div className="flex-1 px-5 pb-10 max-w-sm mx-auto w-full">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
              <h2 className="text-lg font-semibold text-white mb-5">Tell us about yourself</h2>

              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <User className="w-3 h-3" /> Full Name *
                </label>
                <input
                  value={form.name}
                  onChange={e => setField("name", e.target.value)}
                  placeholder="Priya Sharma"
                  className="w-full h-12 bg-white/10 border border-white/15 rounded-xl px-4 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/20"
                />
              </div>

              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Phone className="w-3 h-3" /> Mobile Number *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-sm">+91</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="98765 43210"
                    inputMode="numeric"
                    className="w-full h-12 bg-white/10 border border-white/15 rounded-xl pl-14 pr-4 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Mail className="w-3 h-3" /> Email (optional)
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setField("email", e.target.value)}
                  placeholder="priya@email.com"
                  className="w-full h-12 bg-white/10 border border-white/15 rounded-xl px-4 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/20"
                />
              </div>

              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <MapPin className="w-3 h-3" /> Primary Service Area *
                </label>
                <select
                  value={form.area}
                  onChange={e => setField("area", e.target.value)}
                  className="w-full h-12 bg-white/10 border border-white/15 rounded-xl px-4 text-white text-sm focus:outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/20 appearance-none"
                >
                  <option value="" className="bg-[#1a1a2e] text-white/40">Select area…</option>
                  {HYD_AREAS.map(a => (
                    <option key={a} value={a} className="bg-[#1a1a2e] text-white">{a}</option>
                  ))}
                </select>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-5">
              <h2 className="text-lg font-semibold text-white mb-1">Your skills & experience</h2>

              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Briefcase className="w-3 h-3" /> Years of experience
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={form.experience_years}
                  onChange={e => setField("experience_years", e.target.value)}
                  className="w-full h-12 bg-white/10 border border-white/15 rounded-xl px-4 text-white text-sm focus:outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/20"
                />
              </div>

              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <Star className="w-3 h-3 text-gold" /> Services you offer * (select all that apply)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SKILLS.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleSkill(id)}
                      className={`px-3 py-2.5 rounded-xl text-xs text-left transition-colors border ${
                        form.skills.includes(id)
                          ? "bg-gold/20 border-gold/60 text-gold"
                          : "bg-white/5 border-white/10 text-white/60 hover:border-white/25"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
              <h2 className="text-lg font-semibold text-white mb-1">Upload your documents</h2>
              <p className="text-xs text-white/40 -mt-2">Photos are stored securely and only visible to ZiyaNisa admins.</p>

              {/* Selfie */}
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <Camera className="w-3 h-3" /> Selfie Photo *
                </label>
                <input ref={selfieRef} type="file" accept="image/*" capture="user" className="hidden"
                  onChange={e => handleFileChange(e, "selfie_b64")} />
                <button
                  type="button"
                  onClick={() => selfieRef.current?.click()}
                  className="w-full rounded-2xl border-2 border-dashed border-white/20 hover:border-gold/40 transition-colors overflow-hidden"
                >
                  {form.selfie_b64 ? (
                    <img src={form.selfie_b64} alt="Selfie" className="w-full h-48 object-cover" />
                  ) : (
                    <div className="h-48 flex flex-col items-center justify-center gap-2 text-white/30">
                      <Camera className="w-10 h-10" />
                      <span className="text-xs">Tap to take selfie or upload photo</span>
                    </div>
                  )}
                </button>
                {form.selfie_b64 && (
                  <button type="button" onClick={() => selfieRef.current?.click()}
                    className="mt-2 text-xs text-white/40 hover:text-white/60 flex items-center gap-1">
                    <Upload className="w-3 h-3" /> Change photo
                  </button>
                )}
              </div>

              {/* ID Proof */}
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <Upload className="w-3 h-3" /> ID Proof *
                </label>
                <select
                  value={form.id_type}
                  onChange={e => setField("id_type", e.target.value)}
                  className="w-full h-11 bg-white/10 border border-white/15 rounded-xl px-4 text-white text-sm focus:outline-none focus:border-gold/50 mb-3 appearance-none"
                >
                  {ID_TYPES.map(t => (
                    <option key={t.value} value={t.value} className="bg-[#1a1a2e] text-white">{t.label}</option>
                  ))}
                </select>
                <input ref={idProofRef} type="file" accept="image/*" className="hidden"
                  onChange={e => handleFileChange(e, "id_proof_b64")} />
                <button
                  type="button"
                  onClick={() => idProofRef.current?.click()}
                  className="w-full rounded-2xl border-2 border-dashed border-white/20 hover:border-gold/40 transition-colors overflow-hidden"
                >
                  {form.id_proof_b64 ? (
                    <img src={form.id_proof_b64} alt="ID Proof" className="w-full h-40 object-cover" />
                  ) : (
                    <div className="h-40 flex flex-col items-center justify-center gap-2 text-white/30">
                      <Upload className="w-10 h-10" />
                      <span className="text-xs">Upload {ID_TYPES.find(t => t.value === form.id_type)?.label}</span>
                    </div>
                  )}
                </button>
                {form.id_proof_b64 && (
                  <button type="button" onClick={() => idProofRef.current?.click()}
                    className="mt-2 text-xs text-white/40 hover:text-white/60 flex items-center gap-1">
                    <Upload className="w-3 h-3" /> Change document
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
              <h2 className="text-lg font-semibold text-white mb-4">Review your application</h2>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                <Row label="Name" value={form.name} />
                <Row label="Mobile" value={`+91 ${form.phone}`} />
                {form.email && <Row label="Email" value={form.email} />}
                <Row label="Area" value={form.area} />
                <Row label="Experience" value={`${form.experience_years} year${Number(form.experience_years) !== 1 ? "s" : ""}`} />
                <Row label="Skills" value={form.skills.map(id => SKILLS.find(s => s.id === id)?.label).join(", ")} />
                <Row label="ID Type" value={ID_TYPES.find(t => t.value === form.id_type)?.label} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {form.selfie_b64 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Selfie</p>
                    <img src={form.selfie_b64} alt="Selfie" className="w-full h-28 object-cover rounded-xl" />
                  </div>
                )}
                {form.id_proof_b64 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">ID Proof</p>
                    <img src={form.id_proof_b64} alt="ID Proof" className="w-full h-28 object-cover rounded-xl" />
                  </div>
                )}
              </div>

              <p className="text-[11px] text-white/30 leading-relaxed">
                By submitting, you agree to ZiyaNisa's beautician partner terms. Your documents are stored securely and used only for verification purposes.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="mt-8 flex gap-3">
          {step > 0 && (
            <Button type="button" variant="ghost" onClick={() => setStep(s => s - 1)}
              className="flex-1 h-12 rounded-xl text-white/60 hover:text-white hover:bg-white/10 border border-white/10">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={nextStep}
              className="flex-1 h-12 rounded-xl bg-gold text-espresso font-semibold hover:bg-gold/90">
              Continue <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={submitting}
              className="flex-1 h-12 rounded-xl bg-gold text-espresso font-semibold hover:bg-gold/90 disabled:opacity-50">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Application"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-xs text-white/40 shrink-0">{label}</span>
      <span className="text-xs text-white/80 text-right">{value}</span>
    </div>
  );
}
