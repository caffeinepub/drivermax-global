import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  CalendarDays,
  Coins,
  Fuel,
  LayoutDashboard,
  LogOut,
  QrCode,
  Receipt,
  Settings,
  ShoppingBag,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { Tab } from "../App";
import type { UserProfile } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const PRIMARY_TABS: {
  id: Tab;
  label: string;
  icon: React.ReactNode;
  minTier: number;
}[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="w-4 h-4" />,
    minTier: 1,
  },
  {
    id: "earnings",
    label: "Earnings",
    icon: <TrendingUp className="w-4 h-4" />,
    minTier: 1,
  },
  {
    id: "intelligence",
    label: "Intelligence",
    icon: <Zap className="w-4 h-4" />,
    minTier: 3,
  },
  {
    id: "events",
    label: "Events",
    icon: <CalendarDays className="w-4 h-4" />,
    minTier: 1,
  },
  {
    id: "expenses",
    label: "Expenses",
    icon: <Receipt className="w-4 h-4" />,
    minTier: 1,
  },
];

const MORE_TABS: {
  id: Tab;
  label: string;
  icon: React.ReactNode;
  minTier: number;
}[] = [
  {
    id: "fuel",
    label: "Fuel",
    icon: <Fuel className="w-4 h-4" />,
    minTier: 1,
  },
  {
    id: "staking",
    label: "ICP Staking",
    icon: <Coins className="w-4 h-4" />,
    minTier: 1,
  },
  {
    id: "qr-menu",
    label: "QR Menu",
    icon: <QrCode className="w-4 h-4" />,
    minTier: 2,
  },
  {
    id: "sales",
    label: "Sales",
    icon: <ShoppingBag className="w-4 h-4" />,
    minTier: 2,
  },
  {
    id: "schedule",
    label: "Schedule",
    icon: <Calendar className="w-4 h-4" />,
    minTier: 2,
  },
];

const ALL_DESKTOP_TABS = [...PRIMARY_TABS, ...MORE_TABS];

const LogoIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-label="DriverMax logo"
    role="img"
    fill="currentColor"
    className="w-5 h-5"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
  </svg>
);

const TIER_BADGE_STYLES: Record<number, { label: string; cls: string }> = {
  1: {
    label: "Basic",
    cls: "bg-muted text-muted-foreground border border-border",
  },
  2: { label: "Pro", cls: "bg-primary text-white" },
  3: { label: "Premium", cls: "bg-gold text-foreground" },
};

interface NavBarProps {
  profile: UserProfile | null | undefined;
  tier: number;
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
}

export default function NavBar({
  profile,
  tier,
  activeTab,
  onTabChange,
}: NavBarProps) {
  const { clear } = useInternetIdentity();
  const displayName = profile?.displayName ?? "Driver";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const tierBadge = TIER_BADGE_STYLES[tier] ?? TIER_BADGE_STYLES[1];

  const handleTabClick = (tab: Tab, minTier: number) => {
    if (minTier > tier) {
      // Redirect locked tabs to settings/upgrade page
      onTabChange("settings");
    } else {
      onTabChange(tab);
    }
  };

  return (
    <>
      {/* Desktop top nav */}
      <header className="bg-navy-gradient shadow-sm hidden md:block">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-voice">
              <LogoIcon />
            </div>
            <div>
              <div className="text-white font-display font-bold text-sm leading-none">
                DriverMax
              </div>
              <div className="text-gold text-[8px] font-bold tracking-widest uppercase">
                GLOBAL
              </div>
            </div>
          </div>

          {/* Nav tabs */}
          <nav className="flex items-center gap-0.5 flex-1 justify-center flex-wrap">
            {ALL_DESKTOP_TABS.map((tab) => (
              <button
                type="button"
                key={tab.id}
                onClick={() => handleTabClick(tab.id, tab.minTier)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-white/20 text-white"
                    : "text-white/65 hover:text-white hover:bg-white/10"
                } ${tab.minTier > tier ? "opacity-50" : ""}`}
                data-ocid={`nav.${tab.id}.link`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.minTier > tier && (
                  <span className="text-[8px] text-gold/80 uppercase font-bold ml-0.5">
                    PRO
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Right side: user + actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onTabChange("settings")}
              className="text-white/70 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
              aria-label="Settings"
              data-ocid="nav.settings.link"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={clear}
              className="text-white/70 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
              title="Sign out"
              aria-label="Sign out"
              data-ocid="nav.signout.button"
            >
              <LogOut className="w-4 h-4" />
            </button>
            {/* Avatar + tier */}
            <button
              type="button"
              onClick={() => onTabChange("settings")}
              className="flex items-center gap-2 bg-white/10 rounded-full pl-1 pr-2.5 py-1 hover:bg-white/20 transition-colors"
              aria-label="Profile"
              data-ocid="nav.profile.button"
            >
              <Avatar className="w-6 h-6">
                <AvatarFallback className="bg-primary text-white text-[10px] font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-white text-[11px] font-semibold max-w-[80px] truncate">
                {displayName}
              </span>
              <Badge
                className={`text-[9px] px-1.5 py-0 font-bold ${tierBadge.cls}`}
              >
                {tierBadge.label}
              </Badge>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="bg-navy-gradient md:hidden sticky top-0 z-40 shadow-sm">
        <div className="px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-white">
              <LogoIcon />
            </div>
            <span className="text-white font-display font-bold text-sm">
              DriverMax
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className={`text-[9px] px-1.5 py-0 font-bold ${tierBadge.cls}`}
            >
              {tierBadge.label}
            </Badge>
            <button
              type="button"
              onClick={() => onTabChange("settings")}
              className="text-white/80 p-1"
              aria-label="Settings"
              data-ocid="nav.mobile.settings.link"
            >
              <Settings className="w-4.5 h-4.5" />
            </button>
            <Avatar
              className="w-7 h-7 cursor-pointer"
              onClick={() => onTabChange("settings")}
            >
              <AvatarFallback className="bg-primary text-white text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>
    </>
  );
}
