import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart2,
  CalendarDays,
  Check,
  Fuel,
  Mic,
  QrCode,
  ShoppingBag,
  Star,
  Target,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const TIERS = [
  {
    id: 1,
    name: "Basic",
    price: "R500",
    period: "/month",
    tag: "7-Day Free Trial",
    isPopular: false,
    isPremium: false,
    features: [
      "Dashboard command center",
      "Full earnings tracker",
      "Expense & fuel logging",
      "Voice commands (500 chars/month trial)",
      "Event calendar & schedule view",
    ],
    locked: ["In-Car Sales & QR Menu", "AI Voice (unlimited)", "AI Insights"],
  },
  {
    id: 2,
    name: "Pro",
    price: "R800",
    period: "/month",
    tag: "Most Popular",
    isPopular: true,
    isPremium: false,
    features: [
      "Everything in Basic",
      "In-Car Sales tracker",
      "QR code menu for passengers",
      "Shift scheduling calendar",
      "Full AI voice (ElevenLabs, unlimited)",
      "Weekly analytics charts",
    ],
    locked: ["AI Insights & predictions", "Priority support"],
  },
  {
    id: 3,
    name: "Premium",
    price: "R1,100",
    period: "/month",
    tag: "Best Value",
    isPopular: false,
    isPremium: true,
    features: [
      "Everything in Pro",
      "AI-powered insights & predictions",
      "Advanced analytics dashboard",
      "Priority AI voice (ElevenLabs)",
      "Gold premium status badge",
      "Priority support & early access",
      "All future premium features",
    ],
    locked: [],
  },
];

const FEATURES = [
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Track Every Rand",
    desc: "Log trips, expenses, and fuel costs. See exactly where your money goes.",
  },
  {
    icon: <Mic className="w-6 h-6" />,
    title: "Voice Commands",
    desc: "Hands-free control powered by AI. Ask for earnings, next shift, and more.",
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: "Beat Your Goals",
    desc: "Set daily targets and watch the progress bar fill. Stay motivated every shift.",
  },
  {
    icon: <ShoppingBag className="w-6 h-6" />,
    title: "In-Car Sales",
    desc: "Sell water, snacks, and more. QR menu lets passengers order on their phones.",
  },
  {
    icon: <CalendarDays className="w-6 h-6" />,
    title: "Smart Scheduling",
    desc: "Plan shifts around local events. Know when demand will be highest.",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "AI Insights",
    desc: "Machine-learning predictions on peak hours, best routes, and earnings potential.",
  },
];

const STATS_DATA = [
  { end: 1200, suffix: "+", label: "Active Drivers" },
  { end: 8500, prefix: "R", suffix: "avg/mo", label: "Avg Monthly Earnings" },
  { end: 4.9, decimals: 1, suffix: "★", label: "Driver Rating" },
];

const TESTIMONIALS = [
  {
    name: "Sipho M.",
    city: "Johannesburg",
    rating: 5,
    text: "MoneyDrive changed how I work. I know exactly when to drive and how much I’ll make. My income went up 40% in the first month.",
  },
  {
    name: "Thabo K.",
    city: "Cape Town",
    rating: 5,
    text: 'The AI voice feature saves me time on the road. I just say "my earnings" and it tells me instantly. Total game changer.',
  },
];

const HOW_IT_WORKS = [
  {
    step: 1,
    title: "Sign Up Free",
    desc: "Create your account with Internet Identity. No email needed, instant access.",
    icon: "01",
  },
  {
    step: 2,
    title: "Log Trips & Track",
    desc: "Add trips after every ride. Watch your earnings, streaks, and daily goals update in real time.",
    icon: "02",
  },
  {
    step: 3,
    title: "Maximize with AI",
    desc: "Get smart insights on peak hours, best routes, and revenue opportunities unique to your area.",
    icon: "03",
  },
];

function useCountUp(end: number, _decimals = 0, duration = 1800) {
  const [count, setCount] = useState(0);
  const started = useRef(false);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = performance.now();
          const animate = (now: number) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - (1 - progress) ** 3;
            setCount(eased * end);
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration]);

  return { count, ref };
}

const LogoSvg = ({ size = 20 }: { size?: number }) => (
  <img
    src="/assets/generated/moneydrive-icon-transparent.dim_512x512.png"
    alt="MoneyDrive"
    width={size}
    height={size}
    style={{ objectFit: "contain" }}
  />
);

function StatCounter({
  end,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  end: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const { count, ref } = useCountUp(end, decimals);
  return (
    <span ref={ref}>
      {prefix}
      {count.toFixed(decimals)}
      {suffix}
    </span>
  );
}

export default function LandingPage() {
  const { login, isLoggingIn } = useInternetIdentity();
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  return (
    <div className="min-h-screen bg-page">
      {/* Header */}
      <header
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.10 0.015 75) 0%, oklch(0.08 0.012 80) 60%, oklch(0.12 0.018 70) 100%)",
        }}
      >
        {/* Diagonal gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 70% 40%, oklch(0.75 0.12 85 / 0.10), transparent)",
          }}
        />

        <nav className="relative z-10 max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-voice">
              <LogoSvg />
            </div>
            <div>
              <div className="text-white font-display font-extrabold text-lg leading-none">
                MoneyDrive
              </div>
              <div className="text-gold text-[9px] font-bold tracking-widest uppercase">
                COMMAND CENTER
              </div>
            </div>
          </div>
          <Button
            onClick={login}
            disabled={isLoggingIn}
            data-ocid="landing.signin.button"
            className="bg-white/10 text-white border border-white/20 hover:bg-white/20 rounded-full px-5 min-h-[44px] font-semibold backdrop-blur-sm"
          >
            {isLoggingIn ? "Connecting..." : "Sign In"}
          </Button>
        </nav>

        {/* Hero section */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 pt-12 pb-20 text-center">
          <Badge className="bg-white/10 text-gold border border-gold/30 text-xs mb-5 rounded-full px-4 py-1.5">
            🗡 Trusted by 1,200+ drivers in South Africa
          </Badge>

          <h1 className="font-display text-4xl md:text-6xl font-extrabold text-white leading-tight mb-4">
            Drive More.{" "}
            <span
              className="text-gold"
              style={{
                textShadow: "0 0 40px oklch(0.75 0.12 85 / 0.5)",
              }}
            >
              Earn More.
            </span>{" "}
            <br className="hidden md:block" />
            Stress Less.
          </h1>

          <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
            The command center built for Uber & Bolt drivers. Track earnings,
            set goals, use AI voice, and maximize every shift — all from your
            phone.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
            <Button
              onClick={login}
              disabled={isLoggingIn}
              data-ocid="landing.hero.cta.button"
              size="lg"
              className="bg-gold text-foreground hover:bg-gold/90 rounded-full px-8 font-bold text-base min-h-[52px] shadow-[0_4px_24px_rgba(214,177,90,0.4)] btn-press"
            >
              {isLoggingIn ? "Connecting..." : "Start 7-Day Free Trial"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              data-ocid="landing.learn_more.button"
              className="bg-white/5 text-white border border-white/20 hover:bg-white/15 rounded-full px-8 font-semibold min-h-[52px]"
              onClick={() =>
                document
                  .getElementById("features")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              See How It Works
            </Button>
          </div>

          {/* Animated stats counters */}
          <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto">
            {STATS_DATA.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-display text-2xl md:text-3xl font-extrabold text-white mb-0.5">
                  <StatCounter
                    end={stat.end}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                    decimals={stat.decimals ?? 0}
                  />
                </div>
                <div className="text-white/55 text-xs">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1200 60"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-10"
            preserveAspectRatio="none"
            aria-hidden="true"
            role="presentation"
          >
            <path
              d="M0 60 L0 30 Q300 0 600 30 Q900 60 1200 30 L1200 60 Z"
              fill="oklch(0.08 0.01 85)"
            />
          </svg>
        </div>
      </header>

      {/* How It Works */}
      <section
        id="features"
        className="max-w-5xl mx-auto px-4 py-16"
        data-ocid="landing.how_it_works.section"
      >
        <div className="text-center mb-10">
          <p className="text-primary font-bold text-xs uppercase tracking-widest mb-2">
            Simple &amp; Powerful
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-foreground">
            How MoneyDrive Works
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map((step) => (
            <div
              key={step.step}
              className="bg-card rounded-2xl shadow-card p-6 text-center card-hover-lift"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="font-display font-extrabold text-primary text-lg">
                  {step.icon}
                </span>
              </div>
              <h3 className="font-display font-bold text-base text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Grid */}
      <section
        className="bg-hero-gradient py-16"
        data-ocid="landing.features.section"
      >
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <p className="text-gold font-bold text-xs uppercase tracking-widest mb-2">
              Everything You Need
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white">
              Built for Drivers, By Drivers
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center mb-3 text-primary">
                  {f.icon}
                </div>
                <h3 className="font-display font-bold text-white text-sm mb-1.5">
                  {f.title}
                </h3>
                <p className="text-white/60 text-xs leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section
        className="max-w-3xl mx-auto px-4 py-16"
        data-ocid="landing.testimonials.section"
      >
        <div className="text-center mb-8">
          <p className="text-primary font-bold text-xs uppercase tracking-widest mb-2">
            Driver Stories
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-extrabold text-foreground">
            What Our Drivers Say
          </h2>
        </div>
        <div className="bg-card rounded-2xl shadow-card p-6 md:p-8 relative">
          <div className="text-4xl text-primary/20 font-serif leading-none mb-4">
            &ldquo;
          </div>
          <p className="text-foreground text-base md:text-lg leading-relaxed mb-6 italic">
            {TESTIMONIALS[activeTestimonial].text}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-display font-bold text-primary">
                {TESTIMONIALS[activeTestimonial].name[0]}
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">
                  {TESTIMONIALS[activeTestimonial].name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {TESTIMONIALS[activeTestimonial].city}
                </p>
              </div>
            </div>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5]
                .slice(0, TESTIMONIALS[activeTestimonial].rating)
                .map((star) => (
                  <Star key={star} className="w-4 h-4 text-gold fill-gold" />
                ))}
            </div>
          </div>
          {/* Dot navigation */}
          <div className="flex justify-center gap-2 mt-5">
            {TESTIMONIALS.map((t, i) => (
              <button
                key={t.name}
                type="button"
                onClick={() => setActiveTestimonial(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === activeTestimonial
                    ? "bg-primary w-5"
                    : "bg-border hover:bg-muted-foreground"
                }`}
                aria-label={`Testimonial ${i + 1}`}
                data-ocid={`landing.testimonial.${i + 1}.button`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section
        className="max-w-5xl mx-auto px-4 pb-16"
        data-ocid="landing.pricing.section"
      >
        <div className="text-center mb-10">
          <p className="text-primary font-bold text-xs uppercase tracking-widest mb-2">
            Simple Pricing
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-foreground">
            Choose Your Plan
          </h2>
          <p className="text-muted-foreground mt-2">
            Start with a 7-day free trial on the Basic plan. No credit card
            required.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TIERS.map((t) => (
            <div
              key={t.id}
              className={`rounded-2xl p-5 flex flex-col relative ${
                t.isPopular
                  ? "bg-primary text-primary-foreground shadow-voice ring-2 ring-primary"
                  : t.isPremium
                    ? "bg-hero-gradient text-white ring-2 ring-gold/40"
                    : "bg-card shadow-card"
              }`}
              data-ocid={`landing.pricing.tier.${t.id}.card`}
            >
              {t.tag && (
                <div
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                    t.isPremium
                      ? "bg-gold text-foreground"
                      : t.isPopular
                        ? "bg-white text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {t.tag}
                </div>
              )}
              <div className="mb-4 pt-2">
                <p
                  className={`text-xs font-bold uppercase tracking-widest mb-1 ${
                    t.isPopular || t.isPremium
                      ? "text-white/70"
                      : "text-muted-foreground"
                  }`}
                >
                  {t.name}
                </p>
                <div className="flex items-end gap-1">
                  <span className="font-display text-3xl font-extrabold">
                    {t.price}
                  </span>
                  <span
                    className={`text-sm mb-0.5 ${
                      t.isPopular || t.isPremium
                        ? "text-white/60"
                        : "text-muted-foreground"
                    }`}
                  >
                    {t.period}
                  </span>
                </div>
              </div>
              <div className="space-y-2 mb-5 flex-1">
                {t.features.map((f) => (
                  <div key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                    <span
                      className={
                        t.isPopular || t.isPremium ? "text-white/90" : ""
                      }
                    >
                      {f}
                    </span>
                  </div>
                ))}
                {t.locked.map((f) => (
                  <div
                    key={f}
                    className="flex items-start gap-2 text-sm opacity-40"
                  >
                    <X className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <Button
                onClick={login}
                disabled={isLoggingIn}
                className={`w-full rounded-xl font-bold min-h-[48px] btn-press ${
                  t.isPopular
                    ? "bg-white text-primary hover:bg-white/90"
                    : t.isPremium
                      ? "bg-gold text-foreground hover:bg-gold/90"
                      : ""
                }`}
                variant={t.isPopular || t.isPremium ? "default" : "outline"}
                data-ocid={`landing.pricing.tier.${t.id}.cta.button`}
              >
                {t.id === 1 ? "Start Free Trial" : "Get Started"}
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section
        className="py-16 shimmer-sweep"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.10 0.015 75), oklch(0.14 0.02 80))",
        }}
        data-ocid="landing.bottom_cta.section"
      >
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white mb-3">
            Ready to Drive Smarter?
          </h2>
          <p className="text-white/70 text-lg mb-8">
            Join 1,200+ drivers already using MoneyDrive to earn more, stress
            less, and own their journey.
          </p>
          <Button
            onClick={login}
            disabled={isLoggingIn}
            size="lg"
            className="bg-gold text-foreground hover:bg-gold/90 rounded-full px-10 font-bold text-base min-h-[56px] shadow-[0_4px_32px_rgba(214,177,90,0.5)] btn-press"
            data-ocid="landing.bottom_cta.button"
          >
            {isLoggingIn ? "Connecting..." : "Start Free — No Card Needed"}
          </Button>
          <p className="text-white/40 text-xs mt-4">
            7-day free trial · Cancel anytime · Blockchain-secured privacy
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-6 px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <LogoSvg />
          </div>
          <span className="font-display font-bold text-sm">MoneyDrive</span>
        </div>
        <p className="text-xs text-muted-foreground mb-1">
          Not financial advice. For trip and earnings tracking only.
        </p>
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
