"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Receipt,
  Search,
  TrendingUp,
  Package,
  ShoppingCart,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  getSalesLog,
  getSalesSummary,
  deleteSale,
} from "@/actions/lab-pharmacy";
import useFetch from "@/hooks/use-fetch";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function SalesLog({ refreshKey = 0 }) {
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [restoreStock, setRestoreStock] = useState(true);

  const { data: logData, fn: fetchLog, loading } = useFetch(getSalesLog);
  const { data: summaryData, fn: fetchSummary } = useFetch(getSalesSummary);
  const { fn: submitDelete, data: deleteData, loading: deleting } =
    useFetch(deleteSale);

  useEffect(() => {
    fetchLog({ limit: 200 });
    fetchSummary({ days: 30 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  useEffect(() => {
    if (deleteData?.success) {
      toast.success(
        deleteData.restored
          ? `Sale removed · ${deleteData.unitsSold} unit(s) restored to stock`
          : "Sale record removed"
      );
      setPendingDelete(null);
      fetchLog({ limit: 200 });
      fetchSummary({ days: 30 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteData]);

  const sales = logData?.sales || [];
  const summary = summaryData?.summary;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter(
      (s) =>
        s.medicineName.toLowerCase().includes(q) ||
        (s.note || "").toLowerCase().includes(q) ||
        (s.soldBy || "").toLowerCase().includes(q)
    );
  }, [sales, search]);

  const handleConfirmDelete = async (e) => {
    e.preventDefault();
    if (!pendingDelete) return;
    const fd = new FormData();
    fd.append("id", pendingDelete.id);
    fd.append("restoreStock", String(restoreStock));
    await submitDelete(fd);
  };

  const handleOpenDelete = (sale) => {
    setPendingDelete(sale);
    setRestoreStock(true); // default: undo the sale completely
  };

  return (
    <div className="space-y-4">
      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Revenue (last 30 days)"
          value={`KES ${(summary?.totalRevenue ?? 0).toLocaleString()}`}
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
        />
        <KpiCard
          label="Units sold (last 30 days)"
          value={(summary?.totalUnits ?? 0).toLocaleString()}
          icon={<Package className="h-4 w-4 text-primary" />}
        />
        <KpiCard
          label="Transactions (last 30 days)"
          value={(summary?.salesCount ?? 0).toLocaleString()}
          icon={<ShoppingCart className="h-4 w-4 text-primary" />}
        />
      </div>

      {/* ── Sales table ── */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-col gap-3 border-b border-border/60 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Receipt className="h-4 w-4 text-primary" />
              Sales record
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Every medicine sale, newest first. Up to 200 most recent entries.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search medicine, note, staff…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 focus-ring"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading && sales.length === 0 ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-md bg-muted/60"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {search
                ? "No sales match your search."
                : "No sales recorded yet."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Medicine</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Unit (KES)</th>
                    <th className="px-4 py-3 text-right">Total (KES)</th>
                    <th className="px-4 py-3">Note</th>
                    <th className="px-4 py-3">Sold by</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-border/40 transition-colors hover:bg-muted/40"
                    >
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {format(new Date(s.createdAt), "MMM d, yyyy · HH:mm")}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {s.medicineName}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <Badge
                          variant="outline"
                          className="bg-primary/10 text-primary border-primary/20"
                        >
                          −{s.quantitySold}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {s.unitPrice}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                        {s.total.toLocaleString()}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                        {s.note || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {s.soldBy}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive focus-ring"
                          onClick={() => handleOpenDelete(s)}
                          aria-label="Delete sale record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Delete confirmation ── */}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete this sale record?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Medicine</span>
                    <span className="font-medium text-foreground">
                      {pendingDelete?.medicineName}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-muted-foreground">Quantity</span>
                    <span className="font-medium tabular-nums text-foreground">
                      −{pendingDelete?.quantitySold}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-medium tabular-nums text-foreground">
                      KES {pendingDelete?.total?.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-muted-foreground">Sold by</span>
                    <span className="text-foreground">
                      {pendingDelete?.soldBy}
                    </span>
                  </div>
                </div>

                <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted/40">
                  <input
                    type="checkbox"
                    checked={restoreStock}
                    onChange={(e) => setRestoreStock(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-primary"
                  />
                  <span className="text-sm">
                    <span className="font-medium text-foreground">
                      Restore stock
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Adds {pendingDelete?.quantitySold} unit(s) back to{" "}
                      {pendingDelete?.medicineName}. Use this if the sale was
                      recorded by mistake.
                    </span>
                  </span>
                </label>

                {!restoreStock && (
                  <p className="text-xs text-warning-foreground">
                    ⚠ Stock will not be restored. Only the log entry is
                    removed.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              {deleting ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-4 w-4" />
              )}
              Delete record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function KpiCard({ label, value, icon }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {icon}
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}