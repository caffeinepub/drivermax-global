import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Lock,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { EarningsGoal, Trip, UserProfile } from "../backend";
import { useActor } from "../hooks/useActor";

interface Props {
  profile: UserProfile | null | undefined;
  tier: number;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 18 }, (_, i) => i + 5);

function fmt12(h: number) {
  if (h === 0 || h === 24) return "12am";
  if (h === 12) return "12pm";
  return h > 12 ? `${h - 12}pm` : `${h}am`;
}

const PEAK_WINDOWS = [
  {
    start: 6,
    end: 9,
    label: "Morning Rush",
    displayEnd: "9am",
    days: [1, 2, 3, 4, 5],
  },
  {
    start: 12,
    end: 14,
    label: "Lunch",
    displayEnd: "2pm",
    days: [1, 2, 3, 4, 5],
  },
  {
    start: 17,
    end: 20,
    label: "Evening Rush",
    displayEnd: "8pm",
    days: [1, 2, 3, 4, 5],
  },
  {
    start: 22,
    end: 24,
    label: "Night Out (10pm\u20132am)",
    displayEnd: "2am",
    days: [5, 6],
  },
];

function isPeak(hour: number, dayOfWeek: number) {
  return PEAK_WINDOWS.some(
    (w) => hour >= w.start && hour < w.end && w.days.includes(dayOfWeek),
  );
}

function buildHeatmap(trips: Trip[]) {
  const grid: number[][] = Array.from({ length: 7 }, () => Array(18).fill(0));
  const counts: number[][] = Array.from({ length: 7 }, () => Array(18).fill(0));
  for (const trip of trips) {
    const d = new Date(Number(trip.date));
    const jsDay = d.getDay();
    const gridDay = jsDay === 0 ? 6 : jsDay - 1;
    const hour = d.getHours();
    const hIdx = hour - 5;
    if (hIdx >= 0 && hIdx < 18) {
      grid[gridDay][hIdx] += trip.amount;
      counts[gridDay][hIdx]++;
    }
  }
  const avgs = grid.map((row, d) =>
    row.map((sum, h) => (counts[d][h] > 0 ? sum / counts[d][h] : 0)),
  );
  const maxVal = Math.max(...avgs.flat(), 1);
  return { avgs, maxVal };
}

function categorizeTrips(trips: Trip[]) {
  const cats = {
    short: { label: "Short (<15 min)", trips: [] as Trip[] },
    medium: { label: "Medium (15-30 min)", trips: [] as Trip[] },
    long: { label: "Long (>30 min)", trips: [] as Trip[] },
  };
  for (const t of trips) {
    const dur = Number(t.durationMinutes);
    if (dur < 15) cats.short.trips.push(t);
    else if (dur <= 30) cats.medium.trips.push(t);
    else cats.long.trips.push(t);
  }
  return Object.entries(cats).map(([key, val]) => {
    const totalEarnings = val.trips.reduce((s, t) => s + t.amount, 0);
    const totalHours = val.trips.reduce(
      (s, t) => s + Number(t.durationMinutes) / 60,
      0,
    );
    const perHour = totalHours > 0 ? totalEarnings / totalHours : 0;
    return {
      key,
      label: val.label,
      count: val.trips.length,
      totalEarnings,
      perHour,
    };
  });
}

function tripsInPeriod(trips: Trip[], period: string): Trip[] {
  const now = new Date();
  if (period === "daily") {
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    return trips.filter((t) => Number(t.date) >= start);
  }
  if (period === "weekly") {
    const day = now.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon);
    mon.setHours(0, 0, 0, 0);
    return trips.filter((t) => Number(t.date) >= mon.getTime());
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return trips.filter((t) => Number(t.date) >= start);
}

function UpgradeGate({ onSettings }: { onSettings?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="bg-card rounded-2xl shadow-card p-10 max-w-md w-full">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">
          Earnings Intelligence Locked
        </h2>
        <p className="text-muted-foreground mb-6">
          Upgrade to Premium (R1,100/pm) to unlock AI-powered earnings insights,
          goal tracking, and peak hour predictions.
        </p>
        {onSettings && (
          <button
            type="button"
            onClick={onSettings}
            className="w-full py-3 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-opacity"
            data-ocid="intelligence.upgrade.settings.button"
          >
            View Plans &amp; Upgrade
          </button>
        )}
      </div>
    </div>
  );
}

export default function EarningsIntelligencePage({ profile, tier }: Props) {
  const { actor } = useActor();
  const qc = useQueryClient();
  const currency = profile?.currencyCode ?? "ZAR";
  const [activeSection, setActiveSection] = useState<
    "goal" | "heatmap" | "peak" | "optimizer"
  >("goal");
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalAmount, setGoalAmount] = useState("");
  const [goalPeriod, setGoalPeriod] = useState("daily");

  // All hooks MUST be called unconditionally before any early return
  const { data: trips } = useQuery({
    queryKey: ["trips"],
    queryFn: () => actor!.getTrips(),
    enabled: !!actor && tier >= 3,
  });

  const { data: earningsTotal } = useQuery({
    queryKey: ["earningsTotal"],
    queryFn: () => actor!.getEarningsTotal(),
    enabled: !!actor && tier >= 3,
  });

  const { data: goal } = useQuery({
    queryKey: ["earningsGoal"],
    queryFn: () => actor!.getEarningsGoal(),
    enabled: !!actor && tier >= 3,
  });

  const setGoalMut = useMutation({
    mutationFn: (g: EarningsGoal) => actor!.setEarningsGoal(g),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["earningsGoal"] });
      setGoalDialogOpen(false);
    },
  });

  // Populate dialog with existing goal when it opens
  useEffect(() => {
    if (goalDialogOpen) {
      setGoalAmount(goal?.targetAmount?.toString() ?? "");
      setGoalPeriod(goal?.period ?? "daily");
    }
  }, [goalDialogOpen, goal]);

  // Gate: Tier 3 only — after all hooks
  if (tier < 3) {
    return <UpgradeGate />;
  }

  const allTrips = trips ?? [];
  const tripCount = earningsTotal ? Number(earningsTotal[1]) : 0;
  const allTimeTotal = earningsTotal ? earningsTotal[0] : 0;
  const avgPerTrip = tripCount > 0 ? allTimeTotal / tripCount : 0;

  const goalPrd = goal?.period ?? "daily";
  const periodTrips = tripsInPeriod(allTrips, goalPrd);
  const periodEarnings = periodTrips.reduce((s, t) => s + t.amount, 0);

  const goalTarget = goal?.targetAmount ?? 0;
  const goalProgress =
    goalTarget > 0 ? Math.min((periodEarnings / goalTarget) * 100, 100) : 0;
  const tripsToGoal =
    goalTarget > 0 && avgPerTrip > 0
      ? Math.max(0, Math.ceil((goalTarget - periodEarnings) / avgPerTrip))
      : 0;
  const goalMet = goalTarget > 0 && periodEarnings >= goalTarget;

  const { avgs, maxVal } = buildHeatmap(allTrips);
  const categories = categorizeTrips(allTrips);
  const bestCat = [...categories].sort((a, b) => b.perHour - a.perHour)[0];

  const now = new Date();
  const currentHour = now.getHours();
  const currentJsDay = now.getDay();
  const currentIsPeak = isPeak(currentHour, currentJsDay);

  const sortedFutureWindows = PEAK_WINDOWS.filter(
    (w) => w.start > currentHour,
  ).sort((a, b) => a.start - b.start);
  const nextPeak =
    sortedFutureWindows.length > 0
      ? sortedFutureWindows[0]
      : PEAK_WINDOWS.slice().sort((a, b) => a.start - b.start)[0];

  const hoursToNextPeak = nextPeak
    ? sortedFutureWindows.length > 0
      ? nextPeak.start - currentHour
      : 24 - currentHour + nextPeak.start
    : null;

  const sections = [
    {
      id: "goal" as const,
      label: "Goal Tracker",
      icon: <Target className="w-4 h-4" />,
    },
    {
      id: "heatmap" as const,
      label: "Best Hours",
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      id: "peak" as const,
      label: "Peak Alerts",
      icon: <Zap className="w-4 h-4" />,
    },
    {
      id: "optimizer" as const,
      label: "Trip Optimizer",
      icon: <AlertCircle className="w-4 h-4" />,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold">
          Earnings Intelligence
        </h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          Data-driven insights to help you earn more
        </p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {sections.map((s) => (
          <button
            type="button"
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeSection === s.id
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:border-primary/40"
            }`}
            data-ocid={`intelligence.${s.id}.tab`}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {activeSection === "goal" && (
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> Earnings Goal
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setGoalDialogOpen(true)}
                data-ocid="intelligence.goal.edit_button"
              >
                {goal ? "Edit Goal" : "Set Goal"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!goal ? (
              <div
                className="text-center py-8"
                data-ocid="intelligence.goal.empty_state"
              >
                <Target className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm mb-3">
                  No goal set yet. Set a daily or weekly target.
                </p>
                <Button
                  onClick={() => setGoalDialogOpen(true)}
                  data-ocid="intelligence.goal.set_button"
                >
                  Set Earnings Goal
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground capitalize">
                    {goal.period} target
                  </span>
                  <span className="font-bold text-lg">
                    {currency} {goal.targetAmount.toFixed(2)}
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>
                      {currency} {periodEarnings.toFixed(2)} earned this{" "}
                      {goal.period}
                    </span>
                    <span>{goalProgress.toFixed(0)}%</span>
                  </div>
                  <Progress value={goalProgress} className="h-3" />
                </div>
                {goalMet ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-semibold">
                      Goal achieved! Great work!
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-primary/5 text-primary">
                    <p className="font-semibold">
                      {tripsToGoal} more trip{tripsToGoal !== 1 ? "s" : ""} to
                      hit your {goal.period} goal
                    </p>
                    <p className="text-xs mt-0.5 opacity-80">
                      Based on your avg {currency} {avgPerTrip.toFixed(2)} per
                      trip
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeSection === "heatmap" && (
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Best Hours Heatmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allTrips.length < 3 ? (
              <div className="text-center py-8">
                <TrendingUp className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  Log at least 3 trips to see your earnings heatmap.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[500px]">
                  <div className="flex mb-1">
                    <div className="w-10" />
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        className="flex-1 text-[10px] text-center text-muted-foreground"
                      >
                        {h % 3 === 0 ? fmt12(h) : ""}
                      </div>
                    ))}
                  </div>
                  {DAYS.map((day, d) => (
                    <div key={day} className="flex items-center mb-1">
                      <div className="w-10 text-xs text-muted-foreground font-medium">
                        {day}
                      </div>
                      {avgs[d].map((val, h) => {
                        const intensity = val / maxVal;
                        const hourLabel = HOURS[h];
                        return (
                          <div
                            key={`${day}-${hourLabel}`}
                            className="flex-1 h-6 rounded-sm mx-px"
                            style={{
                              backgroundColor:
                                intensity > 0
                                  ? `oklch(${0.55 + intensity * 0.3} ${0.1 + intensity * 0.2} 145)`
                                  : "oklch(0.94 0 0)",
                            }}
                            title={
                              val > 0
                                ? `${day} ${fmt12(hourLabel)}: avg ${currency} ${val.toFixed(2)}`
                                : "No data"
                            }
                          />
                        );
                      })}
                    </div>
                  ))}
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs text-muted-foreground">Low</span>
                    <div className="flex gap-0.5">
                      {[0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
                        <div
                          key={v}
                          className="w-5 h-3 rounded-sm"
                          style={{
                            backgroundColor: `oklch(${0.55 + v * 0.3} ${0.1 + v * 0.2} 145)`,
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">High</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeSection === "peak" && (
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" /> Peak Hour Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`p-4 rounded-xl mb-4 ${currentIsPeak ? "bg-yellow-50 border border-yellow-200" : "bg-muted/40"}`}
            >
              <div className="flex items-center gap-3">
                <Zap
                  className={`w-6 h-6 ${currentIsPeak ? "text-yellow-500" : "text-muted-foreground"}`}
                />
                <div>
                  {currentIsPeak ? (
                    <>
                      <p className="font-bold text-yellow-700">
                        You&apos;re in peak hours!
                      </p>
                      <p className="text-sm text-yellow-600">
                        Demand is high right now &mdash; stay on the road
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-foreground">
                        Currently off-peak
                      </p>
                      {hoursToNextPeak !== null && nextPeak && (
                        <p className="text-sm text-muted-foreground">
                          Next peak window: {nextPeak.label} at{" "}
                          {fmt12(nextPeak.start)}
                          {hoursToNextPeak > 0
                            ? ` (in ${hoursToNextPeak}h)`
                            : " (starting soon)"}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            <h3 className="text-sm font-semibold mb-3">
              Today&apos;s Peak Windows
            </h3>
            <div className="space-y-2">
              {PEAK_WINDOWS.map((w) => {
                const isNow = currentHour >= w.start && currentHour < w.end;
                const isPast = currentHour >= w.end;
                return (
                  <div
                    key={w.label}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isNow
                        ? "border-yellow-300 bg-yellow-50"
                        : isPast
                          ? "border-border bg-muted/30 opacity-60"
                          : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isNow ? (
                        <Zap className="w-4 h-4 text-yellow-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="font-medium text-sm">{w.label}</span>
                      {w.days.includes(6) && (
                        <Badge className="text-[10px] px-1.5 py-0">
                          Fri/Sat
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {fmt12(w.start)} &ndash; {w.displayEnd}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {activeSection === "optimizer" && (
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-primary" /> Trip Acceptance
              Optimizer
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allTrips.length < 3 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  Log at least 3 trips to see which trip types earn the most.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {bestCat && (
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <p className="font-semibold text-primary text-sm">
                      Recommendation
                    </p>
                    <p className="text-sm mt-1">
                      <strong>{bestCat.label}</strong> earns you the most at{" "}
                      <strong>
                        {currency} {bestCat.perHour.toFixed(2)}/hr
                      </strong>{" "}
                      &mdash; prioritize longer trips and airport runs.
                    </p>
                  </div>
                )}
                <div className="space-y-3">
                  {categories.map((cat) => {
                    const maxPH = Math.max(
                      ...categories.map((c) => c.perHour),
                      1,
                    );
                    const pct = cat.perHour / maxPH;
                    return (
                      <div key={cat.key}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{cat.label}</span>
                          <span className="text-muted-foreground">
                            {cat.count} trips &middot; {currency}{" "}
                            {cat.perHour.toFixed(2)}/hr
                          </span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent data-ocid="intelligence.goal.dialog">
          <DialogHeader>
            <DialogTitle>Set Earnings Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Period</Label>
              <Select value={goalPeriod} onValueChange={setGoalPeriod}>
                <SelectTrigger data-ocid="intelligence.goal.period.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target Amount ({currency})</Label>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 800"
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value)}
                data-ocid="intelligence.goal.amount.input"
              />
            </div>
            <Button
              className="w-full"
              onClick={() =>
                setGoalMut.mutate({
                  period: goalPeriod,
                  targetAmount: Number(goalAmount),
                })
              }
              disabled={!goalAmount || setGoalMut.isPending}
              data-ocid="intelligence.goal.submit_button"
            >
              {setGoalMut.isPending ? "Saving..." : "Save Goal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
