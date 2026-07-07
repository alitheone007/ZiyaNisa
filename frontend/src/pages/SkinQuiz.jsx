import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/site/Header";
import Seo from "@/components/site/Seo";
import Footer from "@/components/site/Footer";
import MobileBottomNav from "@/components/site/MobileBottomNav";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import api from "@/lib/api";

const STEPS = [
  {
    key: "skin_type",
    title: "What's your skin type?",
    subtitle: "This helps us recommend products that work with your skin, not against it.",
    type: "single",
    options: [
      { value: "oily",        label: "Oily",        desc: "Shiny T-zone, prone to breakouts",     icon: "💧" },
      { value: "dry",         label: "Dry",          desc: "Tight, flaky, craves moisture",        icon: "🌵" },
      { value: "combination", label: "Combination",  desc: "Oily T-zone, dry cheeks",              icon: "☯️" },
      { value: "normal",      label: "Normal",       desc: "Balanced, rarely reacts",              icon: "✨" },
      { value: "sensitive",   label: "Sensitive",    desc: "Reacts easily, prone to redness",      icon: "🌸" },
    ],
  },
  {
    key: "concerns",
    title: "What are your skin concerns?",
    subtitle: "Select all that apply — we'll address each one.",
    type: "multi",
    options: [
      { value: "acne",        label: "Acne & Breakouts",  icon: "🔴" },
      { value: "dark_spots",  label: "Dark Spots",         icon: "🟤" },
      { value: "aging",       label: "Fine Lines & Aging", icon: "⏳" },
      { value: "dullness",    label: "Dull & Uneven Tone", icon: "🌥️" },
      { value: "pores",       label: "Large Pores",        icon: "🔵" },
      { value: "sensitivity", label: "Redness & Irritation", icon: "🌹" },
    ],
  },
  {
    key: "skin_tone",
    title: "What's your skin tone?",
    subtitle: "Helps us match shades and recommend tone-specific brighteners.",
    type: "single",
    options: [
      { value: "fair",   label: "Fair",   desc: "Light with pink/peachy undertones", swatch: "bg-[#f8d5c0]" },
      { value: "medium", label: "Medium", desc: "Warm golden or olive tones",        swatch: "bg-[#d4956a]" },
      { value: "dusky",  label: "Dusky",  desc: "Rich wheatish to caramel",          swatch: "bg-[#b07050]" },
      { value: "deep",   label: "Deep",   desc: "Deep brown to ebony undertones",    swatch: "bg-[#7a4a30]" },
    ],
  },
  {
    key: "sensitivity",
    title: "How sensitive is your skin?",
    subtitle: "We'll only recommend ingredients that are right for your tolerance.",
    type: "single",
    options: [
      { value: "low",    label: "Not Sensitive",   desc: "Can handle most actives without issues",    icon: "💪" },
      { value: "medium", label: "Mildly Sensitive", desc: "Occasional reactions to strong actives",   icon: "⚖️" },
      { value: "high",   label: "Very Sensitive",  desc: "Reacts to fragrances, harsh ingredients",  icon: "🧊" },
    ],
  },
];

const slide = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -40 },
};

export default function SkinQuiz() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [step, setStep]       = useState(0);
  const [answers, setAnswers] = useState({ skin_type: "", concerns: [], skin_tone: "", sensitivity: "" });
  const [saving, setSaving]   = useState(false);
  const [done, setDone]       = useState(false);

  const current = STEPS[step];

  function select(value) {
    if (current.type === "single") {
      setAnswers(a => ({ ...a, [current.key]: value }));
    } else {
      setAnswers(a => {
        const arr = a[current.key];
        return { ...a, [current.key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
      });
    }
  }

  function isSelected(value) {
    const v = answers[current.key];
    return Array.isArray(v) ? v.includes(value) : v === value;
  }

  function canAdvance() {
    const v = answers[current.key];
    return Array.isArray(v) ? v.length > 0 : v !== "";
  }

  async function finish() {
    if (!isLoggedIn) {
      toast.error("Please sign in to save your skin profile");
      navigate("/login", { state: { from: "/skin-quiz" } });
      return;
    }
    setSaving(true);
    try {
      await api.post("/skin-profile", {
        skin_type:   answers.skin_type,
        concerns:    answers.concerns,
        skin_tone:   answers.skin_tone,
        sensitivity: answers.sensitivity,
      });
      setDone(true);
    } catch {
      toast.error("Could not save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const progress = ((step) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-ivory text-espresso">
      <Seo title="Skin Quiz" description="Find your perfect skincare routine — take the ZiyaNisa skin quiz." path="/skin-quiz" />
      <Header />
      <main className="pt-24 md:pt-28 pb-24">
        <div className="max-w-xl mx-auto px-5 md:px-10">

          {!done ? (
            <>
              {/* Progress bar */}
              <div className="mb-8">
                <div className="flex justify-between text-xs text-taupe mb-2">
                  <span>Step {step + 1} of {STEPS.length}</span>
                  <span>{Math.round(progress)}% complete</span>
                </div>
                <div className="h-1.5 bg-rosemist/40 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-gold to-champagne rounded-full"
                    initial={false}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={step} {...slide} transition={{ duration: 0.3 }}>
                  <p className="text-xs uppercase tracking-[0.22em] text-gold mb-1">Skin Intelligence™</p>
                  <h1 className="font-serif text-2xl sm:text-3xl text-espresso mb-2">{current.title}</h1>
                  <p className="text-sm text-taupe mb-7">{current.subtitle}</p>

                  <div className={`grid gap-3 ${current.type === "multi" ? "grid-cols-2" : "grid-cols-1"}`}>
                    {current.options.map(opt => {
                      const active = isSelected(opt.value);
                      return (
                        <button
                          key={opt.value}
                          onClick={() => select(opt.value)}
                          className={`relative flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                            active
                              ? "border-espresso bg-espresso text-ivory shadow-lg"
                              : "border-gold/20 bg-pearl hover:border-gold/60 hover:shadow-soft"
                          }`}
                        >
                          {/* Colour swatch for skin tone step */}
                          {opt.swatch ? (
                            <div className={`w-10 h-10 rounded-full shrink-0 ${opt.swatch} border-2 ${active ? "border-ivory" : "border-gold/20"}`} />
                          ) : (
                            <span className="text-2xl shrink-0">{opt.icon}</span>
                          )}
                          <div className="min-w-0">
                            <div className="font-medium text-sm leading-tight">{opt.label}</div>
                            {opt.desc && <div className={`text-xs mt-0.5 ${active ? "text-ivory/70" : "text-taupe"}`}>{opt.desc}</div>}
                          </div>
                          {active && (
                            <CheckCircle2 className="w-4 h-4 absolute top-3 right-3 text-gold" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {current.type === "multi" && (
                    <p className="text-xs text-taupe mt-3 text-center">
                      {answers.concerns.length > 0
                        ? `${answers.concerns.length} concern${answers.concerns.length > 1 ? "s" : ""} selected`
                        : "Select at least one concern"}
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex gap-3 mt-8">
                {step > 0 && (
                  <Button variant="outline" onClick={() => setStep(s => s - 1)}
                    className="flex-1 h-12 rounded-full border-gold/40 text-espresso gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                )}
                {step < STEPS.length - 1 ? (
                  <Button
                    onClick={() => setStep(s => s + 1)}
                    disabled={!canAdvance()}
                    className="flex-1 h-12 rounded-full bg-espresso text-ivory hover:bg-espresso/90 disabled:opacity-40 gap-2"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={finish}
                    disabled={!canAdvance() || saving}
                    className="flex-1 h-12 rounded-full bg-gold text-espresso hover:bg-gold/90 font-semibold disabled:opacity-40 gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    {saving ? "Saving…" : "Get My Picks"}
                  </Button>
                )}
              </div>
            </>
          ) : (
            /* Done state */
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gold/30 to-champagne/40 grid place-items-center mx-auto mb-5 shadow-goldGlow">
                <Sparkles className="w-10 h-10 text-gold" />
              </div>
              <h1 className="font-serif text-3xl text-espresso mb-2">Your profile is ready</h1>
              <p className="text-taupe text-sm mb-2 max-w-sm mx-auto">
                We've analysed your skin type, concerns, and tone to curate products that will actually work for you.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4 mb-8">
                {[answers.skin_type, ...answers.concerns, answers.skin_tone].map(tag => (
                  <span key={tag} className="text-xs px-3 py-1 rounded-full bg-rosemist text-espresso font-medium capitalize">
                    {tag.replace("_", " ")}
                  </span>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => navigate("/")} className="rounded-full bg-espresso text-ivory px-8 h-12 gap-2">
                  <Sparkles className="w-4 h-4" /> See My Picks on Homepage
                </Button>
                <Button variant="outline" onClick={() => navigate("/shop")}
                  className="rounded-full border-gold/40 text-espresso px-8 h-12">
                  Browse All Products
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
