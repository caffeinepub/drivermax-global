import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fuel, Save, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";
import type { UserProfile } from "../backend";
import { useActor } from "../hooks/useActor";

interface Props {
  profile: UserProfile | null | undefined;
  tier: number;
}

export default function FuelCalculatorPage({ profile }: Props) {
  const { actor } = useActor();
  const qc = useQueryClient();
  const currency = profile?.currencyCode ?? "ZAR";

  const [pricePerLitre, setPricePerLitre] = useState("");
  const [consumption, setConsumption] = useState("");
  const [distance, setDistance] = useState("");
  const [vehicleName, setVehicleName] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);

  const { data: fuelProfile } = useQuery({
    queryKey: ["fuelProfile"],
    queryFn: () => actor!.getFuelProfile(),
    enabled: !!actor,
  });

  const { data: fuelLogs } = useQuery({
    queryKey: ["fuelLogs"],
    queryFn: () => actor!.getFuelLogs(),
    enabled: !!actor,
  });

  const { data: earningsTotal } = useQuery({
    queryKey: ["earningsTotal"],
    queryFn: () => actor!.getEarningsTotal(),
    enabled: !!actor,
  });

  useEffect(() => {
    if (fuelProfile) {
      setConsumption(String(fuelProfile.fuelConsumptionRate || ""));
      setVehicleName(fuelProfile.vehicleName || "");
    }
  }, [fuelProfile]);

  const saveProfileMut = useMutation({
    mutationFn: () => actor!.saveFuelProfile(Number(consumption), vehicleName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fuelProfile"] });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    },
  });

  const logFuelMut = useMutation({
    mutationFn: ({
      cost,
      dist,
      fuelUsed,
    }: { cost: number; dist: number; fuelUsed: number }) =>
      actor!.addFuelLog({
        cost,
        date: BigInt(Date.now()),
        distance: dist,
        fuelUsed,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fuelLogs"] }),
  });

  const price = Number(pricePerLitre);
  const cons = Number(consumption);
  const dist = Number(distance);

  const fuelUsed = cons > 0 && dist > 0 ? (dist / 100) * cons : 0;
  const fuelCost = fuelUsed * price;
  const grossEarnings = earningsTotal ? earningsTotal[0] : 0;
  const netEarnings = grossEarnings - fuelCost;

  const todayFuelCost = (fuelLogs ?? [])
    .filter((l) => {
      const d = new Date(Number(l.date));
      const today = new Date();
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    })
    .reduce((s, l) => s + l.cost, 0);

  const sortedLogs = [...(fuelLogs ?? [])]
    .sort((a, b) => Number(b.date) - Number(a.date))
    .slice(0, 10);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">
          Fuel Cost Calculator
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Calculate your real net earnings after fuel costs
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <Card className="shadow-card">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
              Gross Earnings
            </p>
            <p className="text-2xl font-display font-bold mt-1">
              {currency} {grossEarnings.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
              Today's Fuel Spend
            </p>
            <p className="text-2xl font-display font-bold mt-1 text-destructive">
              {currency} {todayFuelCost.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Fuel className="w-4 h-4 text-primary" /> Vehicle Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Vehicle Name</Label>
              <Input
                placeholder="e.g. Toyota Corolla"
                value={vehicleName}
                onChange={(e) => setVehicleName(e.target.value)}
              />
            </div>
            <div>
              <Label>Consumption (L/100km)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                placeholder="e.g. 8.5"
                value={consumption}
                onChange={(e) => setConsumption(e.target.value)}
              />
            </div>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => saveProfileMut.mutate()}
            disabled={!consumption || saveProfileMut.isPending}
          >
            <Save className="w-4 h-4" />
            {profileSaved
              ? "Saved!"
              : saveProfileMut.isPending
                ? "Saving..."
                : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-card mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-primary" /> Calculate Trip
            Fuel Cost
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fuel Price ({currency}/L)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 22.50"
                value={pricePerLitre}
                onChange={(e) => setPricePerLitre(e.target.value)}
              />
            </div>
            <div>
              <Label>Distance (km)</Label>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 45"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
              />
            </div>
          </div>

          {fuelCost > 0 && (
            <div className="rounded-xl bg-muted/50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fuel used</span>
                <span className="font-medium">{fuelUsed.toFixed(2)} L</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fuel cost</span>
                <span className="font-medium text-destructive">
                  - {currency} {fuelCost.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-bold border-t border-border pt-2">
                <span>Net Earnings</span>
                <span
                  className={
                    netEarnings >= 0 ? "text-green-600" : "text-destructive"
                  }
                >
                  {currency} {netEarnings.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <Button
            className="gap-2 w-full"
            disabled={
              !pricePerLitre ||
              !distance ||
              !consumption ||
              logFuelMut.isPending
            }
            onClick={() =>
              logFuelMut.mutate({ cost: fuelCost, dist, fuelUsed })
            }
          >
            <Fuel className="w-4 h-4" />
            {logFuelMut.isPending ? "Logging..." : "Log Fuel Cost"}
          </Button>
        </CardContent>
      </Card>

      {sortedLogs.length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">
              Fuel Log History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {sortedLogs.map((log) => (
                <div
                  key={String(log.date)}
                  className="flex items-center justify-between py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {log.distance.toFixed(0)} km driven
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(Number(log.date)).toLocaleDateString()} &middot;{" "}
                      {log.fuelUsed.toFixed(2)} L
                    </p>
                  </div>
                  <span className="text-sm font-bold text-destructive">
                    {currency} {log.cost.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
