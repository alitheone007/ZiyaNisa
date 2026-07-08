import { useState, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, RefreshCw, Pencil, Truck, X, Phone, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import { ORDER_STATUSES, Pagination, StatusSelect, statusBadge } from "./shared";

export function OrdersTab() {
  const [page, setPage] = useState(1);
  const [trackingInput, setTrackingInput]   = useState({});
  const [trackingOpen, setTrackingOpen]     = useState(null);
  const [editOrder, setEditOrder]           = useState(null);   // order being edited
  const [editFields, setEditFields]         = useState({});
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-orders", page],
    queryFn: () => api.get(`/admin/orders?page=${page}&limit=20`).then(r => r.data),
    retry: false,
  });

  const { mutate: updateStatus, variables: mutVars } = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/admin/orders/${id}/status`, { status }),
    onSuccess: (_, { status }) => {
      toast.success(`Status updated to "${status}"`);
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: () => toast.error("Failed to update status"),
  });

  const { mutate: setTracking, isPending: trackingPending } = useMutation({
    mutationFn: ({ id, tracking_url }) => api.patch(`/admin/orders/${id}/tracking`, { tracking_url }),
    onSuccess: () => {
      toast.success("Tracking saved — order marked Dispatched");
      setTrackingOpen(null);
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: () => toast.error("Failed to save tracking URL"),
  });

  const { mutate: saveEdit, isPending: editSaving } = useMutation({
    mutationFn: ({ id, fields }) => api.put(`/admin/orders/${id}`, fields),
    onSuccess: () => {
      toast.success("Order updated");
      setEditOrder(null);
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: () => toast.error("Failed to update order"),
  });

  function downloadInvoice(orderId) {
    const token = localStorage.getItem("zn_token");
    fetch(`/api/admin/orders/${orderId}/invoice`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.blob() : Promise.reject())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ZiyaNisa-Invoice-${orderId.slice(-8).toUpperCase()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch(() => toast.error("Could not download invoice"));
  }

  function openEdit(o) {
    setEditOrder(o);
    setEditFields({
      notes: o.notes || "",
      discount: o.discount || 0,
      shipping_address: o.shipping_address ? { ...o.shipping_address } : {
        full_name: "", phone: "", line1: "", line2: "", city: "", state: "", pin: ""
      },
    });
    setTrackingOpen(null);
  }

  function setAddr(k, v) {
    setEditFields(f => ({ ...f, shipping_address: { ...f.shipping_address, [k]: v } }));
  }

  if (isLoading) return <p className="text-taupe text-sm py-8 text-center">Loading orders…</p>;
  if (!data?.items?.length) return <p className="text-taupe text-sm py-8 text-center">No orders yet.</p>;

  return (
    <div>
      {/* Edit Order Modal */}
      {editOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <div>
                <p className="font-semibold text-espresso text-sm">Edit Order</p>
                <p className="text-xs text-taupe font-mono">#{editOrder.id?.slice(-8).toUpperCase()}</p>
              </div>
              <button onClick={() => setEditOrder(null)} className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center">
                <X className="w-4 h-4 text-taupe" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Shipping address */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-taupe mb-2">Shipping Address</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["full_name", "Full Name"],
                    ["phone", "Phone"],
                    ["line1", "Address Line 1"],
                    ["line2", "Line 2 (optional)"],
                    ["city", "City"],
                    ["pin", "PIN Code"],
                  ].map(([k, label]) => (
                    <div key={k} className={k === "line1" || k === "line2" ? "col-span-2" : ""}>
                      <label className="text-[10px] uppercase tracking-wide text-taupe block mb-1">{label}</label>
                      <input value={editFields.shipping_address?.[k] || ""}
                        onChange={e => setAddr(k, e.target.value)}
                        className="w-full h-8 rounded-lg border border-stone-200 px-3 text-xs text-espresso focus:outline-none focus:ring-1 focus:ring-gold bg-white" />
                    </div>
                  ))}
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-taupe block mb-1">State</label>
                    <input value={editFields.shipping_address?.state || ""}
                      onChange={e => setAddr("state", e.target.value)}
                      className="w-full h-8 rounded-lg border border-stone-200 px-3 text-xs text-espresso focus:outline-none focus:ring-1 focus:ring-gold bg-white" />
                  </div>
                </div>
              </div>
              {/* Discount */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-taupe block mb-1">Discount (₹)</label>
                <input type="number" min="0" value={editFields.discount || 0}
                  onChange={e => setEditFields(f => ({ ...f, discount: Number(e.target.value) }))}
                  className="w-full h-8 rounded-lg border border-stone-200 px-3 text-xs text-espresso focus:outline-none focus:ring-1 focus:ring-gold bg-white" />
              </div>
              {/* Notes */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-taupe block mb-1">Order Notes</label>
                <textarea rows={2} value={editFields.notes || ""}
                  onChange={e => setEditFields(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Internal notes (not shown to customer)"
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs text-espresso focus:outline-none focus:ring-1 focus:ring-gold bg-white resize-none" />
              </div>
              {/* Payment verification */}
              {(editOrder.upi_ref || editOrder.payment_screenshot) && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-taupe mb-1.5">Payment</p>
                  {editOrder.upi_ref && (
                    <p className="text-xs text-espresso font-mono mb-1.5">UTR: {editOrder.upi_ref}</p>
                  )}
                  {editOrder.payment_screenshot && (
                    <a href={editOrder.payment_screenshot} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-gold hover:text-espresso underline underline-offset-2 transition">
                      <ExternalLink className="w-3 h-3" /> View payment screenshot
                    </a>
                  )}
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-stone-100 flex gap-2">
              <Button variant="ghost" onClick={() => setEditOrder(null)} className="flex-1 rounded-xl text-sm">Cancel</Button>
              <Button disabled={editSaving}
                onClick={() => saveEdit({ id: editOrder.id, fields: editFields })}
                className="flex-1 rounded-xl bg-espresso text-ivory text-sm">
                {editSaving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-taupe">{data.total} orders total</p>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1 text-xs text-taupe">
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-100">
        <table className="w-full text-sm text-left">
          <thead className="bg-rosemist/40 text-xs uppercase text-taupe">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Update</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map(o => {
              const isUpdating = mutVars?.id === o.id;
              const isTrackingOpen = trackingOpen === o.id;
              const dateStr = o.created_at
                ? new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                : "—";
              const itemSummary = o.items?.map(i => i.name || "Item").slice(0, 2).join(", ")
                + (o.items?.length > 2 ? ` +${o.items.length - 2}` : "");
              const city = o.shipping_address?.city || "—";

              return (
                <Fragment key={o.id}>
                  <tr className="border-t border-stone-100 hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-taupe whitespace-nowrap">{dateStr}</td>
                    <td className="px-4 py-3 text-espresso max-w-[160px] truncate">{itemSummary}</td>
                    <td className="px-4 py-3 font-medium text-espresso">₹{o.total?.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-taupe text-xs">{city}</td>
                    <td className="px-4 py-3">{statusBadge(o.status, ORDER_STATUSES)}</td>
                    <td className="px-4 py-3">
                      <StatusSelect
                        current={o.status}
                        options={ORDER_STATUSES}
                        loading={isUpdating}
                        onChange={status => status !== o.status && updateStatus({ id: o.id, status })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost"
                          onClick={() => setTrackingOpen(isTrackingOpen ? null : o.id)}
                          className={`gap-1 text-xs h-7 px-2 rounded-lg ${o.tracking_url ? "text-indigo-600 hover:bg-indigo-50" : "text-taupe hover:bg-rosemist/60"}`}>
                          <Truck className="w-3.5 h-3.5" />
                          {o.tracking_url ? "Track" : "Ship"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(o)}
                          className="gap-1 text-xs h-7 px-2 rounded-lg text-taupe hover:bg-rosemist/60">
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => downloadInvoice(o.id)}
                          className="gap-1 text-xs h-7 px-2 rounded-lg text-taupe hover:bg-rosemist/60">
                          <Package className="w-3.5 h-3.5" /> PDF
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {isTrackingOpen && (
                    <tr className="bg-stone-50/80 border-t border-stone-100">
                      <td colSpan={7} className="px-4 pb-3 pt-2">
                        <div className="flex gap-2 items-center">
                          <input
                            type="url"
                            placeholder="Paste courier tracking URL (e.g. dtdc.com/track/…)"
                            defaultValue={o.tracking_url || ""}
                            onChange={e => setTrackingInput(t => ({ ...t, [o.id]: e.target.value }))}
                            className="flex-1 h-9 rounded-lg border border-stone-200 px-3 text-sm text-espresso focus:outline-none focus:ring-1 focus:ring-gold bg-white min-w-0"
                          />
                          <Button size="sm" disabled={trackingPending}
                            onClick={() => setTracking({ id: o.id, tracking_url: trackingInput[o.id] ?? o.tracking_url ?? "" })}
                            className="rounded-lg bg-espresso text-ivory text-xs h-9 px-4 shrink-0">
                            Save & Dispatch
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setTrackingOpen(null)}
                            className="h-9 w-9 rounded-lg shrink-0">
                            <X className="w-4 h-4 text-taupe" />
                          </Button>
                        </div>
                        {o.tracking_url && (
                          <p className="text-xs text-taupe mt-1.5">
                            Current:{" "}
                            <a href={o.tracking_url} target="_blank" rel="noopener noreferrer"
                              className="text-indigo-600 underline underline-offset-2">
                              {o.tracking_url}
                            </a>
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={data.total_pages} onPage={setPage} />
    </div>
  );
}

// ── Service Bookings Tab ──────────────────────────────────────────────────────
