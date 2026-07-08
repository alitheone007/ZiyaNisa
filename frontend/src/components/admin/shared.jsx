import { ChevronLeft, ChevronRight, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";

export const HYD_AREAS_ADMIN = [
  "Banjara Hills","Jubilee Hills","Madhapur","Hitech City","Gachibowli","Kondapur",
  "Panjagutta","Ameerpet","Masab Tank","Film Nagar","Somajiguda","Begumpet",
  "Kukatpally","KPHB Colony","Secunderabad","Dilsukhnagar","LB Nagar","Manikonda",
  "Kompally","Nizampet","Miyapur","Tolichowki","Mehdipatnam","Nanakramguda",
];

export const SKILL_MAP = {
  s1: "Korean Glow Facial", s2: "Saffron Cleanup", s3: "Bridal Makeup",
  s4: "Pedicure", s5: "Hair Spa", s6: "Manicure", s7: "Waxing", s8: "Party Makeup",
};

export const ORDER_STATUSES = [
  { value: "pending_payment",   label: "Awaiting Payment",  color: "bg-amber-100 text-amber-700" },
  { value: "payment_confirmed", label: "Payment Confirmed", color: "bg-blue-100 text-blue-700" },
  { value: "dispatched",        label: "Dispatched",        color: "bg-indigo-100 text-indigo-700" },
  { value: "delivered",         label: "Delivered",         color: "bg-green-100 text-green-700" },
  { value: "cancelled",         label: "Cancelled",         color: "bg-red-100 text-red-700" },
];

export const BOOKING_STATUSES = [
  { value: "confirmed",   label: "Confirmed",   color: "bg-blue-100 text-blue-700" },
  { value: "in_progress", label: "In Progress", color: "bg-amber-100 text-amber-700" },
  { value: "completed",   label: "Completed",   color: "bg-green-100 text-green-700" },
  { value: "cancelled",   label: "Cancelled",   color: "bg-red-100 text-red-700" },
];

export function statusBadge(value, list) {
  const s = list.find(x => x.value === value) || { label: value, color: "bg-stone-100 text-stone-600" };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>;
}

export function StatusSelect({ current, options, onChange, loading }) {
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

export function Pagination({ page, totalPages, onPage }) {
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

export function StatCard({ label, value, icon: Icon, sub, color = "text-espresso" }) {
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
export const EMPTY_FORM = {
  name: "", brand: "", price: "", mrp: "", img: "", images: [],
  category_id: "", actives: "", badges: "", in_stock: true,
};
export const EMPTY_SERVICE  = { name: "", duration: "60 min", price: "", img: "", level: "Trained", tag: "" };
export const EMPTY_CATEGORY = { id: "", label: "", img: "" };
export const SERVICE_LEVELS = ["Trained", "Senior", "Expert", "Bridal Expert"];

// ── Services Tab ──────────────────────────────────────────────────────────────
export const EMPTY_EDIT_ORDER = { shipping_address: null, notes: "", discount: 0 };

export function InfoItem({ label, children }) {
  return (
    <div className="bg-stone-50 rounded-xl p-3">
      <p className="text-[10px] uppercase tracking-widest text-taupe mb-1">{label}</p>
      {children}
    </div>
  );
}

// ── Beauticians Tab ───────────────────────────────────────────────────────────
export const EMPTY_B = {
  name: "", photo: "", phone: "", lat: "", lng: "",
  area: "Banjara Hills", skills: [], rating: "5.0", active: true,
};

export function compressToBase64(file, maxWidth = 900, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image load failed")); };
    img.src = url;
  });
}

export const BUG_STATUSES = [
  { value: "open",         label: "Open",         color: "bg-red-100 text-red-700" },
  { value: "acknowledged", label: "Acknowledged", color: "bg-blue-100 text-blue-700" },
  { value: "in_progress",  label: "In Progress",  color: "bg-amber-100 text-amber-700" },
  { value: "resolved",     label: "Resolved",     color: "bg-green-100 text-green-700" },
  { value: "wont_fix",     label: "Won't Fix",    color: "bg-stone-100 text-stone-600" },
];

export const SEVERITY_STYLES = {
  critical: { badge: "bg-red-100 text-red-700", emoji: "🔴" },
  high:     { badge: "bg-orange-100 text-orange-700", emoji: "🟠" },
  medium:   { badge: "bg-amber-100 text-amber-700", emoji: "🟡" },
  low:      { badge: "bg-green-100 text-green-700", emoji: "🟢" },
};

// ── Bug Report Modal ───────────────────────────────────────────────────────────

export const FR_STATUSES = [
  { value: "new",                label: "New",                color: "bg-blue-100 text-blue-700" },
  { value: "under_consideration",label: "Under Consideration",color: "bg-purple-100 text-purple-700" },
  { value: "planned",            label: "Planned",            color: "bg-indigo-100 text-indigo-700" },
  { value: "in_progress",        label: "In Progress",        color: "bg-amber-100 text-amber-700" },
  { value: "shipped",            label: "Shipped",            color: "bg-green-100 text-green-700" },
  { value: "declined",           label: "Declined",           color: "bg-stone-100 text-stone-600" },
];

export const PRIORITY_STYLES = {
  critical:     { badge: "bg-red-100 text-red-700",    emoji: "🔴" },
  important:    { badge: "bg-orange-100 text-orange-700", emoji: "🟠" },
  useful:       { badge: "bg-amber-100 text-amber-700",  emoji: "🟡" },
  nice_to_have: { badge: "bg-green-100 text-green-700",  emoji: "🟢" },
};

