import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "../backend";
import { useActor } from "../hooks/useActor";

interface SchedulePageProps {
  profile: UserProfile | null | undefined;
  tier: number;
}

type ShiftItem = {
  shiftId: string;
  date: bigint;
  startTime: string;
  endTime: string;
  targetEarnings: number;
  status: string;
  notes: string;
};

export default function SchedulePage({ profile }: SchedulePageProps) {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [addShiftOpen, setAddShiftOpen] = useState(false);
  const [deleteConfirmShift, setDeleteConfirmShift] =
    useState<ShiftItem | null>(null);
  const currency = profile?.currencyCode ?? "ZAR";

  const { data: upcoming, isLoading: upcomingLoading } = useQuery({
    queryKey: ["upcomingShifts"],
    queryFn: () => actor!.getUpcomingShifts(),
    enabled: !!actor,
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["shiftHistory"],
    queryFn: () => actor!.getShiftHistory(),
    enabled: !!actor,
  });

  const updateStatusMut = useMutation({
    mutationFn: async ({
      shift,
      status,
    }: { shift: ShiftItem; status: string }) => {
      if (!actor) throw new Error("No actor");
      await actor.addOrUpdateShift({ ...shift, status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upcomingShifts"] });
      queryClient.invalidateQueries({ queryKey: ["shiftHistory"] });
      toast.success("Shift updated");
    },
  });

  const deleteShiftMut = useMutation({
    mutationFn: async (shiftId: string) => {
      if (!actor) throw new Error("No actor");
      await actor.deleteShift(shiftId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upcomingShifts"] });
      queryClient.invalidateQueries({ queryKey: ["shiftHistory"] });
      toast.success("Shift deleted");
      setDeleteConfirmShift(null);
    },
    onError: () => toast.error("Failed to delete shift"),
  });

  const statusColors: Record<string, string> = {
    planned: "bg-primary/10 text-primary",
    active: "bg-green-100 text-green-700",
    completed: "bg-muted text-muted-foreground",
    cancelled: "bg-red-100 text-red-700",
  };

  const nextStatus: Record<string, string> = {
    planned: "active",
    active: "completed",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Schedule</h1>
          <p className="text-muted-foreground text-sm">
            Plan your shifts and track your time
          </p>
        </div>
        <Button onClick={() => setAddShiftOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Shift
        </Button>
      </div>

      <Card className="shadow-card mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Upcoming Shifts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (upcoming ?? []).length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">
                No upcoming shifts. Add one!
              </p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => setAddShiftOpen(true)}
              >
                Add Shift
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {(upcoming ?? []).map((shift) => (
                <div
                  key={shift.shiftId}
                  className="border border-border rounded-xl p-4 flex items-start justify-between"
                >
                  <div>
                    <p className="font-semibold">
                      {new Date(Number(shift.date)).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5" /> {shift.startTime} —{" "}
                      {shift.endTime}
                    </p>
                    <p className="text-sm font-medium text-primary mt-1">
                      Target: {currency} {shift.targetEarnings.toFixed(2)}
                    </p>
                    {shift.notes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {shift.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          statusColors[shift.status] ?? statusColors.planned
                        }
                      >
                        {shift.status}
                      </Badge>
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteConfirmShift(shift as ShiftItem)
                        }
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        aria-label="Delete shift"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {nextStatus[shift.status] && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateStatusMut.mutate({
                            shift: shift as ShiftItem,
                            status: nextStatus[shift.status],
                          })
                        }
                        disabled={updateStatusMut.isPending}
                        className="text-xs"
                      >
                        Mark {nextStatus[shift.status]}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">
            Shift History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (history ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No completed shifts yet.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {(history ?? []).map((shift) => (
                <div
                  key={shift.shiftId}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {new Date(Number(shift.date)).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {shift.startTime} — {shift.endTime}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {currency} {shift.targetEarnings.toFixed(2)}
                    </span>
                    <Badge
                      className={
                        statusColors[shift.status] ?? statusColors.planned
                      }
                    >
                      {shift.status}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmShift(shift as ShiftItem)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label="Delete shift"
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

      <AddShiftDialog
        open={addShiftOpen}
        onOpenChange={setAddShiftOpen}
        currency={currency}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmShift}
        onOpenChange={(open) => !open && setDeleteConfirmShift(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Delete Shift?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove the shift on{" "}
            <span className="font-medium text-foreground">
              {deleteConfirmShift
                ? new Date(Number(deleteConfirmShift.date)).toLocaleDateString()
                : ""}
            </span>{" "}
            ({deleteConfirmShift?.startTime} — {deleteConfirmShift?.endTime}).
            This cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmShift(null)}
              disabled={deleteShiftMut.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteConfirmShift &&
                deleteShiftMut.mutate(deleteConfirmShift.shiftId)
              }
              disabled={deleteShiftMut.isPending}
            >
              {deleteShiftMut.isPending ? "Deleting..." : "Delete Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddShiftDialog({
  open,
  onOpenChange,
  currency,
}: { open: boolean; onOpenChange: (v: boolean) => void; currency: string }) {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [target, setTarget] = useState("");
  const [notes, setNotes] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("No actor");
      await actor.addOrUpdateShift({
        shiftId: crypto.randomUUID(),
        date: BigInt(new Date(date).getTime()),
        startTime,
        endTime,
        targetEarnings: Number.parseFloat(target),
        status: "planned",
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upcomingShifts"] });
      queryClient.invalidateQueries({ queryKey: ["shiftHistory"] });
      toast.success("Shift added");
      onOpenChange(false);
      setDate("");
      setStartTime("");
      setEndTime("");
      setTarget("");
      setNotes("");
    },
    onError: () => toast.error("Failed to add shift"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Add Shift</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Time</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>End Time</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Target Earnings ({currency})</Label>
            <Input
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="500.00"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes..."
              className="mt-1"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => mut.mutate()}
            disabled={
              !date || !startTime || !endTime || !target || mut.isPending
            }
          >
            {mut.isPending ? "Saving..." : "Add Shift"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
