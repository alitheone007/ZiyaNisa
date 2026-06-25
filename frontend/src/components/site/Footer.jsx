import { Instagram, Facebook, Youtube, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const COLS = [
  {
    title: "Shop",
    items: [
      { label: "Skincare",          href: "/shop/skincare" },
      { label: "Haircare",          href: "/shop/haircare" },
      { label: "Makeup",            href: "/shop/makeup" },
      { label: "Fragrance & Ittar", href: "/shop/fragrance" },
      { label: "Jewellery",         href: "/shop/jewellery" },
      { label: "Handbags",          href: "/shop/handbags" },
    ],
  },
  {
    title: "Home Salon",
    items: [
      { label: "Facials & Cleanup",    href: "/services" },
      { label: "Bridal Makeup",        href: "/services" },
      { label: "Hair Spa",             href: "/services" },
      { label: "Manicure & Pedicure",  href: "/services" },
      { label: "Waxing",               href: "/services" },
      { label: "Men's Grooming",       href: "/services" },
    ],
  },
  {
    title: "Partner",
    items: [
      { label: "Become a Beautician",  href: "/beautician/apply" },
      { label: "Sell on ZiyaNisa",     href: "#footer" },
      { label: "Brand Partnerships",   href: "#footer" },
      { label: "Affiliate Program",    href: "#footer" },
    ],
  },
  {
    title: "Company",
    items: [
      { label: "About ZiyaNisa",       href: "#footer" },
      { label: "Clean Beauty Journal", href: "#footer" },
      { label: "Press",                href: "#footer" },
      { label: "Careers",              href: "#footer" },
      { label: "Contact",              href: "#footer" },
    ],
  },
];

export default function Footer() {
  return (
    <footer id="footer" data-testid="site-footer" className="relative bg-espresso text-ivory pt-20 pb-10 mt-10">
      <div className="absolute top-0 inset-x-0 h-px shimmer-ribbon" />

      <div className="max-w-7xl mx-auto px-5 md:px-10">
        {/* Brand block */}
        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <a href="/" className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-full bg-gradient-to-br from-gold to-champagne grid place-items-center">
                <span className="text-espresso font-serif">Z</span>
              </span>
              <span className="font-serif text-2xl tracking-[0.18em]">
                ZIYA<span className="text-gold">NISA</span>
              </span>
            </a>
            <p className="mt-5 text-champagne/80 text-sm leading-relaxed max-w-sm">
              From serum to service, ZiyaNisa completes your routine — clean actives,
              skilled care, and timeless adornment in one premium marketplace.
            </p>

            <div className="mt-6">
              <div className="text-xs uppercase tracking-[0.25em] text-gold">Stay in the glow</div>
              <div className="mt-3 flex gap-2 max-w-sm">
                <Input
                  data-testid="newsletter-email"
                  type="email"
                  placeholder="your@email.com"
                  className="h-11 rounded-full bg-ivory/5 border-champagne/20 text-ivory placeholder:text-champagne/50 focus-visible:ring-gold/40"
                />
                <Button
                  data-testid="newsletter-submit"
                  className="rounded-full h-11 px-5 bg-gold text-espresso hover:bg-champagne"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="mt-7 flex items-center gap-3">
              <SocialBtn Icon={Instagram} label="instagram" />
              <SocialBtn Icon={Facebook} label="facebook" />
              <SocialBtn Icon={Youtube} label="youtube" />
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            {COLS.map((c) => (
              <div key={c.title}>
                <div className="text-xs uppercase tracking-[0.25em] text-gold">{c.title}</div>
                <ul className="mt-4 space-y-2">
                  {c.items.map(({ label, href }) => (
                    <li key={label}>
                      {href.startsWith("/") ? (
                        <Link to={href} className="text-sm text-champagne/80 hover:text-ivory transition">
                          {label}
                        </Link>
                      ) : (
                        <a href={href} className="text-sm text-champagne/80 hover:text-ivory transition">
                          {label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="gold-divider my-10 opacity-60" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs text-champagne/70">
          <div>© {new Date().getFullYear()} ZiyaNisa Beauty &amp; Lifestyle Pvt Ltd. Made with grace in Hyderabad.</div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <a href="#footer" className="hover:text-ivory">Privacy</a>
            <a href="#footer" className="hover:text-ivory">Terms</a>
            <a href="#footer" className="hover:text-ivory">Shipping & Returns</a>
            <a href="#footer" className="hover:text-ivory">Ingredient Glossary</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialBtn({ Icon, label }) {
  return (
    <a
      href="#footer"
      data-testid={`social-${label}`}
      aria-label={label}
      className="w-10 h-10 grid place-items-center rounded-full border border-champagne/25 hover:bg-gold hover:text-espresso hover:border-gold transition"
    >
      <Icon className="w-4 h-4" />
    </a>
  );
}
