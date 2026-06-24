import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { ProductCard } from "@/components/site/ProductTeaser";
import { SectionHead } from "@/components/site/CategoryGrid";
import api from "@/lib/api";

export default function PersonalizedSection() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["skin-profile"],
    queryFn: () => api.get("/skin-profile").then(r => r.data),
    enabled: isLoggedIn,
    staleTime: 5 * 60 * 1000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["for-me", !!profile],
    queryFn: () => api.get("/products/for-me?limit=8").then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const items = data?.items || [];

  // If not logged in, nudge toward the quiz
  if (!isLoggedIn) {
    return (
      <section className="py-20 md:py-28 bg-gradient-to-br from-rosemist/40 via-ivory to-champagne/20">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-gold/15 text-gold text-xs font-medium uppercase tracking-widest rounded-full px-4 py-2 mb-5">
              <Sparkles className="w-3.5 h-3.5" /> Skin Intelligence™
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-espresso mb-4 leading-tight">
              Products matched to <span className="italic font-light">your skin</span>
            </h2>
            <p className="text-taupe text-sm md:text-base mb-8 max-w-lg mx-auto">
              Answer 4 questions and we'll curate a personalised routine of actives, formats, and shades — built for your skin type and concerns.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate("/skin-quiz")}
                className="rounded-full bg-espresso text-ivory px-8 h-12 gap-2 text-base">
                <Sparkles className="w-4 h-4" /> Take the Skin Quiz
              </Button>
              <Button variant="outline" onClick={() => navigate("/login")}
                className="rounded-full border-gold/40 text-espresso px-8 h-12">
                Sign in first
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Logged in but no profile yet
  if (isLoggedIn && !profile) {
    return (
      <section className="py-20 md:py-28 bg-gradient-to-br from-rosemist/30 to-champagne/20">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <div className="flex flex-col md:flex-row items-center gap-8 bg-pearl rounded-3xl border border-gold/20 p-8 shadow-soft">
            <div className="flex-1">
              <div className="text-xs uppercase tracking-widest text-gold mb-2">Personalise your feed</div>
              <h2 className="font-serif text-2xl md:text-3xl text-espresso mb-3">
                What does your skin <em>need</em>?
              </h2>
              <p className="text-taupe text-sm leading-relaxed mb-5">
                Take our 4-question Skin Intelligence quiz. We'll instantly curate the products your skin is actually asking for — no algorithm guesswork.
              </p>
              <Button onClick={() => navigate("/skin-quiz")}
                className="rounded-full bg-espresso text-ivory px-7 h-11 gap-2">
                <Sparkles className="w-4 h-4" /> Start Quiz — 1 min
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 shrink-0 w-full md:w-56 opacity-60">
              {["oily","dry","combination","normal"].map(t => (
                <div key={t} className="bg-rosemist/40 rounded-xl p-3 text-center">
                  <div className="text-lg mb-1">{t==="oily"?"💧":t==="dry"?"🌵":t==="combination"?"☯️":"✨"}</div>
                  <div className="text-xs text-espresso capitalize">{t}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  const skinType = profile?.skin_type;
  const concerns = profile?.concerns || [];
  const subtitle = [
    skinType && `${skinType.charAt(0).toUpperCase()}${skinType.slice(1)} skin`,
    concerns.length > 0 && concerns.slice(0, 2).map(c => c.replace("_", " ")).join(", "),
  ].filter(Boolean).join(" · ");

  return (
    <section className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-5 md:px-10">
        <SectionHead
          overline="Picked For You"
          title={<>Your <span className="italic font-light text-gold">curated</span> routine</>}
          subtitle={subtitle ? `Matched to: ${subtitle}` : "Based on your skin profile."}
          action={
            <div className="flex items-center gap-3">
              <Link to="/skin-quiz" className="text-xs text-taupe hover:text-espresso underline underline-offset-2 transition">
                Retake quiz
              </Link>
              <Link to="/shop" className="inline-flex items-center gap-1.5 text-sm font-medium text-espresso hover:text-gold transition">
                Shop all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          }
        />

        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-rosemist/40 animate-pulse aspect-[3/4]" />
              ))
            : items.map((p, i) => (
                <ProductCard key={p.id} p={p} delay={(i % 4) * 0.05} />
              ))
          }
        </div>

        {profile && (
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={() => navigate("/skin-quiz")}
              className="rounded-full border-gold/40 text-espresso gap-2 h-10 px-5 text-sm">
              <Sparkles className="w-3.5 h-3.5" /> Update your skin profile
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
