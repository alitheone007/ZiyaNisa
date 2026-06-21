import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, MapPin, Heart, ShoppingBag, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { label: "Shop", href: "#categories" },
  { label: "Home Salon", href: "#services" },
  { label: "Ittar", href: "#ittar" },
  { label: "Jewellery", href: "#jewellery" },
  { label: "Journal", href: "#footer" }, // TODO(next-AI): /journal route
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [location, setLocation] = useState("Hyderabad");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      data-testid="site-header"
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-ivory/85 backdrop-blur-xl border-b border-gold/15 shadow-soft"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 md:px-10 h-16 md:h-20 flex items-center gap-4">
        {/* Logo */}
        <a href="/" data-testid="brand-logo" className="flex items-center gap-2 shrink-0">
          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-gold to-champagne shadow-goldGlow grid place-items-center">
            <span className="text-pearl font-serif text-sm">Z</span>
          </span>
          <span className="font-serif text-xl md:text-2xl text-espresso tracking-[0.18em]">
            ZIYA<span className="text-gold">NISA</span>
          </span>
        </a>

        {/* Search (desktop) */}
        <div className="hidden md:flex flex-1 max-w-xl relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-taupe" />
          <Input
            data-testid="search-input"
            placeholder="Search skincare, sunscreen, facial, ittar, jewellery…"
            className="pl-11 h-11 rounded-full bg-pearl/80 border-gold/20 focus-visible:ring-gold/40 placeholder:text-taupe"
          />
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-1 md:gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                data-testid="location-trigger"
                variant="ghost"
                className="hidden sm:flex gap-1.5 text-espresso hover:bg-rosemist/60 rounded-full h-10"
              >
                <MapPin className="w-4 h-4 text-gold" />
                <span className="text-sm">{location}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-pearl border-gold/20">
              {["Hyderabad", "Bengaluru", "Mumbai", "Delhi NCR", "Chennai"].map((c) => (
                <DropdownMenuItem
                  key={c}
                  data-testid={`loc-${c.toLowerCase().replace(/\s+/g, "-")}`}
                  onClick={() => setLocation(c)}
                  className="text-espresso focus:bg-rosemist"
                >
                  <MapPin className="w-3.5 h-3.5 mr-2 text-gold" />
                  {c}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <nav className="hidden lg:flex items-center gap-1 mx-2">
            {NAV.map((n) => (
              <a
                key={n.label}
                href={n.href}
                data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}
                className="px-3 py-2 text-sm text-espresso/80 hover:text-espresso rounded-full hover:bg-rosemist/60 transition"
              >
                {n.label}
              </a>
            ))}
          </nav>

          <Button data-testid="wishlist-btn" variant="ghost" size="icon" className="rounded-full hover:bg-rosemist/60">
            <Heart className="w-5 h-5 text-espresso" />
          </Button>
          <Button data-testid="cart-btn" variant="ghost" size="icon" className="rounded-full hover:bg-rosemist/60 relative">
            <ShoppingBag className="w-5 h-5 text-espresso" />
            <span className="absolute -top-0.5 -right-0.5 bg-gold text-pearl text-[10px] rounded-full w-4 h-4 grid place-items-center font-semibold">
              2
            </span>
          </Button>
          <Button data-testid="account-btn" variant="ghost" size="icon" className="rounded-full hover:bg-rosemist/60 hidden sm:flex">
            <User className="w-5 h-5 text-espresso" />
          </Button>
          <Button data-testid="mobile-menu-btn" variant="ghost" size="icon" className="rounded-full hover:bg-rosemist/60 lg:hidden">
            <Menu className="w-5 h-5 text-espresso" />
          </Button>
        </div>
      </div>

      {/* Mobile search */}
      <div className="md:hidden px-5 pb-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-taupe" />
          <Input
            data-testid="search-input-mobile"
            placeholder="Search skincare, ittar, facial…"
            className="pl-11 h-10 rounded-full bg-pearl/90 border-gold/20 placeholder:text-taupe"
          />
        </div>
      </div>
    </motion.header>
  );
}
