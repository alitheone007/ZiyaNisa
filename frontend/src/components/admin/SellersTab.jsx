import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Phone, Mail, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";

const CATEGORY_LABEL = {
  products: "Beauty & Skincare Products",
  services: "Beauty Services",
  ittar: "Ittar & Fragrances",
  jewellery: "Jewellery",
  other: "Other",
};

const STATUS_STYLE = {
  new: "bg-amber-100 text-amber-700",
  contacted: "bg-blue-100 text-blue-700",
  onboarded: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
};

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "onboarded", label: "Onboarded" },
  { value: "declined", label: "Declined" },
];

export function SellersTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("new");

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-sellers", filter],
    queryFn: () => api.get(`/admin/sellers${filter !== "all" ? `?status=${filter}` : ""}`).then(r => r.data),
    retry: false,
  });

  const { mutate: updateStatus, isPending: updating, variables: pendingVars } = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/admin/sellers/${id}`, { status }),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["admin-sellers"] });
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Update failed"),
  });

  const FILTERS = [{ value: "all", label: "All" }, ...STATUS_OPTIONS];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-xl text-espresso">Sell on ZiyaNisa — Enquiries</h2>
          <p className="text-xs text-taupe mt-0.5">Businesses interested in selling on ZiyaNisa. Contact them to onboard.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map(f => (
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
        <p className="text-taupe text-sm py-8 text-center">Loading enquiries…</p>
      ) : items.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-taupe text-sm">No {filter !== "all" ? filter : ""} enquiries.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map(enq => (
            <div key={enq.id} className="bg-pearl rounded-2xl border border-gold/10 p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-espresso">{enq.business_name}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[enq.status] || "bg-stone-100 text-stone-600"}`}>
                      {STATUS_OPTIONS.find(s => s.value === enq.status)?.label || enq.status}
                    </span>
                  </div>
                  <p className="text-xs text-taupe">{enq.contact_name} · {CATEGORY_LABEL[enq.category] || enq.category}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-taupe mt-2">
                    <a href={`tel:+91${enq.phone}`} className="flex items-center gap-1 hover:text-espresso">
                      <Phone className="w-3 h-3" />+91 {enq.phone}
                    </a>
                    {enq.email && (
                      <a href={`mailto:${enq.email}`} className="flex items-center gap-1 hover:text-espresso truncate">
                        <Mail className="w-3 h-3" />{enq.email}
                      </a>
                    )}
                    {enq.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{enq.city}</span>}
                  </div>

                  {enq.message && (
                    <p className="mt-2 text-xs text-espresso/80 bg-white/60 rounded-lg px-3 py-2">{enq.message}</p>
                  )}

                  <p className="text-[10px] text-taupe/60 mt-2">
                    Submitted {new Date(enq.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>

              {/* Status actions */}
              <div className="mt-4 pt-4 border-t border-stone-100 flex items-center gap-2 flex-wrap">
                {STATUS_OPTIONS.filter(s => s.value !== enq.status).map(s => (
                  <Button key={s.value} size="sm" variant="ghost"
                    disabled={updating && pendingVars?.id === enq.id}
                    onClick={() => updateStatus({ id: enq.id, status: s.value })}
                    className="rounded-full text-xs h-8 px-3 border border-stone-200 text-taupe hover:text-espresso">
                    {updating && pendingVars?.id === enq.id && pendingVars?.status === s.value
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : `Mark ${s.label}`}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
