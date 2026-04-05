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
import {
  Dialog,
  DialogContent,
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Receipt, Trash2, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { ExpenseEntry, UserProfile } from "../backend";
import { useActor } from "../hooks/useActor";

interface Props {
  profile: UserProfile | null | undefined;
  tier: number;
}

const CATEGORIES = [
  "Vehicle Maintenance",
  "Car Wash",
  "Data Bundle",
  "Tolls",
  "Food",
  "Fuel",
  "Other",
];

const categoryColors: Record<string, string> = {
  "Vehicle Maintenance": "bg-orange-100 text-orange-700",
  "Car Wash": "bg-blue-100 text-blue-700",
  "Data Bundle": "bg-purple-100 text-purple-700",
  Tolls: "bg-yellow-100 text-yellow-700",
  Food: "bg-green-100 text-green-700",
  Fuel: "bg-red-100 text-red-700",
  Other: "bg-muted text-muted-foreground",
};

type Period = "today" | "week" | "month";

function getPeriodBounds(period: Period): { start: number; end: number } {
  const now = new Date();
  const end = now.getTime();
  if (period === "today") {
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    return { start, end };
  }
  if (period === "week") {
    // Start from Monday of current week
    const day = now.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon);
    mon.setHours(0, 0, 0, 0);
    return { start: mon.getTime(), end };
  }
  // month
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return { start, end };
}

function inPeriod(date: bigint, period: Period): boolean {
  const { start, end } = getPeriodBounds(period);
  const d = Number(date);
  return d >= start && d <= end;
}

export default function ExpenseTrackerPage({ profile }: Props) {
  const { actor } = useActor();
  const qc = useQueryClient();
  const currency = profile?.currencyCode ?? "ZAR";
  const [period, setPeriod] = useState<Period>("month");
  const [addOpen, setAddOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseEntry | null>(
    null,
  );
  const [form, setForm] = useState({
    category: "Other",
    amount: "",
    notes: "",
    date: new Date().toISOString().split("T")[0],
  });

  const { data: expenses } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => actor!.getExpenses(),
    enabled: !!actor,
  });

  const { data: trips } = useQuery({
    queryKey: ["trips"],
    queryFn: () => actor!.getTrips(),
    enabled: !!actor,
  });

  const addExpenseMut = useMutation({
    mutationFn: (ex: ExpenseEntry) => actor!.addExpense(ex),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setAddOpen(false);
      setForm({
        category: "Other",
        amount: "",
        notes: "",
        date: new Date().toISOString().split("T")[0],
      });
      toast.success("Expense added");
    },
    onError: () => toast.error("Failed to add expense"),
  });

  const deleteExpenseMut = useMutation({
    mutationFn: (id: string) => actor!.deleteExpense(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setExpenseToDelete(null);
      toast.success("Expense removed");
    },
    onError: () => {
      setExpenseToDelete(null);
      toast.error("Failed to remove expense");
    },
  });

  const filtered = (expenses ?? []).filter((e) => inPeriod(e.date, period));
  const sorted = [...filtered].sort((a, b) => Number(b.date) - Number(a.date));

  const totalExpenses = filtered.reduce((s, e) => s + e.amount, 0);

  // Compute gross earnings from trips within the same period for accurate net profit
  const { start: periodStart, end: periodEnd } = getPeriodBounds(period);
  const periodTrips = (trips ?? []).filter((t) => {
    const ts = Number(t.date);
    return ts >= periodStart && ts <= periodEnd;
  });
  const grossEarnings = periodTrips.reduce((s, t) => s + t.amount, 0);
  const netProfit = grossEarnings - totalExpenses;

  // Category breakdown
  const byCategory: Record<string, number> = {};
  for (const e of filtered) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
  }
  const catEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const maxCatAmount = Math.max(...catEntries.map((c) => c[1]), 1);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Expense Tracker</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Track costs to know your true profit
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="gap-2"
          data-ocid="expenses.add_expense.button"
        >
          <Plus className="w-4 h-4" /> Add Expense
        </Button>
      </div>

      {/* Period filter */}
      <div className="flex gap-2 mb-5">
        {(["today", "week", "month"] as Period[]).map((p) => (
          <button
            type="button"
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
              period === p
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:border-primary/40"
            }`}
            data-ocid="expenses.period.tab"
          >
            {p === "today"
              ? "Today"
              : p === "week"
                ? "This Week"
                : "This Month"}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <Card className="shadow-card">
          <CardContent className="pt-3 pb-3">
            <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wide">
              Gross Earnings
            </p>
            <p className="text-lg font-display font-bold mt-0.5">
              {currency} {grossEarnings.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-3 pb-3">
            <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wide">
              Expenses
            </p>
            <p className="text-lg font-display font-bold mt-0.5 text-destructive">
              - {currency} {totalExpenses.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card
          className={`shadow-card ${netProfit >= 0 ? "" : "border-destructive/40"}`}
        >
          <CardContent className="pt-3 pb-3">
            <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wide">
              Net Profit
            </p>
            <p
              className={`text-lg font-display font-bold mt-0.5 ${netProfit >= 0 ? "text-green-600" : "text-destructive"}`}
            >
              {currency} {netProfit.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {catEntries.length > 0 && (
        <Card className="shadow-card mb-5">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Breakdown by
              Category
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {catEntries.map(([cat, amount]) => (
              <div key={cat}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{cat}</span>
                  <span className="text-muted-foreground">
                    {currency} {amount.toFixed(2)}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(amount / maxCatAmount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" /> Expense Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <div
              className="text-center py-8"
              data-ocid="expenses.log.empty_state"
            >
              <Receipt className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">
                No expenses logged for this period.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sorted.map((exp, idx) => (
                <div
                  key={exp.expenseId}
                  className="flex items-center justify-between py-3"
                  data-ocid={`expenses.log.item.${idx + 1}`}
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      className={`text-xs ${categoryColors[exp.category] ?? categoryColors.Other}`}
                    >
                      {exp.category}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(Number(exp.date)).toLocaleDateString()}
                      </p>
                      {exp.notes && (
                        <p className="text-xs text-muted-foreground">
                          {exp.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-destructive text-sm">
                      {currency} {exp.amount.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setExpenseToDelete(exp)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-md hover:bg-destructive/10"
                      aria-label="Delete expense"
                      data-ocid={`expenses.log.delete_button.${idx + 1}`}
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

      {/* Add expense dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount ({currency})</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 250.00"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
                data-ocid="expenses.add_form.amount.input"
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
                data-ocid="expenses.add_form.date.input"
              />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="e.g. Full service at Midas"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                data-ocid="expenses.add_form.notes.textarea"
              />
            </div>
            <Button
              className="w-full"
              disabled={!form.amount || addExpenseMut.isPending}
              onClick={() =>
                addExpenseMut.mutate({
                  expenseId: crypto.randomUUID(),
                  category: form.category,
                  amount: Number(form.amount),
                  date: BigInt(new Date(`${form.date}T00:00:00`).getTime()),
                  notes: form.notes,
                })
              }
              data-ocid="expenses.add_form.submit_button"
            >
              {addExpenseMut.isPending ? "Saving..." : "Save Expense"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete expense confirmation */}
      <AlertDialog
        open={!!expenseToDelete}
        onOpenChange={(open) => {
          if (!open) setExpenseToDelete(null);
        }}
      >
        <AlertDialogContent data-ocid="expenses.delete_expense.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="expenses.delete_expense.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                expenseToDelete &&
                deleteExpenseMut.mutate(expenseToDelete.expenseId)
              }
              data-ocid="expenses.delete_expense.confirm_button"
            >
              Remove Expense
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
