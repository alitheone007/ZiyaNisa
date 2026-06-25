import { Fragment, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Scissors, ChevronLeft, ChevronRight, RefreshCw,
  BarChart2, ShoppingBag, TrendingUp, Users, Plus, Pencil,
  Trash2, ToggleLeft, ToggleRight, Truck, X, Check,
  MapPin, Star, Phone, UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import api from "@/lib/api";

const HYD_AREAS_ADMIN = [
  "Banjara Hills","Jubilee Hills","Madhapur","Hitech City","Gachibowli","Kondapur",
  "Panjagutta","Ameerpet","Masab Tank","Film Nagar","Somajiguda","Begumpet",
  "Kukatpally","KPHB Colony","Secunderabad","Dilsukhnagar","LB Nagar","Manikonda",
  "Kompally","Nizampet","Miyapur","Tolichowki","Mehdipatnam","Nanakramguda",
];

const SKILL_MAP = {
  s1: "Korean Glow Facial", s2: "Saffron Cleanup", s3: "Bridal Makeup",
  s4: "Pedicure", s5: "Hair Spa", s6: "Manicure", s7: "Waxing", s8: "Party Makeup",
};

const ORDER_STATUSES = [
  { value: "pending_payment",   label: "Awaiting Payment",  color: "bg-amber-100 text-amber-700" },
  { value: "payment_confirmed", label: "Payment Confirmed", color: "bg-blue-100 text-blue-700" },
  { value: "dispatched",        label: "Dispatched",        color: "bg-indigo-100 text-indigo-700" },
  { value: "delivered",         label: "Delivered",         color: "bg-green-100 text-green-700" },
  { value: "cancelled",         label: "Cancelled",         color: "bg-red-100 text-red-700" },
];

const BOOKING_STATUSES = [
  { value: "confirmed",   label: "Confirmed",   color: "bg-blue-100 text-blue-700" },
  { value: "in_progress", label: "In Progress", color: "bg-amber-100 text-amber-700" },
  { value: "completed",   label: "Completed",   color: "bg-green-100 text-green-700" },
  { value: "cancelled",   label: "Cancelled",   color: "bg-red-100 text-red-700" },
];

function statusBadge(value, list) {
  const s = list.find(x => x.value === value) || { label: value, color: "bg-stone-100 text-stone-600" };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>;
}

function StatusSelect({ current, options, onChange, loading }) {
  return (
    <select
      value={current}
      disabled={loading}
      onChange={e => onChange(e.target.value)}
      className="text-xs border border-stone-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-gold disabled:opacity-50 cursor-pointer"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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

function StatCard({ label, value, icon: Icon, sub, color = "text-espresso" }) {
  return (
    <div className="bg-pearl rounded-2xl border border-gold/15 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-taupe uppercase tracking-wider">{label}</p>
        <div className="w-8 h-8 rounded-full bg-rosemist/60 grid place-items-center">
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-taupe mt-1">{sub}</p>}
    </div>
  );
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => api.get("/admin/analytics").then(r => r.data),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 animate-pulse">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-28 bg-rosemist/40 rounded-2xl" />)}
      </div>
    );
  }
  if (!data) return <p className="text-taupe text-sm py-8 text-center">No analytics data yet.</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Revenue" icon={TrendingUp}
          value={`₹${(data.total_revenue || 0).toLocaleString("en-IN")}`}
          sub={`${data.total_orders} orders all-time`} />
        <StatCard label="This Week" icon={BarChart2}
          value={`₹${(data.revenue_this_week || 0).toLocaleString("en-IN")}`}
          sub={`${data.orders_this_week} orders`} color="text-indigo-600" />
        <StatCard label="Total Orders" icon={ShoppingBag}
          value={data.total_orders || 0} />
        <StatCard label="Week Orders" icon={Package}
          value={data.orders_this_week || 0} color="text-blue-600" />
        <StatCard label="Customers" icon={Users}
          value={data.total_customers || 0} color="text-gold" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-pearl rounded-2xl border border-gold/15 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-espresso text-sm">Top Products by Revenue</h3>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-xs text-taupe gap-1 h-7">
              <RefreshCw className="w-3 h-3" /> Refresh
            </Button>
          </div>
          {!data.top_products?.length ? (
            <p className="text-taupe text-xs text-center py-6">No sales data yet.</p>
          ) : (
            <div className="space-y-3">
              {data.top_products.map((p, i) => (
                <div key={p._id || i} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-rosemist/60 text-[10px] text-taupe grid place-items-center shrink-0 font-medium">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-espresso font-medium truncate">{p.name || p._id}</p>
                    <p className="text-xs text-taupe">{p.qty_sold} units sold</p>
                  </div>
                  <p className="text-sm font-semibold text-espresso shrink-0">
                    ₹{(p.revenue || 0).toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-pearl rounded-2xl border border-gold/15 p-5">
          <h3 className="font-medium text-espresso text-sm mb-4">Recent Orders</h3>
          {!data.recent_orders?.length ? (
            <p className="text-taupe text-xs text-center py-6">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recent_orders.map(o => {
                const s = ORDER_STATUSES.find(x => x.value === o.status);
                const dateStr = o.created_at
                  ? new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                  : "—";
                return (
                  <div key={o.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-taupe">#{o.id?.slice(-8).toUpperCase()} · {dateStr}</p>
                      <p className="text-sm text-espresso font-medium">
                        ₹{(o.total || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${s?.color || "bg-stone-100 text-stone-600"}`}>
                      {s?.label || o.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Products Tab ──────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: "", brand: "", price: "", mrp: "", img: "",
  category_id: "", actives: "", badges: "", in_stock: true,
};

function ProductsTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-products", page],
    queryFn: () => api.get(`/products?limit=12&page=${page}`).then(r => r.data),
    retry: false,
  });

  const { mutate: saveProduct, isPending: saving } = useMutation({
    mutationFn: (payload) => editId
      ? api.put(`/admin/products/${editId}`, payload)
      : api.post("/admin/products", payload),
    onSuccess: () => {
      toast.success(editId ? "Product updated" : "Product created");
      setShowForm(false);
      setEditId(null);
      setForm(EMPTY_FORM);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products-featured"] });
    },
    onError: () => toast.error("Failed to save product"),
  });

  const { mutate: deleteProduct, variables: delVar } = useMutation({
    mutationFn: (id) => api.delete(`/admin/products/${id}`),
    onSuccess: () => {
      toast.success("Product deleted");
      setDeleteConfirm(null);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: () => toast.error("Failed to delete product"),
  });

  const { mutate: toggleStock, variables: stockVar } = useMutation({
    mutationFn: ({ id, in_stock }) => api.patch(`/admin/products/${id}/stock`, { in_stock }),
    onSuccess: (_, { in_stock }) => {
      toast.success(in_stock ? "Marked in stock" : "Marked out of stock");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: () => toast.error("Failed to toggle stock"),
  });

  function openAdd() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openEdit(p) {
    setEditId(p.id);
    setForm({
      name: p.name || "",
      brand: p.brand || "",
      price: String(p.price || ""),
      mrp: String(p.mrp || ""),
      img: p.img || "",
      category_id: p.category_id || "",
      actives: (p.actives || []).join(", "),
      badges: (p.badges || []).join(", "),
      in_stock: p.in_stock !== false,
    });
    setShowForm(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.brand || !form.price || !form.img) {
      toast.error("Name, brand, price and image URL are required");
      return;
    }
    saveProduct({
      name: form.name,
      brand: form.brand,
      price: parseInt(form.price, 10),
      mrp: parseInt(form.mrp || form.price, 10),
      img: form.img,
      category_id: form.category_id || null,
      actives: form.actives.split(",").map(s => s.trim()).filter(Boolean),
      badges: form.badges.split(",").map(s => s.trim()).filter(Boolean),
      in_stock: form.in_stock,
    });
  }

  const products = data?.items || [];
  const FIELDS = [
    { key: "name",        label: "Product Name",              span: "col-span-2 md:col-span-2" },
    { key: "brand",       label: "Brand" },
    { key: "img",         label: "Image URL",                 span: "col-span-2 md:col-span-3" },
    { key: "price",       label: "Price (₹)",                 type: "number" },
    { key: "mrp",         label: "MRP (₹)",                   type: "number" },
    { key: "category_id", label: "Category ID" },
    { key: "actives",     label: "Actives (comma-separated)", span: "col-span-2" },
    { key: "badges",      label: "Badges (comma-separated)",  span: "col-span-2 md:col-span-1" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-taupe">{data?.total || 0} products</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1 text-xs text-taupe">
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
          <Button size="sm" onClick={openAdd}
            className="gap-1.5 rounded-full bg-espresso text-ivory text-xs h-8 px-4">
            <Plus className="w-3.5 h-3.5" /> Add Product
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-5"
          >
            <form onSubmit={handleSubmit}
              className="bg-pearl border border-gold/20 rounded-2xl p-5 grid grid-cols-2 md:grid-cols-3 gap-3">
              <h3 className="col-span-2 md:col-span-3 font-medium text-espresso text-sm mb-1">
                {editId ? "Edit Product" : "New Product"}
              </h3>
              {FIELDS.map(({ key, label, span = "", type = "text" }) => (
                <div key={key} className={span}>
                  <label className="text-[11px] text-taupe block mb-1">{label}</label>
                  <input
                    type={type}
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full h-9 rounded-lg border border-stone-200 px-3 text-sm text-espresso bg-white focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                </div>
              ))}
              <div className="flex items-center gap-2 col-span-2 md:col-span-1">
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, in_stock: !f.in_stock }))}
                  className="flex items-center gap-2 text-sm text-espresso select-none">
                  {form.in_stock
                    ? <ToggleRight className="w-7 h-7 text-green-600" />
                    : <ToggleLeft className="w-7 h-7 text-taupe" />}
                  In Stock
                </button>
              </div>
              <div className="col-span-2 md:col-span-3 flex gap-2 pt-1">
                <Button type="submit" disabled={saving}
                  className="rounded-full bg-espresso text-ivory px-6 text-sm h-9">
                  {saving ? "Saving…" : editId ? "Update Product" : "Create Product"}
                </Button>
                <Button type="button" variant="ghost"
                  onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY_FORM); }}
                  className="rounded-full text-taupe text-sm h-9">
                  Cancel
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <p className="text-taupe text-sm py-8 text-center">Loading products…</p>
      ) : products.length === 0 ? (
        <p className="text-taupe text-sm py-8 text-center">No products in DB yet. Add one above.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-100">
          <table className="w-full text-sm text-left">
            <thead className="bg-rosemist/40 text-xs uppercase text-taupe">
              <tr>
                <th className="px-4 py-3 w-14">Img</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {products.map(p => {
                const isTogglingStock = stockVar?.id === p.id;
                const isDeleting = delVar === p.id;
                return (
                  <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <img src={p.img} alt={p.name}
                        className="w-10 h-10 rounded-lg object-cover border border-gold/10" />
                    </td>
                    <td className="px-4 py-3 font-medium text-espresso max-w-[180px] truncate">{p.name}</td>
                    <td className="px-4 py-3 text-taupe text-xs">{p.brand}</td>
                    <td className="px-4 py-3 font-medium">₹{p.price?.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => !isTogglingStock && toggleStock({ id: p.id, in_stock: p.in_stock === false })}
                        className="flex items-center gap-1 text-xs">
                        {p.in_stock !== false
                          ? <><ToggleRight className="w-5 h-5 text-green-600" /><span className="text-green-600">In Stock</span></>
                          : <><ToggleLeft className="w-5 h-5 text-taupe" /><span className="text-taupe">Out of Stock</span></>}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)}
                          className="h-8 w-8 rounded-lg hover:bg-rosemist/60">
                          <Pencil className="w-3.5 h-3.5 text-taupe" />
                        </Button>
                        {deleteConfirm === p.id ? (
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" disabled={isDeleting}
                              onClick={() => deleteProduct(p.id)}
                              className="h-8 w-8 rounded-lg bg-red-50 hover:bg-red-100">
                              <Check className="w-3.5 h-3.5 text-red-600" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setDeleteConfirm(null)}
                              className="h-8 w-8 rounded-lg">
                              <X className="w-3.5 h-3.5 text-taupe" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="icon" variant="ghost" onClick={() => setDeleteConfirm(p.id)}
                            className="h-8 w-8 rounded-lg hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={data?.total_pages || 1} onPage={setPage} />
    </div>
  );
}

// ── Orders Tab ────────────────────────────────────────────────────────────────
function OrdersTab() {
  const [page, setPage] = useState(1);
  const [trackingInput, setTrackingInput] = useState({});
  const [trackingOpen, setTrackingOpen] = useState(null);
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
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Update</th>
              <th className="px-4 py-3">Tracking</th>
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
                      <Button size="sm" variant="ghost"
                        onClick={() => setTrackingOpen(isTrackingOpen ? null : o.id)}
                        className={`gap-1 text-xs h-7 px-2 rounded-lg ${o.tracking_url ? "text-indigo-600 hover:bg-indigo-50" : "text-taupe hover:bg-rosemist/60"}`}>
                        <Truck className="w-3.5 h-3.5" />
                        {o.tracking_url ? "Edit" : "Set"}
                      </Button>
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
function BookingsTab() {
  const [page, setPage] = useState(1);
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
    },
    onError: () => toast.error("Failed to update status"),
  });

  if (isLoading) return <p className="text-taupe text-sm py-8 text-center">Loading bookings…</p>;
  if (!data?.items?.length) return <p className="text-taupe text-sm py-8 text-center">No service bookings yet.</p>;

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
                <tr key={b.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-taupe whitespace-nowrap">{createdStr}</td>
                  <td className="px-4 py-3 text-espresso font-medium max-w-[130px] truncate">{b.service_name}</td>
                  <td className="px-4 py-3 text-xs text-taupe whitespace-nowrap">{b.time_slot}</td>
                  <td className="px-4 py-3 text-xs text-taupe whitespace-nowrap">{apptDate}</td>
                  <td className="px-4 py-3 text-xs text-espresso">{b.beautician_name || <span className="text-taupe">—</span>}</td>
                  <td className="px-4 py-3 text-xs text-taupe">{b.address?.city || "—"}</td>
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
      <Pagination page={page} totalPages={data.total_pages || 1} onPage={setPage} />
    </div>
  );
}

// ── Beauticians Tab ───────────────────────────────────────────────────────────
const EMPTY_B = {
  name: "", photo: "", phone: "", lat: "", lng: "",
  area: "Banjara Hills", skills: [], rating: "5.0", active: true,
};

function BeauticiansTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_B);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-beauticians"],
    queryFn: () => api.get("/admin/beauticians").then(r => r.data),
    retry: false,
  });

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (payload) => editId
      ? api.put(`/admin/beauticians/${editId}`, payload)
      : api.post("/admin/beauticians", payload),
    onSuccess: () => {
      toast.success(editId ? "Beautician updated" : "Beautician added");
      setShowForm(false); setEditId(null); setForm(EMPTY_B);
      qc.invalidateQueries({ queryKey: ["admin-beauticians"] });
    },
    onError: () => toast.error("Failed to save beautician"),
  });

  const { mutate: remove, variables: delVar } = useMutation({
    mutationFn: (id) => api.delete(`/admin/beauticians/${id}`),
    onSuccess: () => {
      toast.success("Beautician removed");
      setDeleteConfirm(null);
      qc.invalidateQueries({ queryKey: ["admin-beauticians"] });
    },
    onError: () => toast.error("Failed to remove"),
  });

  const { mutate: toggleDuty, variables: dutyVar } = useMutation({
    mutationFn: ({ id, on_duty }) => api.patch(`/admin/beauticians/${id}/duty`, { on_duty }),
    onSuccess: (_, { on_duty }) => {
      toast.success(on_duty ? "Marked On Duty" : "Marked Off Duty");
      qc.invalidateQueries({ queryKey: ["admin-beauticians"] });
    },
    onError: () => toast.error("Failed to toggle duty"),
  });

  function openEdit(b) {
    setEditId(b.id);
    setForm({
      name: b.name || "", photo: b.photo || "", phone: b.phone || "",
      lat: String(b.lat || ""), lng: String(b.lng || ""), area: b.area || "Banjara Hills",
      skills: b.skills || [], rating: String(b.rating || "5.0"), active: b.active !== false,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleSkill(sk) {
    setForm(f => ({
      ...f,
      skills: f.skills.includes(sk) ? f.skills.filter(s => s !== sk) : [...f.skills, sk],
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.phone || !form.area) {
      toast.error("Name, phone and area are required"); return;
    }
    save({
      name: form.name, photo: form.photo || null,
      phone: form.phone, lat: parseFloat(form.lat) || 0,
      lng: parseFloat(form.lng) || 0, area: form.area,
      skills: form.skills, rating: parseFloat(form.rating) || 5.0,
      active: form.active,
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-taupe">{items.length} beauticians</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1 text-xs text-taupe">
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
          <Button size="sm" onClick={() => { setEditId(null); setForm(EMPTY_B); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="gap-1.5 rounded-full bg-espresso text-ivory text-xs h-8 px-4">
            <Plus className="w-3.5 h-3.5" /> Add Beautician
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-5">
            <form onSubmit={handleSubmit}
              className="bg-pearl border border-gold/20 rounded-2xl p-5 space-y-4">
              <h3 className="font-medium text-espresso text-sm">
                {editId ? "Edit Beautician" : "Add Beautician"}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { key: "name",   label: "Full Name *",    span: "col-span-2 md:col-span-1" },
                  { key: "phone",  label: "Phone *",         type: "tel" },
                  { key: "photo",  label: "Photo URL",       span: "col-span-2 md:col-span-1" },
                  { key: "rating", label: "Rating (0–5)",    type: "number" },
                  { key: "lat",    label: "Latitude",         type: "number" },
                  { key: "lng",    label: "Longitude",        type: "number" },
                ].map(({ key, label, type = "text", span = "" }) => (
                  <div key={key} className={span}>
                    <label className="text-[11px] text-taupe block mb-1">{label}</label>
                    <input type={type} step="any" value={form[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full h-9 rounded-lg border border-stone-200 px-3 text-sm text-espresso bg-white focus:outline-none focus:ring-1 focus:ring-gold" />
                  </div>
                ))}
                <div>
                  <label className="text-[11px] text-taupe block mb-1">Area *</label>
                  <select value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                    className="w-full h-9 rounded-lg border border-stone-200 px-3 text-sm text-espresso bg-white focus:outline-none focus:ring-1 focus:ring-gold">
                    {HYD_AREAS_ADMIN.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-taupe block mb-2">Services offered</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(SKILL_MAP).map(([id, name]) => (
                    <button key={id} type="button" onClick={() => toggleSkill(id)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        form.skills.includes(id)
                          ? "border-espresso bg-espresso text-ivory"
                          : "border-gold/20 bg-white text-taupe hover:border-gold/40"
                      }`}>
                      {name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                  className="flex items-center gap-2 text-sm text-espresso select-none">
                  {form.active
                    ? <ToggleRight className="w-7 h-7 text-green-600" />
                    : <ToggleLeft className="w-7 h-7 text-taupe" />}
                  {form.active ? "Active" : "Inactive"}
                </button>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}
                  className="rounded-full bg-espresso text-ivory px-6 text-sm h-9">
                  {saving ? "Saving…" : editId ? "Update" : "Add Beautician"}
                </Button>
                <Button type="button" variant="ghost"
                  onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY_B); }}
                  className="rounded-full text-taupe text-sm h-9">Cancel</Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <p className="text-taupe text-sm py-8 text-center">Loading beauticians…</p>
      ) : items.length === 0 ? (
        <p className="text-taupe text-sm py-8 text-center">No beauticians yet. Add one above.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-100">
          <table className="w-full text-sm text-left">
            <thead className="bg-rosemist/40 text-xs uppercase text-taupe">
              <tr>
                <th className="px-4 py-3 w-12">Photo</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Skills</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Duty</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map(b => {
                const isDeleting = delVar === b.id;
                return (
                  <tr key={b.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      {b.photo
                        ? <img src={b.photo} alt={b.name} className="w-9 h-9 rounded-full object-cover border border-gold/15" />
                        : <div className="w-9 h-9 rounded-full bg-rosemist/50 grid place-items-center"><Users className="w-4 h-4 text-taupe" /></div>
                      }
                    </td>
                    <td className="px-4 py-3 font-medium text-espresso">{b.name}</td>
                    <td className="px-4 py-3 text-xs text-taupe">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{b.area}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-taupe">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{b.phone}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="flex items-center gap-1 text-gold font-medium">
                        <Star className="w-3 h-3 fill-gold" />{b.rating}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(b.skills || []).map(sk => (
                          <span key={sk} className="text-[10px] bg-rosemist/60 text-taupe px-1.5 py-0.5 rounded-full">
                            {SKILL_MAP[sk] || sk}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${b.active !== false ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"}`}>
                        {b.active !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        disabled={dutyVar?.id === b.id}
                        onClick={() => toggleDuty({ id: b.id, on_duty: b.on_duty === false })}
                        className="flex items-center gap-1 text-xs disabled:opacity-50">
                        {b.on_duty !== false
                          ? <><ToggleRight className="w-5 h-5 text-blue-500" /><span className="text-blue-600">On Duty</span></>
                          : <><ToggleLeft className="w-5 h-5 text-taupe" /><span className="text-taupe">Off Duty</span></>}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(b)}
                          className="h-8 w-8 rounded-lg hover:bg-rosemist/60">
                          <Pencil className="w-3.5 h-3.5 text-taupe" />
                        </Button>
                        {deleteConfirm === b.id ? (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" disabled={isDeleting}
                              onClick={() => remove(b.id)}
                              className="h-8 w-8 rounded-lg bg-red-50 hover:bg-red-100">
                              <Check className="w-3.5 h-3.5 text-red-600" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setDeleteConfirm(null)}
                              className="h-8 w-8 rounded-lg">
                              <X className="w-3.5 h-3.5 text-taupe" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="icon" variant="ghost" onClick={() => setDeleteConfirm(b.id)}
                            className="h-8 w-8 rounded-lg hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Admin Page ───────────────────────────────────────────────────────────
export default function Admin() {
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("analytics");

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
    { id: "analytics",   label: "Analytics",       Icon: BarChart2 },
    { id: "products",    label: "Products",         Icon: ShoppingBag },
    { id: "orders",      label: "Orders",           Icon: Package },
    { id: "bookings",    label: "Svc Bookings",     Icon: Scissors },
    { id: "beauticians", label: "Beauticians",      Icon: UserCheck },
  ];

  return (
    <div className="min-h-screen bg-ivory text-espresso">
      <Header />
      <main className="pt-28 pb-24 px-4 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <div className="mb-6">
            <h1 className="font-serif text-2xl text-espresso">Admin Dashboard</h1>
            <p className="text-taupe text-sm mt-1">Manage products, orders, service bookings, beauticians and analytics.</p>
          </div>

          <div className="flex gap-1 mb-6 border-b border-stone-200 overflow-x-auto">
            {tabs.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                  tab === id ? "border-espresso text-espresso" : "border-transparent text-taupe hover:text-espresso"
                }`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          {tab === "analytics"   && <AnalyticsTab />}
          {tab === "products"    && <ProductsTab />}
          {tab === "orders"      && <OrdersTab />}
          {tab === "bookings"    && <BookingsTab />}
          {tab === "beauticians" && <BeauticiansTab />}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
