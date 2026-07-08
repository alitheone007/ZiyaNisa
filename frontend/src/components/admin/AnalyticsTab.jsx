import { useQuery } from "@tanstack/react-query";
import { Package, RefreshCw, BarChart2, ShoppingBag, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { ORDER_STATUSES, StatCard } from "./shared";

export function AnalyticsTab() {
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
