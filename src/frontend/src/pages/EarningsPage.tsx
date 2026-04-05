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
import { Plus, Trash2, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Trip, UserProfile } from "../backend";
import AddTripDialog from "../components/AddTripDialog";
import { useActor } from "../hooks/useActor";

interface EarningsPageProps {
  profile: UserProfile | null | undefined;
  tier: number;
}

const PLATFORMS = ["All", "Uber", "Bolt", "inDriver", "Other"];

const platformColors: Record<string, string> = {
  Uber: "bg-primary/10 text-primary",
  Bolt: "bg-green-100 text-green-700",
  inDriver: "bg-purple-100 text-purple-700",
  Other: "bg-muted text-muted-foreground",
};

export default function EarningsPage({ profile }: EarningsPageProps) {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [addTripOpen, setAddTripOpen] = useState(false);
  const [filter, setFilter] = useState("All");
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const currency = profile?.currencyCode ?? "ZAR";

  const { data: trips, isLoading } = useQuery({
    queryKey: ["trips"],
    queryFn: () => actor!.getTrips(),
    enabled: !!actor,
  });

  const { data: earningsTotal } = useQuery({
    queryKey: ["earningsTotal"],
    queryFn: () => actor!.getEarningsTotal(),
    enabled: !!actor,
  });

  const deleteMutation = useMutation({
    mutationFn: (tripId: string) => actor!.deleteTrip(tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["earningsTotal"] });
      toast.success("Trip removed");
      setTripToDelete(null);
    },
    onError: () => {
      toast.error("Failed to remove trip");
      setTripToDelete(null);
    },
  });

  const filtered = (trips ?? []).filter(
    (t) => filter === "All" || t.platform === filter,
  );
  const sorted = [...filtered].sort((a, b) => Number(b.date) - Number(a.date));

  // When a platform filter is active, compute stats from the filtered list
  const isFiltered = filter !== "All";
  const filteredTotal = filtered.reduce((s, t) => s + t.amount, 0);
  const filteredCount = filtered.length;
  const filteredAvg = filteredCount > 0 ? filteredTotal / filteredCount : 0;

  const allTimeTotal = earningsTotal ? earningsTotal[0] : 0;
  const allTimeCount = earningsTotal ? Number(earningsTotal[1]) : 0;
  const allTimeAvg = allTimeCount > 0 ? allTimeTotal / allTimeCount : 0;

  const total = isFiltered ? filteredTotal : allTimeTotal;
  const count = isFiltered ? filteredCount : allTimeCount;
  const avg = isFiltered ? filteredAvg : allTimeAvg;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Earnings Tracker</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Track and manage your trip income
          </p>
        </div>
        <Button
          onClick={() => setAddTripOpen(true)}
          className="gap-2"
          data-ocid="earnings.add_trip.button"
        >
          <Plus className="w-4 h-4" /> Log Trip
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Card className="shadow-card">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
              {isFiltered ? `${filter} Earnings` : "Total Earnings"}
            </p>
            <p className="text-2xl font-display font-bold mt-1">
              {currency} {total.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
              Trips
            </p>
            <p className="text-2xl font-display font-bold mt-1">{count}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card col-span-2 md:col-span-1">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
              Avg per Trip
            </p>
            <p className="text-2xl font-display font-bold mt-1">
              {currency} {avg.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {PLATFORMS.map((p) => (
          <button
            type="button"
            key={p}
            onClick={() => setFilter(p)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === p
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground border border-border hover:border-primary/40"
            }`}
            data-ocid="earnings.filter.tab"
          >
            {p}
          </button>
        ))}
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Trip History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div
              className="text-center py-10"
              data-ocid="earnings.trips.empty_state"
            >
              <TrendingUp className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">
                No trips logged yet.
              </p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => setAddTripOpen(true)}
              >
                Log First Trip
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sorted.map((trip, idx) => (
                <div
                  key={trip.tripId}
                  className="flex items-center justify-between py-3.5"
                  data-ocid={`earnings.trips.item.${idx + 1}`}
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      className={`text-xs ${
                        platformColors[trip.platform] ?? platformColors.Other
                      }`}
                    >
                      {trip.platform}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(Number(trip.date)).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Number(trip.durationMinutes)} min
                        {trip.notes ? ` • ${trip.notes}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-foreground text-base">
                      {currency} {trip.amount.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTripToDelete(trip)}
                      aria-label="Delete trip"
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      data-ocid={`earnings.trips.delete_button.${idx + 1}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddTripDialog
        open={addTripOpen}
        onOpenChange={setAddTripOpen}
        currency={currency}
      />

      {/* Delete trip confirmation dialog */}
      <AlertDialog
        open={!!tripToDelete}
        onOpenChange={(open) => {
          if (!open) setTripToDelete(null);
        }}
      >
        <AlertDialogContent data-ocid="earnings.delete_trip.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this trip?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="earnings.delete_trip.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                tripToDelete && deleteMutation.mutate(tripToDelete.tripId)
              }
              data-ocid="earnings.delete_trip.confirm_button"
            >
              Remove Trip
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
