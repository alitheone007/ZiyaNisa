import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Check, Loader2, Bug, ExternalLink, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import { BUG_STATUSES, SEVERITY_STYLES } from "./shared";

export function BugReportsTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("open");
  const [selected, setSelected] = useState(null);
  const [detailBug, setDetailBug] = useState(null);
  const [detailError, setDetailError] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [devNotes, setDevNotes] = useState("");
  const [fixCommit, setFixCommit] = useState("");
  const [updating, setUpdating] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [preview, setPreview] = useState(null);

  const filterOptions = [
    { value: "open",         label: "Open" },
    { value: "acknowledged", label: "Acknowledged" },
    { value: "in_progress",  label: "In Progress" },
    { value: "resolved",     label: "Resolved" },
    { value: "wont_fix",     label: "Won't Fix" },
    { value: "",             label: "All" },
  ];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["bug-reports", statusFilter],
    queryFn: () => {
      const q = statusFilter ? `?status=${statusFilter}&limit=50` : "?limit=50";
      return api.get(`/admin/bug-reports${q}`).then(r => r.data);
    },
  });

  async function openDetail(bug) {
    setSelected(bug._id);
    setDetailBug(null);
    setDetailError(false);
    setDevNotes(bug.dev_notes || "");
    setFixCommit(bug.fix_commit || "");
    setLoadingDetail(true);
    try {
      const r = await api.get(`/admin/bug-reports/${bug._id}`);
      setDetailBug(r.data);
    } catch {
      toast.error("Failed to load bug details");
      setDetailError(true);
    }
    finally { setLoadingDetail(false); }
  }

  async function updateBug(updates) {
    if (!selected) return;
    setUpdating(true);
    try {
      await api.patch(`/admin/bug-reports/${selected}`, updates);
      qc.invalidateQueries({ queryKey: ["bug-reports"] });
      setDetailBug(b => ({ ...b, ...updates }));
      toast.success("Updated");
    } catch { toast.error("Update failed"); }
    finally { setUpdating(false); }
  }

  async function retryGithub() {
    if (!selected) return;
    setRetrying(true);
    try {
      const r = await api.post(`/admin/bug-reports/${selected}/retry-github`, {});
      setDetailBug(b => ({ ...b, github_issue_url: r.data.github_issue_url, github_sync_failed: false }));
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
            <h2 className="font-serif text-lg text-espresso">Bug Reports</h2>
            <p className="text-[10px] text-taupe mt-0.5">{data?.total ?? 0} total</p>
          </div>
          <Button size="icon" variant="ghost" onClick={refetch} className="h-8 w-8 rounded-lg hover:bg-rosemist/60">
            <RefreshCw className="w-3.5 h-3.5 text-taupe" />
          </Button>
        </div>

        {/* Status filter pills */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {filterOptions.map(f => (
            <button key={f.value} onClick={() => { setStatusFilter(f.value); setSelected(null); setDetailBug(null); }}
              className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                statusFilter === f.value ? "bg-espresso text-ivory border-espresso" : "border-stone-200 text-taupe hover:text-espresso"
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Bug list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {isLoading ? (
            <p className="text-taupe text-xs py-6 text-center">Loading…</p>
          ) : isError ? (
            <div className="py-10 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-sm text-taupe mb-2">Failed to load bug reports.</p>
              <button onClick={refetch} className="text-xs text-espresso underline">Retry</button>
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center">
              <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-taupe">No {statusFilter.replace("_", " ")} bugs.</p>
            </div>
          ) : items.map(bug => {
            const sev = SEVERITY_STYLES[bug.severity] || { badge: "bg-stone-100 text-stone-600", emoji: "⚪" };
            const st = BUG_STATUSES.find(s => s.value === bug.status) || { color: "bg-stone-100 text-stone-600", label: bug.status };
            return (
              <button key={bug._id} onClick={() => openDetail(bug)}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${
                  selected === bug._id ? "border-espresso bg-espresso/5" : "border-stone-100 hover:border-stone-200 bg-pearl"
                }`}>
                <div className="flex items-start gap-2">
                  <span className="text-base leading-none mt-0.5">{sev.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-espresso truncate">{bug.title}</p>
                    <p className="text-[10px] text-taupe mt-0.5 capitalize">{bug.category} · {new Date(bug.reported_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${st.color}`}>{st.label}</span>
                </div>
                {bug.github_sync_failed && !bug.github_issue_url && (
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
            <Bug className="w-10 h-10 text-stone-300 mb-3" />
            <p className="text-sm text-taupe">Select a bug report to view details</p>
          </div>
        ) : loadingDetail ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-taupe" />
          </div>
        ) : detailError ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-sm text-taupe mb-2">Failed to load bug details.</p>
            <button onClick={() => { setSelected(null); setDetailError(false); }}
              className="text-xs text-espresso underline">Go back</button>
          </div>
        ) : detailBug ? (
          <div className="space-y-5">
            {/* Header */}
            <div>
              <div className="flex items-start gap-3 flex-wrap">
                <div className="flex-1">
                  <h3 className="font-semibold text-espresso text-base">{detailBug.title}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {(() => {
                      const sev = SEVERITY_STYLES[detailBug.severity] || { badge: "bg-stone-100 text-stone-600", emoji: "⚪" };
                      const label = detailBug.severity ? detailBug.severity[0].toUpperCase() + detailBug.severity.slice(1) : "";
                      return (
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sev.badge}`}>
                          {sev.emoji} {label}
                        </span>
                      );
                    })()}
                    <span className="text-[10px] text-taupe capitalize">{detailBug.category}</span>
                    <span className="text-[10px] text-taupe">
                      {new Date(detailBug.reported_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </div>
              {detailBug.page_url && (
                <p className="text-[10px] text-taupe/60 font-mono mt-1 truncate">{detailBug.page_url}</p>
              )}
              {detailBug.github_issue_url && (
                <a href={detailBug.github_issue_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
                  <ExternalLink className="w-3 h-3" /> View GitHub Issue
                </a>
              )}
              {detailBug.github_sync_failed && !detailBug.github_issue_url && (
                <button onClick={retryGithub} disabled={retrying}
                  className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 mt-1">
                  <AlertTriangle className="w-3 h-3" />
                  {retrying ? "Retrying…" : "GitHub sync failed — retry"}
                </button>
              )}
            </div>

            {/* Description */}
            <div>
              <p className="text-[10px] font-medium text-taupe uppercase tracking-wide mb-1">Description</p>
              <p className="text-sm text-espresso whitespace-pre-wrap bg-stone-50 rounded-xl px-4 py-3">{detailBug.description}</p>
            </div>

            {/* Steps */}
            {detailBug.steps && (
              <div>
                <p className="text-[10px] font-medium text-taupe uppercase tracking-wide mb-1">Steps to Reproduce</p>
                <p className="text-sm text-espresso whitespace-pre-wrap bg-stone-50 rounded-xl px-4 py-3">{detailBug.steps}</p>
              </div>
            )}

            {/* Screenshots */}
            {detailBug.screenshots?.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-taupe uppercase tracking-wide mb-2">Screenshots</p>
                <div className="flex gap-2 flex-wrap">
                  {detailBug.screenshots.map((src, i) => (
                    <button key={i} onClick={() => setPreview(src)}
                      className="w-24 h-20 rounded-xl overflow-hidden border border-stone-200 hover:ring-2 hover:ring-espresso/30 transition">
                      <img src={src} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Status update */}
            <div className="border-t border-stone-100 pt-4">
              <p className="text-[10px] font-medium text-taupe uppercase tracking-wide mb-2">Update Status</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {BUG_STATUSES.map(s => (
                  <button key={s.value} disabled={updating}
                    onClick={() => updateBug({ status: s.value })}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${
                      detailBug.status === s.value
                        ? `${s.color} border-transparent font-medium`
                        : "border-stone-200 text-taupe hover:text-espresso"
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Dev notes */}
              <textarea value={devNotes} onChange={e => setDevNotes(e.target.value)} rows={2}
                placeholder="Dev notes (root cause, workaround, PR link…)"
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-espresso resize-none mb-2" />

              {/* Fix commit */}
              <input value={fixCommit} onChange={e => setFixCommit(e.target.value)}
                placeholder="Fix commit SHA (optional)"
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-espresso mb-3" />

              <Button size="sm" disabled={updating}
                onClick={() => updateBug({ dev_notes: devNotes || null, fix_commit: fixCommit || null })}
                className="rounded-full text-xs h-8 px-4">
                {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Notes"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Screenshot lightbox */}
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

// ── Inbox Tab (Applications + Bug Reports + Feature Requests combined) ────────
