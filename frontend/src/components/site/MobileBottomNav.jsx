import { Home, Search, Calendar, Heart, User, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";

const TABS = [
  { id: "home",     label: "Home",  Icon: Home,     href: "/" },
  { id: "shop",     label: "Shop",  Icon: Search,   href: "/shop" },
  { id: "book",     label: "Book",  Icon: Calendar, href: "/services" },
  { id: "wishlist", label: "Saved", Icon: Heart,    href: "/wishlist" },
  { id: "account",  label: "Me",    Icon: User,     href: "/account" },
];

export default function MobileBottomNav() {
  const { totalItems } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (href) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  return (
    <>
      {/* Floating cart FAB — sits above bottom nav, below WhatsApp */}
      <button
        data-testid="floating-cart"
        onClick={() => navigate("/cart")}
        className="lg:hidden fixed right-4 bottom-[4.5rem] z-40 w-14 h-14 rounded-full bg-espresso text-ivory shadow-cardLift grid place-items-center hover:bg-espresso/90 transition"
        aria-label="Open cart"
      >
        <ShoppingBag className="w-5 h-5" />
        {totalItems > 0 && (
          <span className="absolute -top-1 -right-1 bg-gold text-espresso text-[10px] rounded-full w-5 h-5 grid place-items-center font-bold">
            {totalItems}
          </span>
        )}
      </button>

      <nav
        data-testid="mobile-bottom-nav"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-pearl/90 backdrop-blur-xl border-t border-gold/15"
      >
        <div className="grid grid-cols-5 h-16">
          {TABS.map((t) => {
            const active = isActive(t.href);
            return (
              <Link
                key={t.id}
                to={t.href}
                data-testid={`bnav-${t.id}`}
                className="relative flex flex-col items-center justify-center gap-1 text-[10px] uppercase tracking-[0.15em]"
              >
                {active && (
                  <motion.span
                    layoutId="bnav-pill"
                    className="absolute top-0 inset-x-6 h-0.5 bg-gold rounded-full"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <t.Icon className={`w-5 h-5 ${active ? "text-espresso" : "text-taupe"}`} />
                <span className={active ? "text-espresso" : "text-taupe"}>{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Spacer so content isn't hidden behind nav on mobile */}
      <div className="lg:hidden h-16" />
    </>
  );
}
