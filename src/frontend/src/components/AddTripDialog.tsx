import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";

interface AddTripDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currency: string;
}

const PLATFORMS = ["Uber", "Bolt", "inDriver", "Other"];

export default function AddTripDialog({
  open,
  onOpenChange,
  currency,
}: AddTripDialogProps) {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [platform, setPlatform] = useState("Uber");
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("No actor");
      // Validate required fields before attempting BigInt conversion
      if (!date) {
        throw new Error("Please select a date");
      }
      const parsedAmount = Number.parseFloat(amount);
      if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Please enter a valid amount greater than 0");
      }
      // Use local time by appending T00:00:00 to avoid UTC-offset day shift
      const dateMs = new Date(`${date}T00:00:00`).getTime();
      if (Number.isNaN(dateMs)) {
        throw new Error("Invalid date selected");
      }
      await actor.addTrip({
        tripId: crypto.randomUUID(),
        platform,
        amount: parsedAmount,
        durationMinutes: BigInt(Number.parseInt(duration || "0")),
        date: BigInt(dateMs),
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["earningsTotal"] });
      toast.success("Trip logged!");
      onOpenChange(false);
      // Reset all fields including platform
      setPlatform("Uber");
      setAmount("");
      setDuration("");
      setNotes("");
      setDate(new Date().toISOString().split("T")[0]);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!date || !amount) {
      toast.error("Please fill in the date and amount before saving.");
      return;
    }
    mut.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Log Trip</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Amount ({currency})</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="150.00"
              className="mt-1"
              required
              data-ocid="add_trip.amount.input"
            />
          </div>
          <div>
            <Label>Duration (minutes)</Label>
            <Input
              type="number"
              min="0"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="25"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
              required
              data-ocid="add_trip.date.input"
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
            onClick={handleSubmit}
            disabled={!amount || !platform || mut.isPending}
            data-ocid="add_trip.submit_button"
          >
            {mut.isPending ? "Saving..." : "Log Trip"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
