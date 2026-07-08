import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Pencil, X, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import { BOOKING_STATUSES, InfoItem, Pagination, StatusSelect, statusBadge } from "./shared";

export function BookingsTab() {
  const [page, setPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [editingAddress, setEditingAddress] = useState(false);
  const [editAddr, setEditAddr] = useState({});
  const [editNotes, setEditNotes] = useState("");
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-service-bookings", page],
    queryFn: () => api.get(`/admin/service-bookings?page=${page}&limit=25`).then(r => r.data),
    retry: false,
  });

  const { mutate: updateStatus, variables: mutVars } = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/admin/service-bookings/${id}/status`, { status }),
    onSuccess: (_, { status }) => {
      toast.success(`Booking updated to "${status}"`);
      qc.invalidateQueries({ queryKey: ["admin-service-bookings"] });
      if (selectedBooking?.id === _.id) setSelectedBooking(b => ({ ...b, status }));
    },
    onError: () => toast.error("Failed to update status"),
  });

  const { mutate: saveAddress, isPending: savingAddr } = useMutation({
    mutationFn: ({ id, address, notes }) => api.patch(`/admin/service-bookings/${id}/address`, { address, notes }),
    onSuccess: (_, { address, notes }) => {
      toast.success("Address updated");
      setEditingAddress(false);
      setSelectedBooking(b => ({ ...b, address, notes }));
      qc.invalidateQueries({ queryKey: ["admin-service-bookings"] });
    },
    onError: () => toast.error("Failed to save address"),
  });

  function openModal(b) {
    setSelectedBooking(b);
    setEditAddr({ ...(b.address || {}) });
    setEditNotes(b.notes || "");
    setEditingAddress(false);
  }

  if (isLoading) return <p className="text-taupe text-sm py-8 text-center">Loading bookings…</p>;
  if (!data?.items?.length) return <p className="text-taupe text-sm py-8 text-center">No service bookings yet.</p>;

  const addrField = (key, label, placeholder) => (
    <div key={key}>
      <label className="text-[10px] uppercase tracking-wide text-taupe block mb-1">{label}</label>
      <input value={editAddr[key] || ""} onChange={e => setEditAddr(a => ({ ...a, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full h-9 border border-stone-200 rounded-lg px-3 text-sm text-espresso focus:outline-none focus:ring-1 focus:ring-gold bg-white" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-taupe">{data.total} service bookings total</p>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1 text-xs text-taupe">
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-100">
        <table className="w-full text-sm text-left">
          <thead className="bg-rosemist/40 text-xs uppercase text-taupe">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Slot</th>
              <th className="px-4 py-3">Appt.</th>
              <th className="px-4 py-3">Beautician</th>
              <th className="px-4 py-3">Area</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Update</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {data.items.map(b => {
              const isUpdating = mutVars?.id === b.id;
              const createdStr = b.created_at
                ? new Date(b.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                : "—";
              const apptDate = b.date
                ? new Date(b.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                : "—";
              return (
                <tr key={b.id} onClick={() => openModal(b)}
                  className="hover:bg-stone-50 transition-colors cursor-pointer">
                  <td className="px-4 py-3 text-xs text-taupe whitespace-nowrap">{createdStr}</td>
                  <td className="px-4 py-3 text-espresso font-medium max-w-[130px] truncate">{b.service_name}</td>
                  <td className="px-4 py-3 text-xs text-taupe whitespace-nowrap">{b.time_slot}</td>
                  <td className="px-4 py-3 text-xs text-taupe whitespace-nowrap">{apptDate}</td>
                  <td className="px-4 py-3 text-xs text-espresso">{b.beautician_name || <span className="text-taupe">—</span>}</td>
                  <td className="px-4 py-3 text-xs text-taupe">{b.address?.city || "—"}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>{statusBadge(b.status, BOOKING_STATUSES)}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <StatusSelect
                      current={b.status}
                      options={BOOKING_STATUSES}
                      loading={isUpdating}
                      onChange={status => status !== b.status && updateStatus({ id: b.id, status })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={data.total_pages || 1} onPage={setPage} />

      {/* Booking detail modal */}
      <AnimatePresence>
        {selectedBooking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => { setSelectedBooking(null); setEditingAddress(false); }}>
            <motion.div
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>

              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 sticky top-0 bg-white rounded-t-3xl sm:rounded-t-2xl">
                <div>
                  <p className="font-semibold text-espresso text-sm">{selectedBooking.service_name}</p>
                  <p className="text-xs text-taupe mt-0.5 font-mono">#{selectedBooking.id?.slice(-8).toUpperCase()}</p>
                </div>
                <button onClick={() => { setSelectedBooking(null); setEditingAddress(false); }}
                  className="w-8 h-8 rounded-full bg-stone-100 grid place-items-center hover:bg-stone-200 transition">
                  <X className="w-4 h-4 text-taupe" />
                </button>
              </div>

              <div className="px-5 py-5 space-y-5">
                {/* Summary row */}
                <div className="grid grid-cols-2 gap-3">
                  <InfoItem label="Status">{statusBadge(selectedBooking.status, BOOKING_STATUSES)}</InfoItem>
                  <InfoItem label="Appointment">
                    <p className="text-sm text-espresso">{selectedBooking.date}</p>
                    <p className="text-xs text-taupe">{selectedBooking.time_slot}</p>
                  </InfoItem>
                  <InfoItem label="Beautician">
                    <p className="text-sm text-espresso">{selectedBooking.beautician_name || "—"}</p>
                  </InfoItem>
                  <InfoItem label="Amount">
                    <p className="text-sm font-semibold text-espresso">₹{selectedBooking.service_price?.toLocaleString("en-IN") || "—"}</p>
                  </InfoItem>
                </div>

                {/* Address section */}
                <div className="bg-stone-50 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs uppercase tracking-widest text-taupe">Customer Address</p>
                    {!editingAddress && (
                      <button onClick={() => setEditingAddress(true)}
                        className="text-xs text-espresso border border-stone-200 rounded-lg px-2.5 py-1 hover:bg-white transition flex items-center gap-1">
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                    )}
                  </div>

                  {!editingAddress ? (
                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-espresso">{selectedBooking.address?.full_name || "—"}</p>
                      <p className="text-taupe text-xs">{selectedBooking.address?.phone || "—"}</p>
                      <p className="text-taupe text-xs mt-1">
                        {[selectedBooking.address?.line1, selectedBooking.address?.line2].filter(Boolean).join(", ")}
                      </p>
                      <p className="text-taupe text-xs">
                        {[selectedBooking.address?.city, selectedBooking.address?.state, selectedBooking.address?.pin].filter(Boolean).join(" · ")}
                      </p>
                      {selectedBooking.notes && (
                        <div className="mt-2 pt-2 border-t border-stone-200">
                          <p className="text-[10px] uppercase tracking-widest text-taupe mb-0.5">Notes</p>
                          <p className="text-xs text-espresso/80">{selectedBooking.notes}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        {addrField("full_name", "Name", "Full name")}
                        {addrField("phone", "Phone", "Mobile number")}
                      </div>
                      {addrField("line1", "Address Line 1", "Street, Locality")}
                      {addrField("line2", "Landmark", "Near landmark")}
                      <div className="grid grid-cols-3 gap-3">
                        {addrField("city", "City", "City")}
                        {addrField("state", "State", "State")}
                        {addrField("pin", "PIN", "6-digit PIN")}
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-taupe block mb-1">Special Notes</label>
                        <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2}
                          placeholder="Any notes from customer…"
                          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-espresso resize-none focus:outline-none focus:ring-1 focus:ring-gold" />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" disabled={savingAddr}
                          onClick={() => saveAddress({ id: selectedBooking.id, address: editAddr, notes: editNotes })}
                          className="flex-1 rounded-lg bg-espresso text-ivory text-xs h-9">
                          {savingAddr ? "Saving…" : "Save Address"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingAddress(false)}
                          className="rounded-lg text-taupe text-xs h-9">Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick status update from modal */}
                <div>
                  <p className="text-xs uppercase tracking-widest text-taupe mb-2">Update Status</p>
                  <StatusSelect
                    current={selectedBooking.status}
                    options={BOOKING_STATUSES}
                    loading={mutVars?.id === selectedBooking.id}
                    onChange={status => {
                      if (status !== selectedBooking.status) {
                        updateStatus({ id: selectedBooking.id, status });
                        setSelectedBooking(b => ({ ...b, status }));
                      }
                    }}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

