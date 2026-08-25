import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Store, IndianRupee, Users, ShieldCheck, ArrowRight, X, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api, { isNetworkError } from "@/lib/api";

const PERKS = [
  { Icon: Users, title: "Reach our customers", desc: "Get discovered by ZiyaNisa's beauty & lifestyle shoppers." },
  { Icon: IndianRupee, title: "Simple payouts", desc: "Transparent commissions, settled on a regular schedule." },
  { Icon: ShieldCheck, title: "Verified sellers", desc: "Our team reviews every application before onboarding." },
];

const CATEGORIES = [
  { value: "products", label: "Beauty & Skincare Products" },
  { value: "services", label: "Beauty Services" },
  { value: "ittar", label: "Ittar & Fragrances" },
  { value: "jewellery", label: "Jewellery" },
  { value: "other", label: "Other" },
];

const EMPTY = { business_name: "", contact_name: "", phone: "", email: "", category: "products", city: "", message: "" };

export default function SellOnZiyaNisa() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function closeModal() {
    setOpen(false);
    setTimeout(() => { setForm(EMPTY); setSubmitted(false); }, 300);
  }

  function validate() {
    if (!form.business_name.trim()) return "Business / brand name is required";
    if (!form.contact_name.trim()) return "Contact person name is required";
    if (form.phone.replace(/\D/g, "").length < 10) return "Enter a valid 10-digit mobile number";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) { toast.error(err); return; }
    setSubmitting(true);
    try {
      await api.post("/sellers/apply", {
        ...form,
        phone: form.phone.replace(/\D/g, "").slice(-10),
      });
      setSubmitted(true);
    } catch (err) {
      if (isNetworkError(err)) {
        toast.error("Network is slow — please check your connection and try again.");
      } else {
        toast.error(err.response?.data?.detail || "Submission failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="sell-on-ziyanisa" data-testid="sell-on-ziyanisa" className="py-20 md:py-28 relative overflow-hidden scroll-mt-24">
      <div className="max-w-7xl mx-auto px-5 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-espresso via-[#3a2c20] to-espresso text-ivory p-8 sm:p-12 md:p-16"
        >
          <div className="absolute -top-32 -left-20 w-[28rem] h-[28rem] rounded-full bg-gold/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-40 -right-20 w-[28rem] h-[28rem] rounded-full bg-peach/10 blur-3xl pointer-events-none" />
          <div className="absolute inset-0 noise-overlay opacity-40 pointer-events-none" />

          <div className="relative grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-gold flex items-center gap-2">
                <Store className="w-3.5 h-3.5" /> Sell on ZiyaNisa
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl mt-3 leading-tight text-ivory text-balance">
                Bring your brand —
                <br />
                <span className="italic font-light text-champagne">to our shelves</span>.
              </h2>
              <p className="mt-5 text-champagne/80 leading-relaxed max-w-lg text-sm md:text-base">
                Partner with ZiyaNisa to list your beauty, fragrance or jewellery brand.
                Tell us about your business and our team will reach out to get you onboarded.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Button
                  data-testid="sell-on-ziyanisa-open"
                  size="lg"
                  onClick={() => setOpen(true)}
                  className="rounded-full bg-gold text-espresso hover:bg-champagne h-12 px-7 font-medium shadow-goldGlow"
                >
                  Become a Seller <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>

            <div className="grid sm:grid-cols-1 gap-4">
              {PERKS.map(({ Icon, title, desc }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.55, delay: 0.1 + i * 0.1 }}
                  className="glass-card rounded-2xl p-5 flex items-start gap-4"
                >
                  <span className="shrink-0 w-11 h-11 rounded-full grid place-items-center bg-gold/20 border border-gold/40">
                    <Icon className="w-5 h-5 text-gold" />
                  </span>
                  <div>
                    <div className="text-espresso font-medium">{title}</div>
                    <div className="text-taupe text-sm mt-0.5">{desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 260 }}
              onClick={e => e.stopPropagation()}
              className="w-full sm:max-w-md bg-ivory text-espresso rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto"
            >
              {submitted ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 grid place-items-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="font-serif text-xl mb-2">Enquiry Submitted!</h3>
                  <p className="text-taupe text-sm mb-6 leading-relaxed">
                    Thank you for your interest. Our team will review your details and
                    contact you at {form.phone ? `+91 ${form.phone.replace(/\D/g, "").slice(-10)}` : "your number"} shortly.
                  </p>
                  <Button onClick={closeModal} className="rounded-full bg-espresso text-ivory px-6 h-11">
                    Close
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-serif text-xl text-espresso">Sell on ZiyaNisa</h3>
                    <button type="button" onClick={closeModal} className="w-8 h-8 rounded-full hover:bg-stone-100 grid place-items-center">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-taupe uppercase tracking-wider mb-1.5 block">Business / Brand Name *</label>
                      <input
                        value={form.business_name}
                        onChange={e => setField("business_name", e.target.value)}
                        placeholder="Your business name"
                        className="w-full h-11 bg-white border border-stone-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-1 focus:ring-espresso"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-taupe uppercase tracking-wider mb-1.5 block">Contact Person *</label>
                      <input
                        value={form.contact_name}
                        onChange={e => setField("contact_name", e.target.value)}
                        placeholder="Your full name"
                        className="w-full h-11 bg-white border border-stone-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-1 focus:ring-espresso"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-taupe uppercase tracking-wider mb-1.5 block">Mobile *</label>
                        <input
                          type="tel"
                          inputMode="numeric"
                          value={form.phone}
                          onChange={e => setField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                          placeholder="98765 43210"
                          className="w-full h-11 bg-white border border-stone-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-1 focus:ring-espresso"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-taupe uppercase tracking-wider mb-1.5 block">City</label>
                        <input
                          value={form.city}
                          onChange={e => setField("city", e.target.value)}
                          placeholder="Hyderabad"
                          className="w-full h-11 bg-white border border-stone-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-1 focus:ring-espresso"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-taupe uppercase tracking-wider mb-1.5 block">Email (optional)</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => setField("email", e.target.value)}
                        placeholder="you@business.com"
                        className="w-full h-11 bg-white border border-stone-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-1 focus:ring-espresso"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-taupe uppercase tracking-wider mb-1.5 block">What do you sell? *</label>
                      <select
                        value={form.category}
                        onChange={e => setField("category", e.target.value)}
                        className="w-full h-11 bg-white border border-stone-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-1 focus:ring-espresso appearance-none"
                      >
                        {CATEGORIES.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-taupe uppercase tracking-wider mb-1.5 block">Tell us more (optional)</label>
                      <textarea
                        rows={3}
                        value={form.message}
                        onChange={e => setField("message", e.target.value)}
                        placeholder="A bit about your products, brand, or shop…"
                        className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-espresso"
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={submitting}
                    className="w-full mt-6 h-12 rounded-full bg-gold text-espresso font-semibold hover:bg-gold/90 disabled:opacity-50">
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Enquiry"}
                  </Button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
