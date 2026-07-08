import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Loader2, Bug, ExternalLink, AlertTriangle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import { FR_STATUSES, PRIORITY_STYLES } from "./shared";

export function FeatureRequestsTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("new");
  const [selected, setSelected] = useState(null);
  const [detailFR, setDetailFR] = useState(null);
  const [detailError, setDetailError] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [devNotes, setDevNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [preview, setPreview] = useState(null);

  const filterOptions = [
    { value: "new",                 label: "New" },
    { value: "under_consideration", label: "Considering" },
    { value: "planned",             label: "Planned" },
    { value: "in_progress",         label: "In Progress" },
    { value: "shipped",             label: "Shipped" },
    { value: "declined",            label: "Declined" },
    { value: "",                    label: "All" },
  ];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["feature-requests", statusFilter],
    queryFn: () => {
      const q = statusFilter ? `?status=${statusFilter}&limit=50` : "?limit=50";
      return api.get(`/admin/feature-requests${q}`).then(r => r.data);
    },
  });

  async function openDetail(fr) {
    setSelected(fr._id);
    setDetailFR(null);
    setDetailError(false);
    setDevNotes(fr.dev_notes || "");
    setLoadingDetail(true);
    try {
      const r = await api.get(`/admin/feature-requests/${fr._id}`);
      setDetailFR(r.data);
    } catch {
      toast.error("Failed to load feature request");
      setDetailError(true);
    }
    finally { setLoadingDetail(false); }
  }

  async function updateFR(updates) {
    if (!selected) return;
    setUpdating(true);
    try {
      await api.patch(`/admin/feature-requests/${selected}`, updates);
      qc.invalidateQueries({ queryKey: ["feature-requests"] });
      setDetailFR(f => ({ ...f, ...updates }));
      toast.success("Updated");
    } catch { toast.error("Update failed"); }
    finally { setUpdating(false); }
  }

  async function retryGithub() {
    if (!selected) return;
    setRetrying(true);
    try {
      const r = await api.post(`/admin/feature-requests/${selected}/retry-github`, {});
      setDetailFR(f => ({ ...f, github_issue_url: r.data.github_issue_url, github_sync_failed: false }));
      toast.success("GitHub issue created");
    } catch { toast.error("GitHub sync failed — check server env vars"); }
    finally { setRetrying(false); }
  }

  const items = data?.items || [];

  return (
    <div className="flex gap-0 h-[calc(100vh-280px)] min-h-[400px]">
      {/* Left: list */}
      <div className="w-full sm:w-80 shrink-0 flex flex-col border-r border-stone-100">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
          <div>
            <h2 className="font-serif text-lg text-espresso">Feature Requests</h2>
            <p className="text-[10px] text-taupe mt-0.5">{data?.total ?? 0} total</p>
          </div>
          <Button size="icon" variant="ghost" onClick={refetch} className="h-8 w-8 rounded-lg hover:bg-rosemist/60">
            <RefreshCw className="w-3.5 h-3.5 text-taupe" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {filterOptions.map(f => (
            <button key={f.value} onClick={() => { setStatusFilter(f.value); setSelected(null); setDetailFR(null); }}
              className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                statusFilter === f.value ? "bg-espresso text-ivory border-espresso" : "border-stone-200 text-taupe hover:text-espresso"
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {isLoading ? (
            <p className="text-taupe text-xs py-6 text-center">Loading…</p>
          ) : isError ? (
            <div className="py-10 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-sm text-taupe mb-2">Failed to load feature requests.</p>
              <button onClick={refetch} className="text-xs text-espresso underline">Retry</button>
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center">
              <Sparkles className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-sm text-taupe">No {statusFilter ? statusFilter.replace(/_/g, " ") : ""} requests.</p>
            </div>
          ) : items.map(fr => {
            const pri = PRIORITY_STYLES[fr.priority] || { badge: "bg-stone-100 text-stone-600", emoji: "⚪" };
            const st = FR_STATUSES.find(s => s.value === fr.status) || { color: "bg-stone-100 text-stone-600", label: fr.status };
            return (
              <button key={fr._id} onClick={() => openDetail(fr)}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${
                  selected === fr._id ? "border-espresso bg-espresso/5" : "border-stone-100 hover:border-stone-200 bg-pearl"
                }`}>
                <div className="flex items-start gap-2">
                  <span className="text-base leading-none mt-0.5">{pri.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-espresso truncate">{fr.title}</p>
                    <p className="text-[10px] text-taupe mt-0.5 capitalize">{fr.category} · {new Date(fr.reported_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${st.color}`}>{st.label}</span>
                </div>
                {fr.github_sync_failed && !fr.github_issue_url && (
                  <p className="text-[9px] text-amber-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" /> GitHub sync failed
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: detail */}
      <div className="flex-1 overflow-y-auto pl-5">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="w-10 h-10 text-stone-300 mb-3" />
            <p className="text-sm text-taupe">Select a feature request to view details</p>
          </div>
        ) : loadingDetail ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-taupe" />
          </div>
        ) : detailError ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-sm text-taupe mb-2">Failed to load feature request details.</p>
            <button onClick={() => { setSelected(null); setDetailError(false); }}
              className="text-xs text-espresso underline">Go back</button>
          </div>
        ) : detailFR ? (
          <div className="space-y-5">
            <div>
              <div className="flex items-start gap-3 flex-wrap">
                <div className="flex-1">
                  <h3 className="font-semibold text-espresso text-base">{detailFR.title}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {(() => {
                      const pri = PRIORITY_STYLES[detailFR.priority] || { badge: "bg-stone-100 text-stone-600", emoji: "⚪" };
                      const label = detailFR.priority ? detailFR.priority.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "";
                      return (
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${pri.badge}`}>
                          {pri.emoji} {label}
                        </span>
                      );
                    })()}
                    <span className="text-[10px] text-taupe capitalize">{detailFR.category}</span>
                    <span className="text-[10px] text-taupe">
                      {new Date(detailFR.reported_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </div>
              {detailFR.page_url && (
                <p className="text-[10px] text-taupe/60 font-mono mt-1 truncate">{detailFR.page_url}</p>
              )}
              {detailFR.github_issue_url && (
                <a href={detailFR.github_issue_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
                  <ExternalLink className="w-3 h-3" /> View GitHub Issue
                </a>
              )}
              {detailFR.github_sync_failed && !detailFR.github_issue_url && (
                <button onClick={retryGithub} disabled={retrying}
                  className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 mt-1">
                  <AlertTriangle className="w-3 h-3" />
                  {retrying ? "Retrying…" : "GitHub sync failed — retry"}
                </button>
              )}
            </div>

            <div>
              <p className="text-[10px] font-medium text-taupe uppercase tracking-wide mb-1">Use Case / Problem</p>
              <p className="text-sm text-espresso whitespace-pre-wrap bg-stone-50 rounded-xl px-4 py-3">{detailFR.use_case}</p>
            </div>

            {detailFR.details && (
              <div>
                <p className="text-[10px] font-medium text-taupe uppercase tracking-wide mb-1">Additional Details</p>
                <p className="text-sm text-espresso whitespace-pre-wrap bg-stone-50 rounded-xl px-4 py-3">{detailFR.details}</p>
              </div>
            )}

            {detailFR.screenshots?.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-taupe uppercase tracking-wide mb-2">Screenshots / Mockups</p>
                <div className="flex gap-2 flex-wrap">
                  {detailFR.screenshots.map((src, i) => (
                    <button key={i} onClick={() => setPreview(src)}
                      className="w-24 h-20 rounded-xl overflow-hidden border border-stone-200 hover:ring-2 hover:ring-espresso/30 transition">
                      <img src={src} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-stone-100 pt-4">
              <p className="text-[10px] font-medium text-taupe uppercase tracking-wide mb-2">Update Status</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {FR_STATUSES.map(s => (
                  <button key={s.value} disabled={updating}
                    onClick={() => updateFR({ status: s.value })}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${
                      detailFR.status === s.value
                        ? `${s.color} border-transparent font-medium`
                        : "border-stone-200 text-taupe hover:text-espresso"
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>

              <textarea value={devNotes} onChange={e => setDevNotes(e.target.value)} rows={2}
                placeholder="Dev notes (approach, PR link, ETA…)"
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-espresso resize-none mb-3" />

              <Button size="sm" disabled={updating}
                onClick={() => updateFR({ dev_notes: devNotes || null })}
                className="rounded-full text-xs h-8 px-4">
                {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Notes"}
              </Button>

              {detailFR.shipped_at && (
                <p className="text-[10px] text-green-600 mt-3">
                  Shipped on {new Date(detailFR.shipped_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <AnimatePresence>
        {preview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setPreview(null)}>
            <motion.img initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              src={preview} alt="Screenshot"
              className="max-w-2xl max-h-[85vh] w-full object-contain rounded-2xl"
              onClick={e => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Bug Reports Tab ────────────────────────────────────────────────────────────

