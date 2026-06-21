import { useState } from "react";
import { Home, Search, Calendar, Heart, User, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";

const TABS = [
  { id: "home", label: "Home", Icon: Home },
  { id: "shop", label: "Shop", Icon: Search },
  { id: "book", label: "Book", Icon: Calendar },
  { id: "wishlist", label: "Saved", Icon: Heart },
  { id: "account", label: "Me", Icon: User },
];

export default function MobileBottomNav() {
  const [active, setActive] = useState("home");
  return (
    <>
      {/* Floating cart button */}
      <button
        data-testid="floating-cart"
        className="lg:hidden fixed right-4 bottom-24 z-40 w-14 h-14 rounded-full bg-espresso text-ivory shadow-cardLift grid place-items-center hover:bg-espresso/90 transition"
        aria-label="Open cart"
      >
        <ShoppingBag className="w-5 h-5" />
        <span className="absolute -top-1 -right-1 bg-gold text-espresso text-[10px] rounded-full w-5 h-5 grid place-items-center font-bold">
          2
        </span>
      </button>

      <nav
        data-testid="mobile-bottom-nav"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-pearl/90 backdrop-blur-xl border-t border-gold/15"
      >
        <div className="grid grid-cols-5 h-16">
          {TABS.map((t) => {
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                data-testid={`bnav-${t.id}`}
                onClick={() => setActive(t.id)}
                className="relative flex flex-col items-center justify-center gap-1 text-[10px] uppercase tracking-[0.15em]"
              >
                {isActive && (
                  <motion.span
                    layoutId="bnav-pill"
                    className="absolute top-0 inset-x-6 h-0.5 bg-gold rounded-full"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <t.Icon className={`w-5 h-5 ${isActive ? "text-espresso" : "text-taupe"}`} />
                <span className={isActive ? "text-espresso" : "text-taupe"}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* spacer so content isn't hidden behind nav on mobile */}
      <div className="lg:hidden h-16" />
    </>
  );
}
