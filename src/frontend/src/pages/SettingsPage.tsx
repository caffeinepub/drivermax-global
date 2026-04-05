import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, CreditCard, Eye, EyeOff, Mic, Shield, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "../backend";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { TIER_NAMES, TIER_PRICES } from "../lib/tiers";

interface SettingsPageProps {
  profile: UserProfile | null | undefined;
  onSave: (p: UserProfile) => void;
}

const CURRENCIES = [
  "ZAR",
  "USD",
  "EUR",
  "GBP",
  "NGN",
  "KES",
  "GHS",
  "EGP",
  "TZS",
  "UGX",
];

const TIER_FEATURES: Record<number, string[]> = {
  1: [
    "Dashboard command center",
    "Full earnings tracker",
    "Expense & fuel logging",
    "Voice commands (trial)",
    "Event calendar",
  ],
  2: [
    "Everything in Basic",
    "In-Car Sales tracker",
    "QR code passenger menu",
    "Shift scheduling",
    "Full AI voice (unlimited)",
    "Weekly charts",
  ],
  3: [
    "Everything in Pro",
    "AI insights & predictions",
    "Advanced analytics",
    "Priority AI voice",
    "Gold premium badge",
    "Priority support",
    "All future features",
  ],
};

export default function SettingsPage({ profile, onSave }: SettingsPageProps) {
  const { clear } = useInternetIdentity();
  const { actor } = useActor();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [currencyCode, setCurrencyCode] = useState(
    profile?.currencyCode ?? "ZAR",
  );
  const [voiceEnabled, setVoiceEnabled] = useState(
    profile?.voiceEnabled !== false,
  );
  const [saving, setSaving] = useState(false);
  const [elevenLabsKey, setElevenLabsKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  const tier = Number(profile?.subscriptionTier ?? 1);

  const { data: isAdmin } = useQuery({
    queryKey: ["isAdmin"],
    queryFn: () => actor!.isCallerAdmin(),
    enabled: !!actor,
  });

  const { data: isElevenLabsConfigured, refetch: refetchElevenLabs } = useQuery(
    {
      queryKey: ["isElevenLabsConfigured"],
      queryFn: () => actor!.isElevenLabsConfigured(),
      enabled: !!actor && !!isAdmin,
    },
  );

  const { data: isStripeConfigured } = useQuery({
    queryKey: ["isStripeConfigured"],
    queryFn: () => actor!.isStripeConfigured(),
    enabled: !!actor && !!isAdmin,
  });

  const setElevenLabsKeyMut = useMutation({
    mutationFn: async (key: string) => {
      if (!actor) throw new Error("No actor");
      await actor.setElevenLabsApiKey(key);
    },
    onSuccess: () => {
      toast.success("ElevenLabs API key saved securely.");
      setElevenLabsKey("");
      refetchElevenLabs();
    },
    onError: () => toast.error("Failed to save API key."),
  });

  const handleSave = async () => {
    setSaving(true);
    onSave({
      displayName: displayName || "Driver",
      currencyCode,
      voiceEnabled,
      subscriptionTier: BigInt(tier),
      vehicleName: profile?.vehicleName ?? "",
      fuelConsumptionRate: profile?.fuelConsumptionRate ?? 0,
    });
    toast.success("Settings saved");
    setSaving(false);
  };

  const handleSubscribe = async (targetTier: number) => {
    if (!actor) {
      toast.error("Not connected");
      return;
    }
    const tierProducts: Record<
      number,
      { name: string; desc: string; price: number }
    > = {
      1: {
        name: "Basic",
        desc: "DriverMax Basic subscription",
        price: 50000,
      },
      2: { name: "Pro", desc: "DriverMax Pro subscription", price: 80000 },
      3: {
        name: "Premium",
        desc: "DriverMax Premium subscription",
        price: 110000,
      },
    };
    const product = tierProducts[targetTier];
    if (!product) return;
    try {
      toast.info("Opening payment...");
      const url = await actor.createCheckoutSession(
        [
          {
            productName: product.name,
            productDescription: product.desc,
            currency: "ZAR",
            quantity: BigInt(1),
            priceInCents: BigInt(product.price),
          },
        ],
        `${window.location.origin}${window.location.pathname}?payment=success&tier=${targetTier}`,
        `${window.location.origin}${window.location.pathname}?payment=cancel`,
      );
      window.location.href = url;
    } catch {
      toast.error("Payment setup failed. Make sure Stripe is configured.");
    }
  };

  // Max features across all tiers for comparison
  const allFeatureKeys = Array.from(
    new Set(Object.values(TIER_FEATURES).flat()),
  );

  const tierHasFeature = (tierNum: number, feature: string): boolean => {
    const features = TIER_FEATURES[tierNum] ?? [];
    // Higher tiers inherit lower tier features via "Everything in X"
    if (tierNum === 3) return true;
    if (tierNum === 2) {
      return (
        TIER_FEATURES[2].includes(feature) || TIER_FEATURES[1].includes(feature)
      );
    }
    return features.includes(feature);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your profile and preferences
        </p>
      </div>

      {/* Profile card */}
      <Card className="shadow-card" data-ocid="settings.profile.card">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Display Name</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="mt-1"
              data-ocid="settings.display_name.input"
            />
          </div>
          <div>
            <Label>Currency</Label>
            <Select value={currencyCode} onValueChange={setCurrencyCode}>
              <SelectTrigger
                className="mt-1"
                data-ocid="settings.currency.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="flex items-center gap-2">
                <Mic className="w-4 h-4" /> Voice Commands
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enable hands-free voice operation
              </p>
            </div>
            <Switch
              checked={voiceEnabled}
              onCheckedChange={setVoiceEnabled}
              data-ocid="settings.voice.switch"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tier comparison table */}
      <Card className="shadow-card" data-ocid="settings.subscription.card">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" /> Subscription Plans
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Your current plan is{" "}
            <span className="font-bold text-foreground">
              {TIER_NAMES[tier]}
            </span>
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto pb-0">
          {/* Comparison table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-1/2">Feature</TableHead>
                {[1, 2, 3].map((t) => (
                  <TableHead
                    key={t}
                    className={`text-center text-xs ${
                      t === tier ? "text-primary font-bold" : ""
                    }`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span>{TIER_NAMES[t]}</span>
                      <span
                        className={`text-[10px] font-normal ${
                          t === tier ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {TIER_PRICES[t]}
                      </span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {allFeatureKeys
                .filter((f) => !f.startsWith("Everything"))
                .map((feature) => (
                  <TableRow key={feature}>
                    <TableCell className="text-xs py-2">{feature}</TableCell>
                    {[1, 2, 3].map((t) => (
                      <TableCell
                        key={t}
                        className={`text-center py-2 ${
                          t === tier ? "bg-primary/5" : ""
                        }`}
                      >
                        {tierHasFeature(t, feature) ? (
                          <Check className="w-4 h-4 text-success mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
            </TableBody>
          </Table>

          {/* Current tier highlight */}
          <div
            className={`my-4 p-3 rounded-xl flex items-center justify-between ${
              tier === 3
                ? "bg-gold/10 border border-gold/30"
                : tier === 2
                  ? "bg-primary/10 border border-primary/20"
                  : "bg-muted"
            }`}
          >
            <div>
              <p className="text-xs font-semibold text-foreground">
                Current:{" "}
                <span
                  className={`${
                    tier === 3 ? "text-gold" : tier === 2 ? "text-primary" : ""
                  }`}
                >
                  {TIER_NAMES[tier]} Plan
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                {TIER_PRICES[tier]}
              </p>
            </div>
            {tier === 3 ? (
              <Badge className="bg-gold text-foreground font-bold text-xs">
                PREMIUM
              </Badge>
            ) : tier === 2 ? (
              <Badge className="bg-primary text-white text-xs">PRO</Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                Basic
              </Badge>
            )}
          </div>

          {/* Upgrade buttons */}
          <div className="space-y-3 mb-4">
            {[1, 2, 3]
              .filter((t) => t !== tier)
              .map((t) => (
                <div
                  key={t}
                  className={`flex items-center justify-between border rounded-xl p-3 ${
                    t === 3
                      ? "border-gold/40 bg-gold/5"
                      : t === 2
                        ? "border-primary/30 bg-primary/5"
                        : "border-border"
                  }`}
                  data-ocid={`settings.upgrade_tier.${t}.row`}
                >
                  <div>
                    <p className="font-semibold text-sm">{TIER_NAMES[t]}</p>
                    <p className="text-xs text-muted-foreground">
                      {TIER_PRICES[t]}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSubscribe(t)}
                    className={`gap-1.5 ${
                      t === 3 ? "bg-gold text-foreground hover:bg-gold/90" : ""
                    }`}
                    variant={t === 3 ? "default" : "default"}
                    data-ocid={`settings.upgrade_tier.${t}.button`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    {t > tier ? "Upgrade" : "Downgrade"}
                  </Button>
                </div>
              ))}
          </div>

          <p className="text-xs text-muted-foreground pb-4">
            Payments processed securely via Stripe. Your tier updates
            automatically after payment.
          </p>
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 text-base font-bold min-h-[52px] btn-press"
        data-ocid="settings.save.button"
      >
        {saving ? "Saving..." : "Save Settings"}
      </Button>

      {isAdmin && (
        <div
          className="border border-amber-300 rounded-2xl overflow-hidden"
          data-ocid="settings.admin.panel"
        >
          <div className="bg-amber-50 px-4 py-3 flex items-center gap-2 border-b border-amber-200">
            <Shield className="w-4 h-4 text-amber-600" />
            <span className="font-display font-bold text-sm text-amber-800">
              Admin Panel
            </span>
            <span className="ml-auto text-[10px] bg-amber-200 text-amber-800 rounded-full px-2 py-0.5 font-semibold">
              ADMIN ONLY
            </span>
          </div>
          <div className="p-4 space-y-4 bg-amber-50/30">
            <div className="flex flex-wrap gap-2">
              <div
                className={`text-xs px-3 py-1.5 rounded-full font-semibold flex items-center gap-1.5 ${isElevenLabsConfigured ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}
              >
                {isElevenLabsConfigured ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <X className="w-3 h-3" />
                )}
                ElevenLabs:{" "}
                {isElevenLabsConfigured ? "Configured" : "Not configured"}
              </div>
              <div
                className={`text-xs px-3 py-1.5 rounded-full font-semibold flex items-center gap-1.5 ${isStripeConfigured ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}
              >
                {isStripeConfigured ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <X className="w-3 h-3" />
                )}
                Stripe: {isStripeConfigured ? "Configured" : "Not configured"}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Set ElevenLabs API Key
              </Label>
              <p className="text-xs text-muted-foreground">
                Powers AI voice for all Tier 2 and 3 subscribers. Stored
                securely on-chain.
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    placeholder="sk_..."
                    value={elevenLabsKey}
                    onChange={(e) => setElevenLabsKey(e.target.value)}
                    className="pr-10"
                    data-ocid="settings.admin.elevenlabs_key.input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showApiKey ? "Hide API key" : "Show API key"}
                  >
                    {showApiKey ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <Button
                  onClick={() => setElevenLabsKeyMut.mutate(elevenLabsKey)}
                  disabled={
                    !elevenLabsKey.trim() || setElevenLabsKeyMut.isPending
                  }
                  size="sm"
                  className="shrink-0"
                  data-ocid="settings.admin.save_key.button"
                >
                  {setElevenLabsKeyMut.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
            <p className="text-xs text-amber-700 bg-amber-100 rounded-lg px-3 py-2">
              <strong>Stripe:</strong> Configure via your Caffeine project
              environment variables. Contact support to update your Stripe
              secret key.
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={clear}
        className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-3"
        data-ocid="settings.signout.button"
      >
        Sign Out
      </button>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-amber-800 text-xs">
          <strong>Disclaimer:</strong> DriverMax Global is a trip and earnings
          tracking tool only. Nothing in this app constitutes financial advice.
          Please consult a qualified financial professional for any financial
          decisions.
        </p>
      </div>

      <p className="text-center text-xs text-muted-foreground pb-2">
        &copy; {new Date().getFullYear()}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          caffeine.ai
        </a>
      </p>
    </div>
  );
}
