import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X, Check, MapPin, Phone, Loader2, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import { SKILL_MAP } from "./shared";

export function ApplicationsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("pending_review");
  const [preview, setPreview] = useState(null); // {src, label}
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-applications", filter],
    queryFn: () => api.get(`/admin/beauticians/applications${filter !== "all" ? `?status=${filter}` : ""}`).then(r => r.data),
    retry: false,
  });

  const { mutate: review, isPending: reviewing } = useMutation({
    mutationFn: ({ id, action, rejection_reason }) =>
      api.patch(`/admin/beauticians/applications/${id}/review`, { action, rejection_reason }),
    onSuccess: (_, { action }) => {
      toast.success(action === "approve" ? "Application approved — beautician account created!" : "Application rejected");
      setRejectId(null); setRejectReason("");
      qc.invalidateQueries({ queryKey: ["admin-applications"] });
      qc.invalidateQueries({ queryKey: ["admin-beauticians"] });
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Action failed"),
  });

  const APP_STATUS_FILTER = [
    { value: "pending_review", label: "Pending Review" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "all", label: "All" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-xl text-espresso">Beautician Applications</h2>
          <p className="text-xs text-taupe mt-0.5">Review KYC documents and approve or reject applications.</p>
        </div>
        <div className="flex items-center gap-2">
          {APP_STATUS_FILTER.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filter === f.value ? "bg-espresso text-ivory border-espresso" : "border-stone-200 text-taupe hover:text-espresso"
              }`}>
              {f.label}
            </button>
          ))}
          <Button size="icon" variant="ghost" onClick={refetch} className="h-8 w-8 rounded-lg hover:bg-rosemist/60">
            <RefreshCw className="w-3.5 h-3.5 text-taupe" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-taupe text-sm py-8 text-center">Loading applications…</p>
      ) : items.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-taupe text-sm">No {filter !== "all" ? filter.replace("_", " ") : ""} applications.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map(app => (
            <div key={app.id} className="bg-pearl rounded-2xl border border-gold/10 p-5">
              <div className="flex items-start gap-4 flex-wrap">
                {/* Selfie thumbnail */}
                {app.selfie_b64 && (
                  <button onClick={() => setPreview({ src: app.selfie_b64, label: "Selfie" })}
                    className="shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-gold/20 hover:ring-2 hover:ring-gold/40 transition">
                    <img src={app.selfie_b64} alt="Selfie" className="w-full h-full object-cover" />
                  </button>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-espresso">{app.name}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      app.status === "pending_review" ? "bg-amber-100 text-amber-700" :
                      app.status === "approved" ? "bg-green-100 text-green-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {app.status === "pending_review" ? "Pending Review" :
                       app.status === "approved" ? "Approved" : "Rejected"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-taupe">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{app.phone}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{app.area}</span>
                    {app.email && <span>{app.email}</span>}
                    <span>{app.experience_years} yr exp</span>
                    <span className="col-span-2">{(app.skills || []).map(s => SKILL_MAP[s] || s).join(", ")}</span>
                  </div>

                  {app.rejection_reason && (
                    <p className="mt-2 text-xs text-red-500 bg-red-50 rounded-lg px-2 py-1">
                      Rejected: {app.rejection_reason}
                    </p>
                  )}

                  <p className="text-[10px] text-taupe/60 mt-2">
                    Submitted {new Date(app.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>

                {/* ID proof thumbnail */}
                {app.id_proof_b64 && (
                  <button onClick={() => setPreview({ src: app.id_proof_b64, label: app.id_type?.replace("_", " ") || "ID Proof" })}
                    className="shrink-0 w-24 h-16 rounded-xl overflow-hidden border border-gold/20 hover:ring-2 hover:ring-gold/40 transition">
                    <img src={app.id_proof_b64} alt="ID Proof" className="w-full h-full object-cover" />
                  </button>
                )}
              </div>

              {/* Actions */}
              {app.status === "pending_review" && (
                <div className="mt-4 pt-4 border-t border-stone-100 flex items-center gap-2 flex-wrap">
                  {rejectId === app.id ? (
                    <div className="flex items-center gap-2 flex-1 flex-wrap">
                      <input
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection…"
                        className="flex-1 min-w-[180px] text-xs border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gold"
                      />
                      <Button size="sm" disabled={reviewing || !rejectReason.trim()}
                        onClick={() => review({ id: app.id, action: "reject", rejection_reason: rejectReason })}
                        className="rounded-full bg-red-500 text-white text-xs h-8 px-4 hover:bg-red-600 disabled:opacity-50">
                        {reviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm Reject"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setRejectId(null); setRejectReason(""); }}
                        className="rounded-full text-taupe text-xs h-8">Cancel</Button>
                    </div>
                  ) : (
                    <>
                      <Button size="sm" disabled={reviewing}
                        onClick={() => review({ id: app.id, action: "approve" })}
                        className="rounded-full bg-green-600 text-white text-xs h-8 px-4 hover:bg-green-700 disabled:opacity-50">
                        {reviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5 mr-1" />Approve</>}
                      </Button>
                      <Button size="sm" variant="ghost"
                        onClick={() => setRejectId(app.id)}
                        className="rounded-full text-red-400 text-xs h-8 px-4 hover:bg-red-50 border border-red-200">
                        <X className="w-3.5 h-3.5 mr-1" />Reject
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image preview modal */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setPreview(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="relative max-w-lg w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-espresso rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-ivory text-sm font-medium capitalize">{preview.label}</span>
                  <button onClick={() => setPreview(null)} className="text-ivory/60 hover:text-ivory">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <img src={preview.src} alt={preview.label} className="w-full max-h-[70vh] object-contain" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Bug Report helpers ────────────────────────────────────────────────────────

