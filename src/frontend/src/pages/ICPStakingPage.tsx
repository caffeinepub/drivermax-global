import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bell,
  BellOff,
  BookOpen,
  Calculator,
  CheckCircle2,
  Coins,
  ExternalLink,
  RefreshCw,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { StakingRecord, UserProfile } from "../backend";
import { useActor } from "../hooks/useActor";

interface ICPStakingPageProps {
  profile: UserProfile | null | undefined;
  tier: number;
}

interface ICPPriceData {
  usd: number;
  usd_24h_change: number;
}

interface StakeReminderData {
  stakeId: string;
  unlockDate: string;
  icpAmount: number;
}

const DISSOLVE_OPTIONS = [
  { label: "6 months (~3% APY)", days: 182, apy: 0.03 },
  { label: "1 year (~5% APY)", days: 365, apy: 0.05 },
  { label: "2 years (~8% APY)", days: 730, apy: 0.08 },
  { label: "4 years (~12% APY)", days: 1461, apy: 0.12 },
  { label: "8 years (~15% APY)", days: 2922, apy: 0.15 },
];

const EDUCATION_POINTS = [
  {
    id: "what-is-icp",
    text: "ICP is the native crypto of the Internet Computer — the blockchain this very app runs on",
  },
  {
    id: "staking-rewards",
    text: "Stake ICP in neurons to earn rewards — up to ~15% APY with an 8-year lock",
  },
  {
    id: "ownership",
    text: "You own your stake. No bank, no middleman — just you and the blockchain",
  },
];

const STEPS = [
  {
    id: "create-wallet",
    title: "Create a wallet",
    desc: "Download Plug Wallet at plug.ooo or use your Internet Identity — the same one you log into this app with.",
    link: "https://plug.ooo",
    linkLabel: "Get Plug Wallet →",
    stepNum: 1,
  },
  {
    id: "buy-icp",
    title: "Buy ICP",
    desc: "Purchase ICP on Coinbase, Binance, or Kraken, then send it to your Plug Wallet address.",
    link: "https://www.coinbase.com/price/internet-computer",
    linkLabel: "Buy on Coinbase →",
    stepNum: 2,
  },
  {
    id: "open-nns",
    title: "Open NNS",
    desc: "Go to nns.ic0.app and log in with your Internet Identity to access the NNS governance dashboard.",
    link: "https://nns.ic0.app",
    linkLabel: "Open NNS →",
    stepNum: 3,
  },
  {
    id: "create-neuron",
    title: "Create a neuron",
    desc: "Stake your ICP into a neuron with a dissolve delay of at least 6 months to start earning rewards.",
    link: null,
    linkLabel: null,
    stepNum: 4,
  },
  {
    id: "collect-rewards",
    title: "Collect rewards",
    desc: "Rewards auto-compound. The longer you lock, the higher your APY — up to 15% with an 8-year lock.",
    link: null,
    linkLabel: null,
    stepNum: 5,
  },
];

function parsePriceData(raw: string): ICPPriceData | null {
  try {
    const parsed = JSON.parse(raw);
    const data = parsed["internet-computer"];
    if (!data || typeof data.usd !== "number") return null;
    return { usd: data.usd, usd_24h_change: data.usd_24h_change ?? 0 };
  } catch {
    return null;
  }
}

function formatDays(days: number): string {
  if (days >= 365) {
    const years = (days / 365).toFixed(1).replace(".0", "");
    return `${years} yr${Number(years) !== 1 ? "s" : ""}`;
  }
  return `${days} days`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getReminderKey(stakeId: string): string {
  return `drivermax_stake_reminder_${stakeId}`;
}

function isReminderSet(stakeId: string): boolean {
  return localStorage.getItem(getReminderKey(stakeId)) !== null;
}

function saveReminder(data: StakeReminderData): void {
  localStorage.setItem(getReminderKey(data.stakeId), JSON.stringify(data));
}

async function requestStakeReminder(
  stakeId: string,
  icpAmount: number,
  unlockDateStr: string,
): Promise<"granted" | "denied" | "unsupported"> {
  if (!("Notification" in window)) return "unsupported";

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") return "denied";

  new Notification("DriverMax — Reminder Set ✓", {
    body: `Reminder set for ${icpAmount.toFixed(4)} ICP stake unlocking on ${unlockDateStr}`,
    icon: "/favicon.ico",
  });

  saveReminder({ stakeId, unlockDate: unlockDateStr, icpAmount });
  return "granted";
}

export default function ICPStakingPage({
  profile: _profile,
}: ICPStakingPageProps) {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  // Calculator state
  const [calcIcp, setCalcIcp] = useState<number>(10);
  const [calcOption, setCalcOption] = useState(DISSOLVE_OPTIONS[1]);

  // Form state
  const [formIcp, setFormIcp] = useState<string>("");
  const [formDays, setFormDays] = useState<string>("365");
  const [formNotes, setFormNotes] = useState<string>("");
  const [formStartDate, setFormStartDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );

  // Dismissal state for top banner (sessionStorage-backed)
  const [topBannerDismissed, setTopBannerDismissed] = useState<boolean>(
    () => sessionStorage.getItem("drivermax_stake_banner_dismissed") === "1",
  );

  // State for stake to delete (for confirmation dialog)
  const [stakeToDelete, setStakeToDelete] = useState<string | null>(null);

  // Per-stake reminder state
  const [remindersSet, setRemindersSet] = useState<Record<string, boolean>>(
    () => {
      const result: Record<string, boolean> = {};
      const prefix = "drivermax_stake_reminder_";
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(prefix)) continue;
        const stakeId = key.slice(prefix.length);
        result[stakeId] = true;
      }
      return result;
    },
  );

  // ICP price query
  const {
    data: priceRaw,
    isLoading: priceLoading,
    isError: priceError,
    refetch: refetchPrice,
    isFetching: priceRefetching,
  } = useQuery<string>({
    queryKey: ["icpPrice"],
    queryFn: async () => {
      if (!actor) return "";
      return actor.getICPPrice();
    },
    enabled: !!actor,
    refetchInterval: 60000,
  });

  const priceData = priceRaw ? parsePriceData(priceRaw) : null;

  // Staking records query
  const { data: stakingRecords, isLoading: recordsLoading } = useQuery({
    queryKey: ["stakingRecords"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getStakingRecords();
    },
    enabled: !!actor,
  });

  // Save staking record mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      const icpAmount = Number.parseFloat(formIcp);
      const days = Number.parseInt(formDays, 10);
      if (Number.isNaN(icpAmount) || icpAmount <= 0)
        throw new Error("Invalid ICP amount");
      if (Number.isNaN(days) || days < 182)
        throw new Error("Dissolve delay must be at least 6 months (182 days)");
      const stakeId = `stake_${Date.now()}`;
      // Use driver-entered start date (converted to local time)
      const startDateMs = formStartDate
        ? new Date(`${formStartDate}T00:00:00`).getTime()
        : Date.now();
      await actor.saveStakingRecord({
        stakeId,
        icpAmount,
        dissolveDelayDays: BigInt(days),
        startDate: BigInt(startDateMs),
        notes: formNotes.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stakingRecords"] });
      toast.success("Stake logged! 🎉");
      setFormIcp("");
      setFormDays("365");
      setFormNotes("");
      setFormStartDate(new Date().toISOString().split("T")[0]);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Delete staking record mutation
  const deleteMutation = useMutation({
    mutationFn: async (stakeId: string) => {
      if (!actor) throw new Error("Not connected");
      await actor.deleteStakingRecord(stakeId);
    },
    onSuccess: (_, stakeId) => {
      queryClient.invalidateQueries({ queryKey: ["stakingRecords"] });
      // Clear localStorage reminder for this stake
      localStorage.removeItem(getReminderKey(stakeId));
      setRemindersSet((prev) => {
        const next = { ...prev };
        delete next[stakeId];
        return next;
      });
      setStakeToDelete(null);
      toast.success("Stake removed");
    },
    onError: () => {
      setStakeToDelete(null);
      toast.error("Failed to delete stake");
    },
  });

  // Calculator outputs
  const calcRewardsIcp = calcIcp * calcOption.apy;
  const calcRewardsUsd = priceData ? calcRewardsIcp * priceData.usd : null;

  const isPositiveChange = (priceData?.usd_24h_change ?? 0) >= 0;

  // Compute stake unlock data
  type ComputedStake = {
    stakeId: string;
    icpAmount: number;
    daysRemaining: number;
    unlockDateStr: string;
    progressPct: number;
    elapsedDays: number;
    totalDays: number;
    unlockDateObj: Date;
    record: StakingRecord;
  };

  const computedStakes: ComputedStake[] = (stakingRecords ?? []).map(
    (stake) => {
      const now = Date.now();
      const startMs =
        stake.startDate > BigInt(0) ? Number(stake.startDate) / 1_000_000 : now;
      const totalDays = Number(stake.dissolveDelayDays);
      const totalMs = totalDays * 86400 * 1000;
      const elapsedMs = Math.max(0, now - startMs);
      const progressPct = Math.min(
        100,
        totalMs > 0 ? (elapsedMs / totalMs) * 100 : 0,
      );
      const elapsedDays = Math.floor(elapsedMs / 86400000);
      const daysRemaining = Math.max(0, totalDays - elapsedDays);
      const unlockDateObj = addDays(new Date(startMs), totalDays);
      const unlockDateStr = unlockDateObj.toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      return {
        stakeId: stake.stakeId,
        icpAmount: stake.icpAmount,
        daysRemaining,
        unlockDateStr,
        progressPct,
        elapsedDays,
        totalDays,
        unlockDateObj,
        record: stake,
      };
    },
  );

  // Top banner: ONLY stakes within 7 days
  const stakesUnlockingIn7Days = computedStakes.filter(
    (s) => s.daysRemaining <= 7,
  );
  // "Unlocking Soon" section: stakes between 8 and 30 days (no overlap with banner)
  const stakesUnlockingIn8To30Days = computedStakes.filter(
    (s) => s.daysRemaining > 7 && s.daysRemaining <= 30,
  );

  const handleSetReminder = async (
    stakeId: string,
    icpAmount: number,
    unlockDateStr: string,
  ) => {
    const result = await requestStakeReminder(
      stakeId,
      icpAmount,
      unlockDateStr,
    );
    if (result === "granted") {
      setRemindersSet((prev) => ({ ...prev, [stakeId]: true }));
      toast.success("Reminder set ✓");
    } else if (result === "denied") {
      toast.error(
        "Notifications blocked — enable them in your browser settings",
      );
    } else {
      toast.error("Browser notifications are not supported on this device");
    }
  };

  const handleDismissTopBanner = () => {
    sessionStorage.setItem("drivermax_stake_banner_dismissed", "1");
    setTopBannerDismissed(true);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
      {/* Top: Pulsing 7-day unlock banner */}
      {!topBannerDismissed && stakesUnlockingIn7Days.length > 0 && (
        <div
          className="rounded-2xl px-4 py-3 flex items-center justify-between gap-3 animate-fade-up"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.72 0.13 65), oklch(0.78 0.11 55))",
          }}
          data-ocid="staking.unlock_banner.card"
        >
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0">
              <Bell className="w-5 h-5 text-amber-900" />
              <span
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse"
                aria-hidden="true"
              />
            </div>
            <p className="text-amber-900 font-bold text-sm leading-tight">
              🔔{" "}
              {stakesUnlockingIn7Days.length === 1
                ? "1 stake unlocking"
                : `${stakesUnlockingIn7Days.length} stakes unlocking`}{" "}
              within 7 days! Tap to view below.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismissTopBanner}
            className="shrink-0 text-amber-900/70 hover:text-amber-900 transition-colors p-1"
            aria-label="Dismiss banner"
            data-ocid="staking.unlock_banner.close_button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Section 1: ICP Price Ticker */}
      <div className="animate-fade-up stagger-1">
        {priceLoading ? (
          <div
            className="rounded-2xl bg-card shadow-card p-5"
            data-ocid="staking.price.card"
          >
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </div>
            </div>
            <Skeleton className="h-4 w-40" />
          </div>
        ) : priceError || !priceData ? (
          <div
            className="rounded-2xl bg-card shadow-card p-5"
            data-ocid="staking.price.card"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Coins className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">
                  ICP price unavailable
                </p>
                <a
                  href="https://www.coingecko.com/en/coins/internet-computer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
                >
                  Check coingecko.com <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 gap-2"
              onClick={() => refetchPrice()}
              data-ocid="staking.price.refresh.button"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </Button>
          </div>
        ) : (
          <div
            className="rounded-2xl bg-card shadow-card p-5"
            data-ocid="staking.price.card"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-voice"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.45 0.18 290), oklch(0.55 0.22 270))",
                  }}
                >
                  ∞
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-foreground text-sm">
                      ICP
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1.5 py-0 font-semibold"
                    >
                      Internet Computer
                    </Badge>
                  </div>
                  <p className="font-display font-extrabold text-2xl text-foreground">
                    ${priceData.usd.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`flex items-center gap-1 font-bold text-sm ${
                    isPositiveChange ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {isPositiveChange ? (
                    <ArrowUp className="w-4 h-4" />
                  ) : (
                    <ArrowDown className="w-4 h-4" />
                  )}
                  {Math.abs(priceData.usd_24h_change).toFixed(2)}%
                </div>
                <p className="text-[10px] text-muted-foreground">24h change</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-7 px-2 gap-1 text-[11px] text-muted-foreground hover:text-primary"
                  onClick={() => refetchPrice()}
                  disabled={priceRefetching}
                  data-ocid="staking.price.refresh.button"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${
                      priceRefetching ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-muted-foreground font-medium">
                Live from CoinGecko · auto-refreshes every 60s
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Education Hero */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden animate-fade-up stagger-2"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.17 0.035 230), oklch(0.22 0.045 240))",
        }}
        data-ocid="staking.education.card"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-24 h-24 bg-white/3 rounded-full translate-y-1/2 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-base"
              style={{ background: "oklch(0.45 0.18 290 / 0.6)" }}
            >
              ∞
            </div>
            <Badge className="bg-white/20 text-white border-white/30 text-[10px]">
              ICP STAKING
            </Badge>
          </div>

          <h2 className="font-display font-extrabold text-xl text-white leading-tight mb-1">
            Your earnings work.
          </h2>
          <h2
            className="font-display font-extrabold text-xl leading-tight mb-4"
            style={{ color: "oklch(0.76 0.12 75)" }}
          >
            Now make them work harder.
          </h2>

          <ul className="space-y-2.5 mb-5">
            {EDUCATION_POINTS.map((point, i) => (
              <li key={point.id} className="flex items-start gap-2.5">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-white"
                  style={{ background: "oklch(0.45 0.18 290 / 0.5)" }}
                >
                  {i + 1}
                </div>
                <p className="text-white/85 text-sm leading-relaxed">
                  {point.text}
                </p>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            <a
              href="https://www.coinbase.com/price/internet-computer"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-white text-foreground font-bold text-sm px-4 py-2 rounded-xl hover:bg-white/90 transition-colors btn-press"
              data-ocid="staking.buy_icp.link"
            >
              Buy ICP on Coinbase
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://nns.ic0.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-white/15 text-white font-bold text-sm px-4 py-2 rounded-xl hover:bg-white/25 transition-colors border border-white/30 btn-press"
              data-ocid="staking.nns.link"
            >
              Stake on NNS
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Section 3: Staking Calculator */}
      <Card
        className="rounded-2xl shadow-card animate-fade-up stagger-3"
        data-ocid="staking.calculator.card"
      >
        <CardHeader className="pb-3">
          <CardTitle className="font-display font-bold text-base flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary" />
            Staking Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="calc-icp" className="text-sm font-medium">
              ICP Amount
            </Label>
            <Input
              id="calc-icp"
              type="number"
              min="1"
              value={calcIcp}
              onChange={(e) =>
                setCalcIcp(Number.parseFloat(e.target.value) || 0)
              }
              className="rounded-xl"
              data-ocid="staking.calculator.input"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Dissolve Delay</Label>
            <Select
              value={String(calcOption.days)}
              onValueChange={(v) => {
                const opt = DISSOLVE_OPTIONS.find((o) => String(o.days) === v);
                if (opt) setCalcOption(opt);
              }}
            >
              <SelectTrigger
                className="rounded-xl"
                data-ocid="staking.calculator.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISSOLVE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.days} value={String(opt.days)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            className="rounded-xl p-4 border border-border"
            style={{ background: "oklch(0.95 0.007 228)" }}
          >
            <p className="text-xs text-muted-foreground mb-1">
              Estimated annual rewards
            </p>
            <p className="font-display font-extrabold text-xl text-foreground">
              {calcRewardsIcp.toFixed(4)} ICP
            </p>
            {calcRewardsUsd !== null && (
              <p className="text-sm font-semibold text-muted-foreground mt-0.5">
                ≈ ${calcRewardsUsd.toFixed(2)} USD
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border">
              <TrendingUp className="w-3 h-3 text-success" />
              <span className="text-[11px] text-muted-foreground">
                {(calcOption.apy * 100).toFixed(0)}% APY ·{" "}
                {formatDays(calcOption.days)} lock
              </span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            These are estimates based on current NNS parameters. Actual rewards
            vary.
          </p>
        </CardContent>
      </Card>

      {/* Section 4: Log My Stakes */}
      <Card
        className="rounded-2xl shadow-card animate-fade-up stagger-4"
        data-ocid="staking.log_stake.card"
      >
        <CardHeader className="pb-3">
          <CardTitle className="font-display font-bold text-base flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            Log My Stakes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-3 mb-5"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="stake-icp" className="text-sm font-medium">
                  ICP Amount
                </Label>
                <Input
                  id="stake-icp"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="e.g. 50"
                  value={formIcp}
                  onChange={(e) => setFormIcp(e.target.value)}
                  className="rounded-xl"
                  data-ocid="staking.form.icp_input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stake-days" className="text-sm font-medium">
                  Dissolve Days
                </Label>
                <Input
                  id="stake-days"
                  type="number"
                  min="182"
                  required
                  placeholder="e.g. 365"
                  value={formDays}
                  onChange={(e) => setFormDays(e.target.value)}
                  className="rounded-xl"
                  data-ocid="staking.form.days_input"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stake-start" className="text-sm font-medium">
                Start Date
              </Label>
              <Input
                id="stake-start"
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                className="rounded-xl"
                data-ocid="staking.form.start_date_input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stake-notes" className="text-sm font-medium">
                Notes{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="stake-notes"
                placeholder="e.g. Long-term savings"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="rounded-xl resize-none"
                rows={2}
                data-ocid="staking.form.notes_textarea"
              />
            </div>
            <Button
              type="submit"
              className="w-full rounded-xl gap-2 shadow-voice btn-press"
              disabled={saveMutation.isPending}
              data-ocid="staking.log_stake.button"
            >
              {saveMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Coins className="w-4 h-4" />
              )}
              {saveMutation.isPending ? "Logging..." : "Log This Stake"}
            </Button>
          </form>

          {/* Unlocking Soon (8–30 days only — no overlap with top banner) */}
          {stakesUnlockingIn8To30Days.length > 0 && (
            <div
              className="rounded-xl border border-amber-200 bg-amber-50 p-3 mb-4"
              data-ocid="staking.unlocking_soon.card"
            >
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="font-bold text-amber-800 text-sm">
                  Unlocking Soon (8–30 days)
                </p>
              </div>
              <ul className="space-y-1.5">
                {stakesUnlockingIn8To30Days.map((s) => (
                  <li
                    key={s.stakeId}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-amber-700 text-xs">
                      {s.icpAmount.toFixed(4)} ICP — unlocks in{" "}
                      {s.daysRemaining} day{s.daysRemaining !== 1 ? "s" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* My Stakes list */}
          <div>
            <h3 className="font-display font-bold text-sm text-foreground mb-3">
              My Stakes
            </h3>

            {recordsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="rounded-xl border border-border p-4">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-2 w-full mb-2" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                ))}
              </div>
            ) : !stakingRecords || stakingRecords.length === 0 ? (
              <div
                className="rounded-xl border border-dashed border-border p-6 text-center"
                data-ocid="staking.stakes.empty_state"
              >
                <Coins className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">
                  No stakes logged yet. Add your first one above.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {computedStakes.map((s, idx) => {
                  const isUnlocked = s.progressPct >= 100;
                  const hasReminder =
                    remindersSet[s.stakeId] || isReminderSet(s.stakeId);

                  return (
                    <div
                      key={s.stakeId}
                      className="rounded-xl border border-border p-4 bg-card"
                      data-ocid={`staking.stakes.item.${idx + 1}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-display font-bold text-sm text-foreground">
                            {s.icpAmount.toFixed(4)} ICP
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatDays(s.totalDays)} lock
                          </p>
                        </div>
                        <div className="flex items-center gap-1 -mr-1">
                          {isUnlocked ? (
                            <span
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-green-600"
                              title="This stake has unlocked!"
                              data-ocid={`staking.reminder.toggle.${idx + 1}`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </span>
                          ) : hasReminder ? (
                            <span
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-amber-500"
                              title="Reminder already set"
                              data-ocid={`staking.reminder.toggle.${idx + 1}`}
                            >
                              <Bell className="w-4 h-4" />
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleSetReminder(
                                  s.stakeId,
                                  s.icpAmount,
                                  s.unlockDateStr,
                                )
                              }
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-primary transition-colors btn-press"
                              title={`Set reminder for ${s.icpAmount.toFixed(4)} ICP unlocking on ${s.unlockDateStr}`}
                              aria-label="Set stake unlock reminder"
                              data-ocid={`staking.reminder.toggle.${idx + 1}`}
                            >
                              <BellOff className="w-4 h-4" />
                            </button>
                          )}
                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => setStakeToDelete(s.stakeId)}
                            disabled={deleteMutation.isPending}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-destructive transition-colors btn-press"
                            aria-label="Delete stake"
                            data-ocid={`staking.delete_stake.button.${idx + 1}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mb-1">
                        <Progress
                          value={s.progressPct}
                          className="h-2 rounded-full"
                          style={{
                            // @ts-expect-error CSS custom property
                            "--progress-color": isUnlocked
                              ? "oklch(0.55 0.15 145)"
                              : "oklch(0.55 0.18 290)",
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>
                          {s.elapsedDays} of {s.totalDays} days elapsed
                        </span>
                        <span>
                          {s.daysRemaining === 0
                            ? "Unlocked!"
                            : `Unlocks: ${s.unlockDateStr}`}
                        </span>
                      </div>

                      {/* Days remaining badge for stakes within 7 days (shown in banner too) */}
                      {s.daysRemaining > 0 && s.daysRemaining <= 7 && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1.5 py-0">
                            ⚠️ {s.daysRemaining} day
                            {s.daysRemaining !== 1 ? "s" : ""} left
                          </Badge>
                        </div>
                      )}
                      {s.daysRemaining > 7 && s.daysRemaining <= 30 && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0">
                            ⏳ {s.daysRemaining} day
                            {s.daysRemaining !== 1 ? "s" : ""} left
                          </Badge>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 5: How to Buy & Stake */}
      <Card
        className="rounded-2xl shadow-card animate-fade-up stagger-5"
        data-ocid="staking.guide.card"
      >
        <CardHeader className="pb-3">
          <CardTitle className="font-display font-bold text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            How to Buy &amp; Stake ICP — Step by Step
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {STEPS.map((step) => (
              <li key={step.id} className="flex items-start gap-3">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 font-display font-bold text-sm text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.45 0.18 290), oklch(0.55 0.22 270))",
                  }}
                >
                  {step.stepNum}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-sm text-foreground mb-0.5">
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-1">
                    {step.desc}
                  </p>
                  {step.link && (
                    <a
                      href={step.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-xs font-medium hover:underline inline-flex items-center gap-1"
                    >
                      {step.linkLabel}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Financial Disclaimer */}
      <div
        className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 animate-fade-up stagger-6"
        data-ocid="staking.disclaimer.card"
      >
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          <span className="font-bold">Risk Disclosure: </span>
          Cryptocurrency investments carry significant risk, including the
          possible loss of your entire investment. This is not financial advice.
          ICP price is volatile and past performance does not guarantee future
          results. Never invest more than you can afford to lose. Staking
          rewards are estimates only and are not guaranteed.
        </p>
      </div>

      {/* Footer spacing */}
      <div className="h-4" />

      {/* Delete stake confirmation */}
      <AlertDialog
        open={!!stakeToDelete}
        onOpenChange={(open) => {
          if (!open) setStakeToDelete(null);
        }}
      >
        <AlertDialogContent data-ocid="staking.delete_stake.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this stake?</AlertDialogTitle>
            <AlertDialogDescription>
              This stake record will be permanently removed. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="staking.delete_stake.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                stakeToDelete && deleteMutation.mutate(stakeToDelete)
              }
              data-ocid="staking.delete_stake.confirm_button"
            >
              Delete Stake
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
