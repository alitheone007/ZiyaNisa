import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Package, Scissors, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import api from "@/lib/api";

const ORDER_STATUSES = [
  { value: "pending_payment",   label: "Awaiting Payment",   color: "bg-amber-100 text-amber-700" },
  { value: "payment_confirmed", label: "Payment Confirmed",  color: "bg-blue-100 text-blue-700" },
  { value: "dispatched",        label: "Dispatched",         color: "bg-indigo-100 text-indigo-700" },
  { value: "delivered",         label: "Delivered",          color: "bg-green-100 text-green-700" },
  { value: "cancelled",         label: "Cancelled",          color: "bg-red-100 text-red-700" },
];

const BOOKING_STATUSES = [
  { value: "confirmed",   label: "Confirmed",    color: "bg-blue-100 text-blue-700" },
  { value: "in_progress", label: "In Progress",  color: "bg-amber-100 text-amber-700" },
  { value: "completed",   label: "Completed",    color: "bg-green-100 text-green-700" },
  { value: "cancelled",   label: "Cancelled",    color: "bg-red-100 text-red-700" },
];

function statusBadge(value, list) {
  const s = list.find(x => x.value === value) || { label: value, color: "bg-stone-100 text-stone-600" };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.color}`}>
      {s.label}
    </span>
  );
}

function StatusSelect({ current, options, onChange, loading }) {
  return (
    <select
      value={current}
      disabled={loading}
      onChange={e => onChange(e.target.value)}
      className="text-xs border border-stone-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-gold disabled:opacity-50 cursor-pointer"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-2 justify-end mt-4">
      <Button variant="ghost" size="icon" disabled={page === 1} onClick={() => onPage(page - 1)}>
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-sm text-taupe">{page} / {totalPages}</span>
      <Button variant="ghost" size="icon" disabled={page === totalPages} onClick={() => onPage(page + 1)}>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function OrdersTab() {
  const [page, setPage] = useState(1);
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

  if (isLoading) return <p className="text-taupe text-sm py-8 text-center">Loading orders…</p>;
  if (!data?.items?.length) return <p className="text-taupe text-sm py-8 text-center">No orders yet.</p>;

  return (
    <div>
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
              <th className="px-4 py-3">Deliver to</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Update</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {data.items.map(o => {
              const isUpdating = mutVars?.id === o.id;
              const dateStr = o.created_at
                ? new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                : "—";
              const itemSummary = o.items?.map(i => i.name || i.product_name || "Item").slice(0, 2).join(", ")
                + (o.items?.length > 2 ? ` +${o.items.length - 2}` : "");
              const city = o.shipping_address?.city || "—";

              return (
                <tr key={o.id} className="hover:bg-stone-50 transition-colors">
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={data.total_pages} onPage={setPage} />
    </div>
  );
}

function BookingsTab() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-bookings", page],
    queryFn: () => api.get(`/admin/bookings?page=${page}&limit=20`).then(r => r.data),
    retry: false,
  });

  const { mutate: updateStatus, variables: mutVars } = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/admin/bookings/${id}/status`, { status }),
    onSuccess: (_, { status }) => {
      toast.success(`Booking updated to "${status}"`);
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: () => toast.error("Failed to update status"),
  });

  if (isLoading) return <p className="text-taupe text-sm py-8 text-center">Loading bookings…</p>;
  if (!data?.items?.length) return <p className="text-taupe text-sm py-8 text-center">No bookings yet.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-taupe">{data.total} bookings total</p>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1 text-xs text-taupe">
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-100">
        <table className="w-full text-sm text-left">
          <thead className="bg-rosemist/40 text-xs uppercase text-taupe">
            <tr>
              <th className="px-4 py-3">Date booked</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Slot</th>
              <th className="px-4 py-3">Appt. date</th>
              <th className="px-4 py-3">Address</th>
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
              const city = b.address?.city || "—";
              const apptDate = b.date
                ? new Date(b.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                : "—";

              return (
                <tr key={b.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-taupe whitespace-nowrap">{createdStr}</td>
                  <td className="px-4 py-3 text-espresso font-medium max-w-[140px] truncate">{b.service_name}</td>
                  <td className="px-4 py-3 text-xs text-taupe whitespace-nowrap">{b.time_slot}</td>
                  <td className="px-4 py-3 text-xs text-taupe whitespace-nowrap">{apptDate}</td>
                  <td className="px-4 py-3 text-xs text-taupe">{city}</td>
                  <td className="px-4 py-3">{statusBadge(b.status, BOOKING_STATUSES)}</td>
                  <td className="px-4 py-3">
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

      <Pagination page={page} totalPages={data.total_pages} onPage={setPage} />
    </div>
  );
}

export default function Admin() {
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("orders");

  if (!isLoggedIn || !user?.is_admin) {
    return (
      <div className="min-h-screen bg-ivory text-espresso">
        <Header />
        <main className="pt-28 pb-20 flex flex-col items-center justify-center gap-4 min-h-[60vh]">
          <p className="text-taupe">This page is only accessible to admins.</p>
          <Button onClick={() => navigate("/")} className="rounded-full bg-espresso text-ivory px-6">
            Go Home
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const tabs = [
    { id: "orders",   label: "Orders",   Icon: Package },
    { id: "bookings", label: "Bookings", Icon: Scissors },
  ];

  return (
    <div className="min-h-screen bg-ivory text-espresso">
      <Header />

      <main className="pt-28 pb-24 px-4 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>

          <div className="mb-6">
            <h1 className="font-serif text-2xl text-espresso">Admin Dashboard</h1>
            <p className="text-taupe text-sm mt-1">Manage all orders and bookings across ZiyaNisa.</p>
          </div>

          {/* Tab bar */}
          <div className="flex gap-2 mb-6 border-b border-stone-200">
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  tab === id
                    ? "border-espresso text-espresso"
                    : "border-transparent text-taupe hover:text-espresso"
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          {tab === "orders"   && <OrdersTab />}
          {tab === "bookings" && <BookingsTab />}

        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
