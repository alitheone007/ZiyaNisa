import { useState } from "react";
import { Plus, X, Check, Star, Loader2, Bug, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import { compressToBase64 } from "./shared";

export function BugReportModal({ onClose }) {
  const [form, setForm] = useState({
    title: "", category: "booking", severity: "medium",
    description: "", steps: "",
    page_url: window.location.href, admin_tab: "", screenshots: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { github_issue_url }

  async function handleFiles(e) {
    const files = Array.from(e.target.files).slice(0, 3 - form.screenshots.length);
    const oversized = files.find(f => f.size > 15 * 1024 * 1024);
    if (oversized) { toast.error("Each screenshot must be under 15 MB"); return; }
    try {
      const compressed = await Promise.all(files.map(f => compressToBase64(f)));
      setForm(p => ({ ...p, screenshots: [...p.screenshots, ...compressed].slice(0, 3) }));
    } catch { toast.error("Image compression failed"); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r = await api.post("/admin/bug-reports", form);
      setResult(r.data);
    } catch { toast.error("Failed to submit bug report"); }
    finally { setSubmitting(false); }
  }

  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-espresso mb-1">Bug Report Submitted</h3>
          {result.github_issue_url ? (
            <p className="text-sm text-taupe mb-4">
              GitHub issue created —{" "}
              <a href={result.github_issue_url} target="_blank" rel="noopener noreferrer"
                className="text-blue-600 underline inline-flex items-center gap-1">
                View issue <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          ) : (
            <p className="text-sm text-taupe mb-4">Saved to Bug Reports tab.</p>
          )}
          {result.github_sync_failed && (
            <p className="text-xs text-amber-600 mb-3 bg-amber-50 rounded-lg px-3 py-2">
              GitHub sync failed — retry from Bug Reports tab.
            </p>
          )}
          <Button onClick={onClose} className="w-full rounded-full">Done</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white rounded-t-2xl px-5 pt-5 pb-3 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-red-500" />
            <h2 className="font-semibold text-espresso">Report a Bug</h2>
          </div>
          <button onClick={onClose} className="text-taupe hover:text-espresso transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-taupe mb-1 block">What's broken? *</label>
            <input required value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-espresso"
              placeholder="e.g. PIN field rejects valid codes on step 3" />
          </div>

          {/* Severity + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-taupe mb-1 block">Severity *</label>
              <select value={form.severity}
                onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-espresso bg-white">
                <option value="critical">🔴 Critical</option>
                <option value="high">🟠 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-taupe mb-1 block">Category *</label>
              <select value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-espresso bg-white">
                <option value="booking">Booking</option>
                <option value="auth">Auth / Login</option>
                <option value="beautician">Beautician</option>
                <option value="ui">UI / Design</option>
                <option value="payment">Payment</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Severity guide */}
          <p className="text-[10px] text-taupe bg-stone-50 rounded-lg px-3 py-2">
            <strong>Critical</strong> = site/app unusable · <strong>High</strong> = core feature broken ·{" "}
            <strong>Medium</strong> = feature works but wrong · <strong>Low</strong> = minor / visual
          </p>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-taupe mb-1 block">Description *</label>
            <textarea required value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3} placeholder="What happened? What did you expect?"
              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-espresso resize-none" />
          </div>

          {/* Steps */}
          <div>
            <label className="text-xs font-medium text-taupe mb-1 block">Steps to reproduce (optional)</label>
            <textarea value={form.steps}
              onChange={e => setForm(p => ({ ...p, steps: e.target.value }))}
              rows={2} placeholder={"1. Open booking\n2. Select area\n3. ..."}
              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-espresso resize-none" />
          </div>

          {/* Screenshots */}
          <div>
            <label className="text-xs font-medium text-taupe mb-2 block">Screenshots — up to 3 (optional)</label>
            <div className="flex gap-2 flex-wrap">
              {form.screenshots.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} alt="" className="w-16 h-16 object-cover rounded-xl border border-stone-200" />
                  <button type="button"
                    onClick={() => setForm(p => ({ ...p, screenshots: p.screenshots.filter((_, j) => j !== i) }))}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow">
                    <X className="w-2.5 h-2.5 text-white" />
                  </button>
                </div>
              ))}
              {form.screenshots.length < 3 && (
                <label className="w-16 h-16 border-2 border-dashed border-stone-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-stone-400 transition-colors">
                  <Plus className="w-5 h-5 text-stone-400" />
                  <input type="file" accept="image/*" multiple className="sr-only" onChange={handleFiles} />
                </label>
              )}
            </div>
          </div>

          {/* Auto-captured context */}
          <div className="text-[10px] text-taupe/60 font-mono truncate">
            Page: {form.page_url}
          </div>

          <Button type="submit" disabled={submitting}
            className="w-full rounded-full bg-red-500 hover:bg-red-600 text-white">
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting…</>
              : <><Bug className="w-4 h-4 mr-2" />Submit Bug Report</>}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ── Feature Request Modal ──────────────────────────────────────────────────────

export function FeatureRequestModal({ onClose }) {
  const [form, setForm] = useState({
    title: "", category: "booking", priority: "useful",
    use_case: "", details: "",
    page_url: window.location.href, admin_tab: "", screenshots: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  async function handleFiles(e) {
    const files = Array.from(e.target.files).slice(0, 3 - form.screenshots.length);
    const oversized = files.find(f => f.size > 15 * 1024 * 1024);
    if (oversized) { toast.error("Each screenshot must be under 15 MB"); return; }
    try {
      const compressed = await Promise.all(files.map(f => compressToBase64(f)));
      setForm(p => ({ ...p, screenshots: [...p.screenshots, ...compressed].slice(0, 3) }));
    } catch { toast.error("Image compression failed"); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r = await api.post("/admin/feature-requests", form);
      setResult(r.data);
    } catch { toast.error("Failed to submit feature request"); }
    finally { setSubmitting(false); }
  }

  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-semibold text-espresso mb-1">Feature Request Submitted</h3>
          {result.github_issue_url ? (
            <p className="text-sm text-taupe mb-4">
              GitHub issue created —{" "}
              <a href={result.github_issue_url} target="_blank" rel="noopener noreferrer"
                className="text-blue-600 underline inline-flex items-center gap-1">
                View issue <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          ) : (
            <p className="text-sm text-taupe mb-4">Saved to Feature Requests tab.</p>
          )}
          {result.github_sync_failed && (
            <p className="text-xs text-amber-600 mb-3 bg-amber-50 rounded-lg px-3 py-2">
              GitHub sync failed — retry from Feature Requests tab.
            </p>
          )}
          <Button onClick={onClose} className="w-full rounded-full">Done</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white rounded-t-2xl px-5 pt-5 pb-3 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-purple-500" />
            <h2 className="font-semibold text-espresso">Request a Feature</h2>
          </div>
          <button onClick={onClose} className="text-taupe hover:text-espresso transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-taupe mb-1 block">Feature title *</label>
            <input required value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-espresso"
              placeholder="e.g. Show booking history on beautician portal" />
          </div>

          {/* Priority + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-taupe mb-1 block">Priority *</label>
              <select value={form.priority}
                onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-espresso bg-white">
                <option value="critical">🔴 Critical</option>
                <option value="important">🟠 Important</option>
                <option value="useful">🟡 Useful</option>
                <option value="nice_to_have">🟢 Nice to Have</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-taupe mb-1 block">Category *</label>
              <select value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-espresso bg-white">
                <option value="booking">Booking</option>
                <option value="auth">Auth / Login</option>
                <option value="beautician">Beautician</option>
                <option value="ui">UI / Design</option>
                <option value="payment">Payment</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Use case */}
          <div>
            <label className="text-xs font-medium text-taupe mb-1 block">Why is this needed? *</label>
            <textarea required value={form.use_case}
              onChange={e => setForm(p => ({ ...p, use_case: e.target.value }))}
              rows={3} placeholder="What problem does this solve? Who benefits and how often?"
              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-espresso resize-none" />
          </div>

          {/* Details */}
          <div>
            <label className="text-xs font-medium text-taupe mb-1 block">Additional details (optional)</label>
            <textarea value={form.details}
              onChange={e => setForm(p => ({ ...p, details: e.target.value }))}
              rows={2} placeholder="How should it work? Any examples from other apps?"
              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-espresso resize-none" />
          </div>

          {/* Screenshots / Mockups */}
          <div>
            <label className="text-xs font-medium text-taupe mb-2 block">Screenshots or mockups — up to 3 (optional)</label>
            <div className="flex gap-2 flex-wrap">
              {form.screenshots.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} alt="" className="w-16 h-16 object-cover rounded-xl border border-stone-200" />
                  <button type="button"
                    onClick={() => setForm(p => ({ ...p, screenshots: p.screenshots.filter((_, j) => j !== i) }))}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow">
                    <X className="w-2.5 h-2.5 text-white" />
                  </button>
                </div>
              ))}
              {form.screenshots.length < 3 && (
                <label className="w-16 h-16 border-2 border-dashed border-stone-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-stone-400 transition-colors">
                  <Plus className="w-5 h-5 text-stone-400" />
                  <input type="file" accept="image/*" multiple className="sr-only" onChange={handleFiles} />
                </label>
              )}
            </div>
          </div>

          <div className="text-[10px] text-taupe/60 font-mono truncate">Page: {form.page_url}</div>

          <Button type="submit" disabled={submitting}
            className="w-full rounded-full bg-purple-600 hover:bg-purple-700 text-white">
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting…</>
              : <><Star className="w-4 h-4 mr-2" />Submit Feature Request</>}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ── Floating Action Button (Bug + Feature) ────────────────────────────────────

export function BugReportButton() {
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState(null); // "bug" | "feature"

  function open(m) { setMode(m); setExpanded(false); }
  function close() { setMode(null); }

  return (
    <>
      {/* Expanded menu */}
      {expanded && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setExpanded(false)} />
          <div className="fixed bottom-20 right-6 z-40 flex flex-col gap-2 items-end">
            <button onClick={() => open("feature")}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg transition-colors">
              <Star className="w-4 h-4" /> Request Feature
            </button>
            <button onClick={() => open("bug")}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg transition-colors">
              <Bug className="w-4 h-4" /> Report Bug
            </button>
          </div>
        </>
      )}

      {/* FAB toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        title="Report Bug or Request Feature"
        className={`fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${
          expanded ? "bg-espresso rotate-45" : "bg-espresso hover:bg-espresso/90"
        } text-ivory`}
      >
        <Plus className="w-5 h-5" />
      </button>

      {mode === "bug"     && <BugReportModal onClose={close} />}
      {mode === "feature" && <FeatureRequestModal onClose={close} />}
    </>
  );
}

// ── Feature Requests Tab ──────────────────────────────────────────────────────

