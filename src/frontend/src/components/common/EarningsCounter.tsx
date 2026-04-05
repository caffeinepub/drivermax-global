import { formatCurrency } from "@/lib/currency";
import { useEffect, useRef, useState } from "react";

interface EarningsCounterProps {
  value: number;
  currency?: string;
  className?: string;
}

export default function EarningsCounter({
  value,
  currency = "ZAR",
  className = "",
}: EarningsCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevValueRef.current;
    const to = value;
    if (from === to) return;

    const duration = 600;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - (1 - progress) ** 3;
      const current = from + (to - from) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(to);
        prevValueRef.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return (
    <span className={className}>{formatCurrency(displayValue, currency)}</span>
  );
}
