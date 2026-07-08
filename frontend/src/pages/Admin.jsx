import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Package, BarChart2, ShoppingBag, UserCheck, ClipboardList,
  Tag, Layers, Calendar, FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import Seo from "@/components/site/Seo";
import { useAuth } from "@/context/AuthContext";
import { AnalyticsTab } from "@/components/admin/AnalyticsTab";
import { ProductsTab } from "@/components/admin/ProductsTab";
import { ServicesTab } from "@/components/admin/ServicesTab";
import { CategoriesTab } from "@/components/admin/CategoriesTab";
import { OrdersTab } from "@/components/admin/OrdersTab";
import { BookingsTab } from "@/components/admin/BookingsTab";
import { BeauticiansTab } from "@/components/admin/BeauticiansTab";
import { InboxTab } from "@/components/admin/InboxTab";
import { BugReportButton } from "@/components/admin/BugWidgets";
import AmazonTab from "@/components/admin/AmazonTab";

export default function Admin() {
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("analytics");

  if (!isLoggedIn || !user?.is_admin) {
    return (
      <div className="min-h-screen bg-ivory text-espresso">
        <Seo title="Admin" noindex />
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
    { id: "analytics",   label: "Analytics",    Icon: BarChart2 },
    { id: "products",    label: "Products",      Icon: ShoppingBag },
    { id: "services",    label: "Services",      Icon: Tag },
    { id: "categories",  label: "Categories",    Icon: Layers },
    { id: "orders",      label: "Orders",        Icon: Package },
    { id: "bookings",    label: "Svc Bookings",  Icon: Calendar },
    { id: "beauticians", label: "Beauticians",   Icon: UserCheck },
    { id: "inbox",       label: "Inbox",         Icon: ClipboardList },
    { id: "amazon",      label: "Amazon",        Icon: FileSpreadsheet },
  ];

  return (
    <div className="min-h-screen bg-ivory text-espresso">
      <Seo title="Admin" noindex />
      <Header />
      <main className="pt-28 pb-24 px-4 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <div className="mb-6">
            <h1 className="font-serif text-2xl text-espresso">Admin Dashboard</h1>
            <p className="text-taupe text-sm mt-1">Manage products, orders, service bookings, beauticians and analytics.</p>
          </div>

          {/* Mobile: dropdown selector */}
          <div className="md:hidden mb-5">
            <select
              value={tab}
              onChange={e => setTab(e.target.value)}
              className="w-full h-11 rounded-xl border border-stone-200 px-4 text-sm text-espresso bg-white focus:outline-none focus:ring-1 focus:ring-gold appearance-none"
            >
              {tabs.map(({ id, label }) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </div>

          {/* Desktop: horizontal tab strip */}
          <div className="hidden md:flex gap-1 mb-6 border-b border-stone-200 overflow-x-auto">
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
          {tab === "services"    && <ServicesTab />}
          {tab === "categories"  && <CategoriesTab />}
          {tab === "orders"      && <OrdersTab />}
          {tab === "bookings"    && <BookingsTab />}
          {tab === "beauticians" && <BeauticiansTab />}
          {tab === "inbox"       && <InboxTab />}
          {tab === "amazon"      && <AmazonTab />}
        </motion.div>
      </main>
      <Footer />
      <BugReportButton />
    </div>
  );
}
