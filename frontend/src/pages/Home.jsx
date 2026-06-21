import Header from "@/components/site/Header";
import Hero from "@/components/site/Hero";
import TrustBadges from "@/components/site/TrustBadges";
import CategoryGrid from "@/components/site/CategoryGrid";
import ProductTeaser from "@/components/site/ProductTeaser";
import KoreanGlow from "@/components/site/KoreanGlow";
import ServiceTeaser from "@/components/site/ServiceTeaser";
import BeauticianOnboard from "@/components/site/BeauticianOnboard";
import IttarTeaser from "@/components/site/IttarTeaser";
import JewelleryTeaser from "@/components/site/JewelleryTeaser";
import MobileBottomNav from "@/components/site/MobileBottomNav";
import Footer from "@/components/site/Footer";

/**
 * ZiyaNisa — Visual preview homepage.
 * Order follows the brand narrative: K-Glow Beauty → Deccan Grace → At-home Service → Adornment.
 *
 * PENDING (next AI):
 *   - Replace mock seed data with /api/* responses
 *   - Hook each CTA to its real route (see App.js TODOs)
 *   - Add product filters / drawer / quick-view modal on /shop
 */
export default function Home() {
  return (
    <div data-testid="home-page" className="min-h-screen bg-ivory text-espresso">
      <Header />
      <main>
        <Hero />
        <TrustBadges />
        <CategoryGrid />
        <ProductTeaser />
        <KoreanGlow />
        <ServiceTeaser />
        <BeauticianOnboard />
        <IttarTeaser />
        <JewelleryTeaser />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
