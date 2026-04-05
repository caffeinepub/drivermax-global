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
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Car,
  Clock,
  Plus,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import type { Tab } from "../App";
import type { Trip, UserProfile } from "../backend";
import AddTripDialog from "../components/AddTripDialog";
import EarningsCounter from "../components/common/EarningsCounter";
import GoalProgressBar from "../components/common/GoalProgressBar";
import SkeletonCard from "../components/common/SkeletonCard";
import { useActor } from "../hooks/useActor";
import { formatCurrency } from "../lib/currency";

interface DashboardProps {
  profile: UserProfile | null | undefined;
  tier: number;
  onTabChange: (t: Tab) => void;
  addTripOpen?: boolean;
  onAddTripOpenChange?: (v: boolean) => void;
}

const PLATFORM_STYLES: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  Uber: { bg: "bg-primary/10", text: "text-primary", dot: "bg-primary" },
  Bolt: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  inDriver: {
    bg: "bg-purple-100",
    text: "text-purple-700",
    dot: "bg-purple-500",
  },
  Other: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getLast7DaysEarnings(trips: Array<{ date: bigint; amount: number }>) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    const total = trips
      .filter((t) => {
        const ts = Number(t.date);
        return ts >= d.getTime() && ts <= end.getTime();
      })
      .reduce((s, t) => s + t.amount, 0);
    return {
      day: DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1],
      amount: total,
    };
  });
}

export default function Dashboard({
  profile,
  tier,
  onTabChange,
  addTripOpen: externalAddTripOpen,
  onAddTripOpenChange: externalOnAddTripOpenChange,
}: DashboardProps) {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [internalAddTripOpen, setInternalAddTripOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);

  const addTripOpen =
    externalAddTripOpen !== undefined
      ? externalAddTripOpen
      : internalAddTripOpen;
  const setAddTripOpen = (v: boolean) => {
    if (externalOnAddTripOpenChange) externalOnAddTripOpenChange(v);
    else setInternalAddTripOpen(v);
  };

  const { data: earningsTotal, isLoading: earningsLoading } = useQuery({
    queryKey: ["earningsTotal"],
    queryFn: () => actor!.getEarningsTotal(),
    enabled: !!actor,
  });

  const { data: trips, isLoading: tripsLoading } = useQuery({
    queryKey: ["trips"],
    queryFn: () => actor!.getTrips(),
    enabled: !!actor,
  });

  const { data: upcomingShifts } = useQuery({
    queryKey: ["upcomingShifts"],
    queryFn: () => actor!.getUpcomingShifts(),
    enabled: !!actor && tier >= 2,
  });

  const { data: earningsGoal } = useQuery({
    queryKey: ["earningsGoal"],
    queryFn: () => actor!.getEarningsGoal(),
    enabled: !!actor,
  });

  const deleteTripMut = useMutation({
    mutationFn: (tripId: string) => actor!.deleteTrip(tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["earningsTotal"] });
      setTripToDelete(null);
    },
    onError: () => {
      setTripToDelete(null);
    },
  });

  const currency = profile?.currencyCode ?? "ZAR";
  const totalAmount = earningsTotal ? earningsTotal[0] : 0;
  const totalTrips = earningsTotal ? Number(earningsTotal[1]) : 0;

  // Today/yesterday calculations
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = today.getTime();
  const yesterday = new Date(todayTimestamp - 86400000);

  const todayTrips = (trips ?? []).filter(
    (t) =>
      Number(t.date) >= todayTimestamp &&
      Number(t.date) < todayTimestamp + 86400000,
  );
  const yesterdayTrips = (trips ?? []).filter(
    (t) =>
      Number(t.date) >= yesterday.getTime() && Number(t.date) < todayTimestamp,
  );

  const todayEarnings = todayTrips.reduce((s, t) => s + t.amount, 0);
  const yesterdayEarnings = yesterdayTrips.reduce((s, t) => s + t.amount, 0);
  const earningsDelta =
    yesterdayEarnings > 0
      ? ((todayEarnings - yesterdayEarnings) / yesterdayEarnings) * 100
      : null;

  const recentTrips = (trips ?? [])
    .slice()
    .sort((a, b) => Number(b.date) - Number(a.date))
    .slice(0, 5);

  const totalMinutes = (trips ?? []).reduce(
    (s, t) => s + Number(t.durationMinutes),
    0,
  );
  const hoursOnline = totalMinutes > 0 ? (totalMinutes / 60).toFixed(1) : "0";
  const avgTripValue = totalTrips > 0 ? totalAmount / totalTrips : 0;

  // Streak logic
  const tripDays = new Set(
    (trips ?? []).map((t) => {
      const d = new Date(Number(t.date));
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }),
  );
  let streak = 0;
  const checkDay = new Date();
  for (let i = 0; i < 365; i++) {
    const key = `${checkDay.getFullYear()}-${checkDay.getMonth()}-${checkDay.getDate()}`;
    if (tripDays.has(key)) {
      streak++;
      checkDay.setDate(checkDay.getDate() - 1);
    } else {
      break;
    }
  }

  const name = profile?.displayName ?? "Driver";
  const greetingMsg =
    todayEarnings > 300
      ? `Great shift, ${name}! 🔥`
      : totalTrips === 0
        ? `Welcome, ${name}! Let's hit the road.`
        : `Welcome back, ${name}`;

  // Only show goal progress if a goal is configured
  const hasGoal = earningsGoal != null && earningsGoal.targetAmount > 0;
  const dailyGoal = hasGoal ? earningsGoal!.targetAmount : 0;
  const toGoal = hasGoal ? Math.max(dailyGoal - todayEarnings, 0) : 0;

  // 7-day sparkline data
  const sparklineData = getLast7DaysEarnings(trips ?? []);
  const maxSparkline = Math.max(...sparklineData.map((d) => d.amount), 1);

  const isLoading = tripsLoading || earningsLoading;

  // Empty state check
  const hasNoTrips = !isLoading && totalTrips === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-5 space-y-4">
      {/* Hero earnings card */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden shimmer-sweep animate-fade-up stagger-1"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.17 0.035 230), oklch(0.22 0.045 240))",
        }}
        data-ocid="dashboard.hero.card"
      >
        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 w-56 h-56 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-white/3 rounded-full translate-y-1/2 pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-primary/10 rounded-full -translate-y-1/2 pointer-events-none" />

        <div className="relative z-10">
          {/* Top row: greeting + today earnings */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <p className="text-gold text-[10px] font-bold tracking-widest uppercase mb-1">
                COMMAND CENTER
              </p>
              <h1 className="font-display text-xl md:text-2xl font-extrabold text-white leading-tight">
                {greetingMsg}
              </h1>

              {/* Streak widget */}
              {streak >= 2 ? (
                <div className="inline-flex items-center gap-1.5 mt-2 bg-white/15 rounded-full px-3 py-1">
                  <span
                    className="text-base"
                    style={{
                      animation: "streakFlame 1.4s ease-in-out infinite",
                    }}
                  >
                    🔥
                  </span>
                  <span className="text-white text-xs font-bold">
                    {streak}-day streak!
                  </span>
                </div>
              ) : (
                totalTrips > 0 && (
                  <p className="text-white/60 text-xs mt-1.5">
                    Building your streak 💪
                  </p>
                )
              )}
            </div>

            <div className="text-right shrink-0">
              <p className="text-white/50 text-[10px] uppercase tracking-wide mb-0.5">
                Today
              </p>
              {earningsLoading ? (
                <Skeleton className="h-8 w-28 bg-white/20" />
              ) : (
                <EarningsCounter
                  value={todayEarnings}
                  currency={currency}
                  className="text-2xl md:text-3xl font-display font-extrabold text-white"
                />
              )}
              {earningsDelta !== null && (
                <div
                  className={`flex items-center justify-end gap-0.5 mt-0.5 text-xs font-semibold ${
                    earningsDelta >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {earningsDelta >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>
                    {earningsDelta >= 0 ? "+" : ""}
                    {earningsDelta.toFixed(1)}% vs yesterday
                  </span>
                </div>
              )}
              {tier === 3 && (
                <Badge className="mt-1.5 bg-gold text-foreground font-bold text-[10px]">
                  PREMIUM
                </Badge>
              )}
            </div>
          </div>

          {/* Contextual sub-text — only shown if goal is set */}
          {hasGoal && !earningsLoading && toGoal > 0 && (
            <p className="text-white/60 text-xs mb-3">
              Keep going! {formatCurrency(toGoal, currency)} to your daily goal
            </p>
          )}

          {/* Daily goal progress — only if goal is configured */}
          {hasGoal ? (
            <GoalProgressBar
              current={todayEarnings}
              goal={dailyGoal}
              currency={currency}
            />
          ) : (
            !earningsLoading && (
              <button
                type="button"
                onClick={() => onTabChange("intelligence")}
                className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 transition-colors text-white text-xs font-semibold px-4 py-2 rounded-full border border-white/25 mt-1"
                data-ocid="dashboard.set_goal.button"
              >
                <Target className="w-3.5 h-3.5" />
                Set a daily goal
              </button>
            )
          )}
        </div>
      </div>

      {/* Quick Stats bar */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <SkeletonCard
              key={i}
              lines={2}
              showHeader={false}
              className="py-3"
            />
          ))}
        </div>
      ) : (
        <div
          className="grid grid-cols-3 gap-3 animate-fade-up stagger-2"
          data-ocid="dashboard.stats.panel"
        >
          {[
            {
              icon: <Car className="w-4 h-4" />,
              label: "Today's Trips",
              value: String(todayTrips.length),
              color: "text-primary",
            },
            {
              icon: <TrendingUp className="w-4 h-4" />,
              label: "Avg Trip",
              value: formatCurrency(avgTripValue, currency),
              color: "text-success",
            },
            {
              icon: <Clock className="w-4 h-4" />,
              label: "Hours Online",
              value: `${hoursOnline}h`,
              color: "text-amber-500",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-card rounded-2xl shadow-card p-3 text-center card-hover-lift"
            >
              <div className={`flex justify-center mb-1 ${stat.color}`}>
                {stat.icon}
              </div>
              <div className="font-display font-bold text-sm text-foreground leading-tight">
                {stat.value}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {hasNoTrips && (
        <div
          className="bg-card rounded-2xl shadow-card p-8 text-center animate-fade-up stagger-3"
          data-ocid="dashboard.empty_state"
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Car className="w-10 h-10 text-primary" />
          </div>
          <h2 className="font-display font-bold text-xl text-foreground mb-2">
            Ready to earn?
          </h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
            Log your first trip and start tracking your earnings, streaks, and
            daily goals &mdash; all in one place.
          </p>
          <Button
            onClick={() => setAddTripOpen(true)}
            size="lg"
            className="gap-2 rounded-xl px-8 shadow-voice btn-press"
            data-ocid="dashboard.log_first_trip.button"
          >
            <Plus className="w-5 h-5" />
            Log First Trip
          </Button>
        </div>
      )}

      {/* 7-Day Earnings Pulse sparkline */}
      {!hasNoTrips && (
        <div
          className="bg-card rounded-2xl shadow-card p-4 animate-fade-up stagger-3 card-hover-lift"
          data-ocid="dashboard.sparkline.card"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-sm text-foreground">
              7-Day Earnings Pulse
            </h2>
            <span className="text-xs text-muted-foreground">
              {formatCurrency(totalAmount, currency)} total
            </span>
          </div>
          {tripsLoading ? (
            <div className="h-[80px] skeleton-loader rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={sparklineData} barCategoryGap="20%">
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: "oklch(0.47 0.015 230)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v: number) => [
                    formatCurrency(v, currency),
                    "Earnings",
                  ]}
                  contentStyle={{
                    background: "oklch(1 0 0)",
                    border: "1px solid oklch(0.91 0.005 230)",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {sparklineData.map((entry) => (
                    <Cell
                      key={entry.day}
                      fill={
                        entry.amount === maxSparkline && maxSparkline > 0
                          ? "oklch(0.76 0.12 75)"
                          : "oklch(0.58 0.18 240)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Quick actions row */}
      {!hasNoTrips && (
        <div
          className="grid grid-cols-2 gap-3 animate-fade-up stagger-4"
          data-ocid="dashboard.quick_actions.panel"
        >
          <button
            type="button"
            onClick={() => setAddTripOpen(true)}
            className="bg-primary text-primary-foreground rounded-2xl p-4 flex items-center gap-3 shadow-voice btn-press hover:opacity-90 transition-opacity min-h-[56px]"
            data-ocid="dashboard.add_trip.button"
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-sm">Log Trip</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange("earnings")}
            className="bg-card rounded-2xl p-4 flex items-center gap-3 shadow-card card-hover-lift btn-press min-h-[56px]"
            data-ocid="dashboard.view_earnings.button"
          >
            <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <span className="font-display font-bold text-sm text-foreground">
              Earnings
            </span>
          </button>
        </div>
      )}

      {/* AI Insights CTA for Tier 3 */}
      {tier === 3 && !hasNoTrips && (
        <button
          type="button"
          onClick={() => onTabChange("intelligence")}
          className="w-full bg-card rounded-2xl shadow-card p-4 flex items-center gap-3 premium-glow card-hover-lift btn-press animate-fade-up stagger-4"
          data-ocid="dashboard.ai_insights.button"
        >
          <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center">
            <Zap className="w-5 h-5 text-gold" />
          </div>
          <div className="text-left">
            <p className="font-display font-bold text-sm text-foreground">
              AI Insights Available
            </p>
            <p className="text-xs text-muted-foreground">
              View peak hour predictions and route optimization
            </p>
          </div>
        </button>
      )}

      {/* Recent Trips */}
      {!hasNoTrips && recentTrips.length > 0 && (
        <div
          className="bg-card rounded-2xl shadow-card overflow-hidden animate-fade-up stagger-5"
          data-ocid="dashboard.recent_trips.card"
        >
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="font-display font-bold text-sm text-foreground">
              Recent Trips
            </h2>
            <button
              type="button"
              onClick={() => onTabChange("earnings")}
              className="text-xs text-primary font-medium hover:underline"
              data-ocid="dashboard.all_trips.link"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-border">
            {recentTrips.map((trip, idx) => {
              const style =
                PLATFORM_STYLES[trip.platform] ?? PLATFORM_STYLES.Other;
              return (
                <div
                  key={trip.tripId}
                  className="flex items-center justify-between px-4 py-3"
                  data-ocid={`dashboard.recent_trips.item.${idx + 1}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${style.bg}`}
                    >
                      <span className={`text-[10px] font-bold ${style.text}`}>
                        {trip.platform.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {trip.platform}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(Number(trip.date)).toLocaleDateString()}
                        {Number(trip.durationMinutes) > 0
                          ? ` · ${trip.durationMinutes}min`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-sm text-foreground">
                      {formatCurrency(trip.amount, currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTripToDelete(trip)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label="Delete trip"
                      data-ocid={`dashboard.recent_trips.delete_button.${idx + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming shifts for tier 2+ */}
      {tier >= 2 && upcomingShifts && upcomingShifts.length > 0 && (
        <div
          className="bg-card rounded-2xl shadow-card p-4 animate-fade-up stagger-6"
          data-ocid="dashboard.upcoming_shifts.card"
        >
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-primary" />
            <h2 className="font-display font-bold text-sm text-foreground">
              Upcoming Shifts
            </h2>
          </div>
          {upcomingShifts.slice(0, 2).map((shift, idx) => (
            <div
              key={shift.shiftId}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
              data-ocid={`dashboard.shift.item.${idx + 1}`}
            >
              <div>
                <p className="text-sm font-semibold">
                  {new Date(Number(shift.date)).toLocaleDateString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {shift.startTime} &ndash; {shift.endTime}
                </p>
              </div>
              {shift.targetEarnings > 0 && (
                <span className="text-xs font-bold text-success">
                  Target: {formatCurrency(shift.targetEarnings, currency)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <AddTripDialog
        open={addTripOpen}
        onOpenChange={setAddTripOpen}
        currency={currency}
      />

      {/* Delete trip confirmation */}
      <AlertDialog
        open={!!tripToDelete}
        onOpenChange={(open) => {
          if (!open) setTripToDelete(null);
        }}
      >
        <AlertDialogContent data-ocid="dashboard.delete_trip.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this trip?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The trip from{" "}
              {tripToDelete
                ? new Date(Number(tripToDelete.date)).toLocaleDateString()
                : ""}{" "}
              ({tripToDelete?.platform}) will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="dashboard.delete_trip.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                tripToDelete && deleteTripMut.mutate(tripToDelete.tripId)
              }
              data-ocid="dashboard.delete_trip.confirm_button"
            >
              Remove Trip
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
