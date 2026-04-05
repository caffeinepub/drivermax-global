export const TIER_NAMES: Record<number, string> = {
  1: "Basic",
  2: "Pro",
  3: "Premium",
};

export const TIER_PRICES: Record<number, string> = {
  1: "R500/month",
  2: "R800/month",
  3: "R1,100/month",
};

export function canAccess(
  feature: "inCarSales" | "schedule" | "qrMenu" | "aiVoice" | "aiInsights",
  tier: number,
): boolean {
  const gates: Record<string, number> = {
    inCarSales: 2,
    schedule: 2,
    qrMenu: 2,
    aiVoice: 2,
    aiInsights: 3,
  };
  return tier >= (gates[feature] ?? 1);
}
