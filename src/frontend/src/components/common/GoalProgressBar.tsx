import { formatCurrency } from "@/lib/currency";
import { useEffect, useState } from "react";

interface GoalProgressBarProps {
  current: number;
  goal: number;
  currency?: string;
}

export default function GoalProgressBar({
  current,
  goal,
  currency = "ZAR",
}: GoalProgressBarProps) {
  const [animatedWidth, setAnimatedWidth] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const goalReached = pct >= 100;
  const remaining = Math.max(goal - current, 0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedWidth(pct), 80);
    return () => clearTimeout(timer);
  }, [pct]);

  useEffect(() => {
    if (goalReached) {
      setShowCelebration(true);
      const t = setTimeout(() => setShowCelebration(false), 3000);
      return () => clearTimeout(t);
    }
  }, [goalReached]);

  const barColor = goalReached
    ? "bg-success"
    : pct >= 75
      ? "bg-amber-500"
      : pct >= 50
        ? "bg-primary"
        : "bg-muted-foreground/50";

  const percentLabel = Math.round(pct);

  return (
    <div className="w-full" data-ocid="goal_progress.panel">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Daily Goal
        </span>
        <span
          className={`text-xs font-bold transition-colors ${
            goalReached
              ? "text-success"
              : pct >= 75
                ? "text-amber-600"
                : "text-foreground"
          }`}
        >
          {goalReached
            ? "🎉 Goal reached!"
            : `${formatCurrency(remaining, currency)} to go`}
        </span>
      </div>

      <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor} ${
            goalReached ? "animate-pulse" : ""
          }`}
          style={{ width: `${animatedWidth}%` }}
        />
        {/* Percentage label at end of bar */}
        {pct > 10 && (
          <span
            className="absolute top-1/2 -translate-y-1/2 text-[9px] font-bold text-white pointer-events-none select-none"
            style={{ left: `calc(${Math.min(animatedWidth, 92)}% - 18px)` }}
          >
            {percentLabel}%
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[11px] text-muted-foreground">
          {formatCurrency(current, currency)}
        </span>
        <span className="text-[11px] text-muted-foreground font-medium">
          Goal: {formatCurrency(goal, currency)}
        </span>
      </div>

      {showCelebration && (
        <div
          className="mt-2 text-center text-sm font-bold text-success"
          style={{ animation: "confettiFlash 0.5s ease-out forwards" }}
        >
          🎊 Daily goal smashed! Keep it up!
        </div>
      )}
    </div>
  );
}
