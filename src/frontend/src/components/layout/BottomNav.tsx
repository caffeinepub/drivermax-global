import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TIER_NAMES } from "@/lib/tiers";
import {
  Calendar,
  CalendarDays,
  Coins,
  Fuel,
  Home,
  Menu,
  Plus,
  QrCode,
  Receipt,
  Settings,
  ShoppingBag,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Tab } from "../../App";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
  onLogTrip: () => void;
  tier: number;
}

const MORE_ITEMS: {
  id: Tab;
  label: string;
  icon: React.ReactNode;
  minTier: number;
}[] = [
  {
    id: "intelligence",
    label: "Intelligence",
    icon: <Zap className="w-5 h-5" />,
    minTier: 3,
  },
  {
    id: "staking",
    label: "Stake ICP",
    icon: <Coins className="w-5 h-5" />,
    minTier: 1,
  },
  {
    id: "events",
    label: "Events",
    icon: <CalendarDays className="w-5 h-5" />,
    minTier: 1,
  },
  {
    id: "expenses",
    label: "Expenses",
    icon: <Receipt className="w-5 h-5" />,
    minTier: 1,
  },
  {
    id: "fuel",
    label: "Fuel Calc",
    icon: <Fuel className="w-5 h-5" />,
    minTier: 1,
  },
  {
    id: "qr-menu",
    label: "QR Menu",
    icon: <QrCode className="w-5 h-5" />,
    minTier: 2,
  },
  {
    id: "sales",
    label: "Sales",
    icon: <ShoppingBag className="w-5 h-5" />,
    minTier: 2,
  },
  {
    id: "schedule",
    label: "Schedule",
    icon: <Calendar className="w-5 h-5" />,
    minTier: 2,
  },
  {
    id: "settings",
    label: "Settings",
    icon: <Settings className="w-5 h-5" />,
    minTier: 1,
  },
];

type NavItem = { id: Tab; label: string };

const MAIN_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Home" },
  { id: "earnings", label: "Earnings" },
];

const MAIN_ICONS: Record<string, (active: boolean) => React.ReactNode> = {
  dashboard: (active) => (
    <Home
      className={`w-5 h-5 transition-all duration-200 ${active ? "scale-110" : ""}`}
    />
  ),
  earnings: (active) => (
    <TrendingUp
      className={`w-5 h-5 transition-all duration-200 ${active ? "scale-110" : ""}`}
    />
  ),
};

export default function BottomNav({
  activeTab,
  onTabChange,
  onLogTrip,
  tier,
}: BottomNavProps) {
  const stakingActive = activeTab === "staking";
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleMoreItemClick = (item: {
    id: Tab;
    label: string;
    minTier: number;
  }) => {
    setSheetOpen(false);
    if (item.minTier > tier) {
      toast.error(`Upgrade to unlock ${item.label}`);
      onTabChange("settings");
    } else {
      onTabChange(item.id);
    }
  };

  return (
    <nav
      className="md:hidden fixed bottom-5 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border/80 flex items-stretch shadow-[0_-4px_24px_rgba(6,27,43,0.1)]"
      style={{ height: 64 }}
      data-ocid="bottom_nav.panel"
    >
      {/* Home / Earnings */}
      {MAIN_ITEMS.map((item) => {
        const active = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onTabChange(item.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-all min-h-[48px] relative ${
              active
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-ocid={`bottom_nav.${item.id}.link`}
            aria-label={item.label}
          >
            {active && (
              <span className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-primary/10 blur-sm pointer-events-none" />
            )}
            <span
              className={`relative z-10 transition-all ${active ? "scale-110" : ""}`}
            >
              {MAIN_ICONS[item.id](active)}
            </span>
            <span
              className={`relative z-10 transition-all duration-200 ${
                active ? "font-bold" : ""
              }`}
              style={
                active ? { animation: "labelScale 0.2s ease-out forwards" } : {}
              }
            >
              {item.label}
            </span>
          </button>
        );
      })}

      {/* Center: Log Trip CTA */}
      <div className="flex-1 flex items-center justify-center relative">
        <span className="absolute w-[58px] h-[58px] rounded-full bg-primary/20 animate-pulse-ring -mt-5 pointer-events-none" />
        <button
          type="button"
          onClick={onLogTrip}
          className="relative w-[52px] h-[52px] rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-voice -mt-5 btn-press hover:opacity-90 transition-all z-10"
          aria-label="Log Trip"
          data-ocid="bottom_nav.log_trip.button"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Stake ICP */}
      <button
        type="button"
        onClick={() => onTabChange("staking")}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-all min-h-[48px] relative ${
          stakingActive
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label="Stake ICP"
        data-ocid="bottom_nav.staking.tab"
      >
        {stakingActive && (
          <span className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-primary/10 blur-sm pointer-events-none" />
        )}
        <span
          className={`relative z-10 transition-all ${stakingActive ? "scale-110" : ""}`}
        >
          <Coins className="w-5 h-5" />
        </span>
        <span
          className={`relative z-10 transition-all duration-200 ${
            stakingActive ? "font-bold" : ""
          }`}
          style={
            stakingActive
              ? { animation: "labelScale 0.2s ease-out forwards" }
              : {}
          }
        >
          Stake ICP
        </span>
      </button>

      {/* More — sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-muted-foreground transition-colors min-h-[48px] hover:text-primary"
            aria-label="More options"
            data-ocid="bottom_nav.more.button"
          >
            <Menu className="w-5 h-5" />
            <span>More</span>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-3xl pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle className="font-display text-left text-base">
              All Features
            </SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-4 gap-3">
            {MORE_ITEMS.map((item) => {
              const locked = item.minTier > tier;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleMoreItemClick(item)}
                  className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl text-[11px] font-semibold transition-colors min-h-[64px] ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  } ${locked ? "opacity-60" : ""}`}
                  data-ocid={`bottom_nav.${item.id}.link`}
                >
                  {item.icon}
                  <span className="leading-tight text-center">
                    {item.label}
                  </span>
                  {locked && (
                    <Badge className="text-[8px] px-1 py-0 bg-accent text-accent-foreground font-bold">
                      {TIER_NAMES[item.minTier]}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
