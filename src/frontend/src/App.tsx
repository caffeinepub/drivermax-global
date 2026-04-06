import { Toaster } from "@/components/ui/sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "./backend";
import DisclaimerBanner from "./components/DisclaimerBanner";
import NavBar from "./components/NavBar";
import VoiceButton from "./components/VoiceButton";
import BottomNav from "./components/layout/BottomNav";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import Dashboard from "./pages/Dashboard";
import EarningsIntelligencePage from "./pages/EarningsIntelligencePage";
import EarningsPage from "./pages/EarningsPage";
import EventsPage from "./pages/EventsPage";
import ExpenseTrackerPage from "./pages/ExpenseTrackerPage";
import FuelCalculatorPage from "./pages/FuelCalculatorPage";
import ICPStakingPage from "./pages/ICPStakingPage";
import LandingPage from "./pages/LandingPage";
import PassengerMenuPage from "./pages/PassengerMenuPage";
import QRMenuPage from "./pages/QRMenuPage";
import SalesPage from "./pages/SalesPage";
import SchedulePage from "./pages/SchedulePage";
import SettingsPage from "./pages/SettingsPage";

export type Tab =
  | "dashboard"
  | "earnings"
  | "intelligence"
  | "sales"
  | "schedule"
  | "qr-menu"
  | "events"
  | "fuel"
  | "expenses"
  | "staking"
  | "settings";

// Detect /menu/:driverName at module level (before any React hooks)
function getPassengerRoute(): string | null {
  const match = window.location.pathname.match(/^\/menu\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

const passengerDriverName = getPassengerRoute();

// If this is a passenger QR menu route, render only that page
export default function App() {
  if (passengerDriverName !== null) {
    return <PassengerMenuPage driverName={passengerDriverName} />;
  }
  return <DriverApp />;
}

function DriverApp() {
  const { identity, isInitializing } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [addTripOpen, setAddTripOpen] = useState(false);

  const isLoggedIn = !!identity;

  const { data: profile } = useQuery<UserProfile | null>({
    queryKey: ["profile"],
    queryFn: async () => {
      if (!actor || !isLoggedIn) return null;
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && isLoggedIn,
  });

  const saveProfileMutation = useMutation({
    mutationFn: async (p: UserProfile) => {
      if (!actor) throw new Error("No actor");
      await actor.saveCallerUserProfile(p);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  const mutate = saveProfileMutation.mutate;

  // Handle payment return from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const tier = params.get("tier");
    if (payment === "success") {
      const tierName =
        tier === "3" ? "Premium" : tier === "2" ? "Pro" : "Basic";
      toast.success(`Payment successful! Welcome to ${tierName}.`);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (payment === "cancel") {
      toast.info("Payment cancelled.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [queryClient]);

  // Create default profile on first login
  useEffect(() => {
    if (isLoggedIn && actor && profile === null) {
      mutate({
        displayName: "Driver",
        subscriptionTier: BigInt(1),
        voiceEnabled: true,
        currencyCode: "ZAR",
        vehicleName: "",
        fuelConsumptionRate: 0,
      });
    }
  }, [isLoggedIn, actor, profile, mutate]);

  if (isInitializing || actorFetching) {
    return (
      <div className="min-h-screen bg-hero-gradient flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-white">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-lg font-display">Loading MoneyDrive...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <>
        <LandingPage />
        <Toaster />
      </>
    );
  }

  const tier = Number(profile?.subscriptionTier ?? 1);

  const renderPage = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard
            profile={profile}
            tier={tier}
            onTabChange={setActiveTab}
            addTripOpen={addTripOpen}
            onAddTripOpenChange={setAddTripOpen}
          />
        );
      case "earnings":
        return <EarningsPage profile={profile} tier={tier} />;
      case "intelligence":
        return <EarningsIntelligencePage profile={profile} tier={tier} />;
      case "events":
        return <EventsPage profile={profile} tier={tier} />;
      case "fuel":
        return <FuelCalculatorPage profile={profile} tier={tier} />;
      case "expenses":
        return <ExpenseTrackerPage profile={profile} tier={tier} />;
      case "staking":
        return <ICPStakingPage profile={profile} tier={tier} />;
      case "qr-menu":
        if (tier < 2) {
          return (
            <UpgradeGate
              feature="QR Code Menu"
              requiredTier={2}
              onSettings={() => setActiveTab("settings")}
            />
          );
        }
        return <QRMenuPage profile={profile} tier={tier} />;
      case "sales":
        if (tier < 2) {
          return (
            <UpgradeGate
              feature="In-Car Sales"
              requiredTier={2}
              onSettings={() => setActiveTab("settings")}
            />
          );
        }
        return <SalesPage profile={profile} tier={tier} />;
      case "schedule":
        if (tier < 2) {
          return (
            <UpgradeGate
              feature="Schedule"
              requiredTier={2}
              onSettings={() => setActiveTab("settings")}
            />
          );
        }
        return <SchedulePage profile={profile} tier={tier} />;
      case "settings":
        return (
          <SettingsPage
            profile={profile}
            onSave={(p) => saveProfileMutation.mutate(p)}
          />
        );
      default:
        return (
          <Dashboard
            profile={profile}
            tier={tier}
            onTabChange={setActiveTab}
            addTripOpen={addTripOpen}
            onAddTripOpenChange={setAddTripOpen}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-page flex flex-col">
      <NavBar
        profile={profile}
        tier={tier}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <main className="flex-1 pb-40 md:pb-6">
        <div key={activeTab} className="page-slide-in">
          {renderPage()}
        </div>
      </main>
      <DisclaimerBanner />
      <VoiceButton profile={profile} tier={tier} activeTab={activeTab} />
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogTrip={() => setAddTripOpen(true)}
        tier={tier}
      />
      <Toaster position="top-right" />
    </div>
  );
}

function UpgradeGate({
  feature,
  requiredTier,
  onSettings,
}: { feature: string; requiredTier: number; onSettings: () => void }) {
  const tierNames: Record<number, string> = {
    2: "Pro (R800/pm)",
    3: "Premium (R1,100/pm)",
  };
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="bg-card rounded-2xl shadow-card p-10 max-w-md w-full">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <svg
            aria-label="Locked"
            role="img"
            className="w-8 h-8 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">
          {feature} Locked
        </h2>
        <p className="text-muted-foreground mb-6">
          Upgrade to {tierNames[requiredTier]} to unlock {feature}.
        </p>
        <button
          type="button"
          onClick={onSettings}
          className="w-full py-3 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-opacity"
          data-ocid="upgrade_gate.settings.button"
        >
          View Plans &amp; Upgrade
        </button>
      </div>
    </div>
  );
}
