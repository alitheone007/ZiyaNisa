import Header from "@/components/site/Header";
import Seo from "@/components/site/Seo";
import Hero from "@/components/site/Hero";
import TrustBadges from "@/components/site/TrustBadges";
import CategoryGrid from "@/components/site/CategoryGrid";
import ProductTeaser from "@/components/site/ProductTeaser";
import PersonalizedSection from "@/components/site/PersonalizedSection";
import KoreanGlow from "@/components/site/KoreanGlow";
import ServiceTeaser from "@/components/site/ServiceTeaser";
import BeauticianOnboard from "@/components/site/BeauticianOnboard";
import IttarTeaser from "@/components/site/IttarTeaser";
import JewelleryTeaser from "@/components/site/JewelleryTeaser";
import MobileBottomNav from "@/components/site/MobileBottomNav";
import Footer from "@/components/site/Footer";

export default function Home() {
  return (
    <div data-testid="home-page" className="min-h-screen bg-ivory text-espresso">
      <Seo path="/" />
      <Header />
      <main>
        <Hero />
        <TrustBadges />
        <CategoryGrid />
        <ProductTeaser />
        <PersonalizedSection />
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
