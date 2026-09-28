"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Loader2,
  Plus,
  Search,
  Pencil,
  X,
  Check,
  Package,
  AlertTriangle,
  Trash2,
  ShoppingCart,
} from "lucide-react";
import {
  getMedicines,
  createMedicine,
  updateMedicine,
  receiveMedicineStock,
  deleteMedicine,
  sellMedicine,
} from "@/actions/lab-pharmacy";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ─────────────────────────── helpers ─────────────────────────── */
function StockBadge({ stock }) {
  const s = Number(stock) || 0;
  const tone =
    s === 0
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : s < 50
      ? "bg-warning/10 text-warning-foreground border-warning/30"
      : "bg-success/10 text-success border-success/20";

  const Icon = s === 0 ? AlertTriangle : Package;

  return (
    <Badge
      variant="outline"
      className={cn("gap-1 font-medium tabular-nums", tone)}
    >
      <Icon className="h-3 w-3" />
      {s}
    </Badge>
  );
}

function TableSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-md bg-muted/60" />
      ))}
    </div>
  );
}

/* ─────────────────────────── main ─────────────────────────── */
export function PharmacyCatalog({ onSale } = {}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [search, setSearch] = useState("");

  // delete flow
  const [pendingDelete, setPendingDelete] = useState(null);

  // sell flow
  const [pendingSell, setPendingSell] = useState(null); // medicine object
  const [sellQty, setSellQty] = useState("");
  const [sellNote, setSellNote] = useState("");

  const { data, fn: fetchMeds, loading } = useFetch(getMedicines);
  const { fn: submitCreate, data: createData, loading: creating } =
    useFetch(createMedicine);
  const { fn: submitUpdate, data: updateData } = useFetch(updateMedicine);
  const { fn: submitReceive, data: receiveData, loading: receiving } =
    useFetch(receiveMedicineStock);
  const { fn: submitDelete, data: deleteData, loading: deleting } =
    useFetch(deleteMedicine);
  const { fn: submitSell, data: sellData, loading: selling } =
    useFetch(sellMedicine);

  const refresh = () => fetchMeds();

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (createData?.success) {
      toast.success("Medicine added");
      setName("");
      setPrice("");
      setStock("");
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createData]);

  useEffect(() => {
    if (updateData?.success) {
      toast.success("Price updated");
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateData]);

  useEffect(() => {
    if (receiveData?.success) {
      toast.success("Stock updated");
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiveData]);

  useEffect(() => {
    if (deleteData?.success) {
      toast.success("Medicine removed");
      setPendingDelete(null);
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteData]);

  useEffect(() => {
  if (sellData?.success) {
    toast.success(`Sold ${sellData.sold} unit(s) — stock updated`);
    setPendingSell(null);
    setSellQty("");
    setSellNote("");
    refresh();
    onSale?.();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [sellData, onSale]);

  const medicines = data?.medicines || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? medicines.filter((m) => m.name.toLowerCase().includes(q))
      : medicines;
  }, [medicines, search]);

  const stats = useMemo(() => {
    const total = medicines.length;
    const out = medicines.filter((m) => (m.stock || 0) === 0).length;
    const low = medicines.filter(
      (m) => (m.stock || 0) > 0 && m.stock < 50
    ).length;
    return { total, out, low };
  }, [medicines]);

  const handleSell = async () => {
    if (!pendingSell) return;
    const qty = parseInt(sellQty, 10);
    if (!qty || qty <= 0) {
      toast.error("Enter a positive quantity");
      return;
    }
    if (qty > (pendingSell.stock || 0)) {
      toast.error(
        `Only ${pendingSell.stock} in stock — cannot sell ${qty}`
      );
      return;
    }
    const fd = new FormData();
    fd.append("medicineId", pendingSell.id);
    fd.append("quantity", String(qty));
    if (sellNote.trim()) fd.append("note", sellNote.trim());
    await submitSell(fd);
  };

  return (
    <div className="space-y-4">
      {/* ── Stats ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Medicines" value={stats.total} />
        <StatCard label="Low stock (<50)" value={stats.low} tone="warning" />
        <StatCard label="Out of stock" value={stats.out} tone="danger" />
      </div>

      {/* ── Inventory card ── */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-col gap-3 border-b border-border/60 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Medicine inventory
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Update prices, receive stock, sell, and manage the catalogue.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search medicine…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 focus-ring"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading && medicines.length === 0 ? (
            <div className="p-4">
              <TableSkeleton rows={5} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {search
                ? "No medicine matches your search."
                : "No medicines yet."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Medicine</th>
                    <th className="px-4 py-3">Price (KES)</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Receive</th>
                    <th className="px-4 py-3">Sell</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <MedicineRow
                      key={m.id}
                      medicine={m}
                      onUpdate={submitUpdate}
                      onReceive={submitReceive}
                      receiving={receiving}
                      deleting={deleting}
                      onRequestDelete={() => setPendingDelete(m)}
                      onRequestSell={() => {
                        setPendingSell(m);
                        setSellQty("");
                        setSellNote("");
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* ── Add medicine footer ── */}
        <div className="border-t border-border/60 bg-muted/30 p-4">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Add medicine
          </Label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Input
              placeholder="Medicine name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 w-full sm:w-56 focus-ring"
            />
            <Input
              type="number"
              placeholder="Price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="h-9 w-28 focus-ring"
            />
            <Input
              type="number"
              placeholder="Stock"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="h-9 w-28 focus-ring"
            />
            <Button
              size="sm"
              disabled={creating || !name.trim()}
              onClick={async () => {
                const fd = new FormData();
                fd.append("name", name);
                fd.append("price", price || "0");
                fd.append("stock", stock || "0");
                await submitCreate(fd);
              }}
              className="focus-ring"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="mr-1 h-4 w-4" /> Add
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Sell dialog ── */}
      <Dialog
        open={!!pendingSell}
        onOpenChange={(open) => {
          if (!open) {
            setPendingSell(null);
            setSellQty("");
            setSellNote("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Sell {pendingSell?.name}
            </DialogTitle>
            <DialogDescription>
              Current stock:{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {pendingSell?.stock ?? 0}
              </span>{" "}
              · Price per unit:{" "}
              <span className="font-semibold tabular-nums text-foreground">
                KES {pendingSell?.price ?? 0}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="sell-qty">Quantity sold</Label>
              <Input
                id="sell-qty"
                type="number"
                min={1}
                max={pendingSell?.stock ?? 1}
                value={sellQty}
                onChange={(e) => setSellQty(e.target.value)}
                placeholder="e.g. 3"
                className="focus-ring"
                autoFocus
              />
              {sellQty && parseInt(sellQty, 10) > (pendingSell?.stock || 0) && (
                <p className="text-xs text-destructive">
                  Only {pendingSell?.stock} unit(s) available.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sell-note">
                Note <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="sell-note"
                value={sellNote}
                onChange={(e) => setSellNote(e.target.value)}
                placeholder="e.g. Patient John D."
                className="focus-ring"
              />
            </div>

            {sellQty && parseInt(sellQty, 10) > 0 && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    KES{" "}
                    {(
                      (parseInt(sellQty, 10) || 0) *
                      (pendingSell?.price || 0)
                    ).toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Stock after sale
                  </span>
                  <span className="font-medium tabular-nums text-foreground">
                    {(pendingSell?.stock || 0) - (parseInt(sellQty, 10) || 0)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={selling}
              onClick={() => {
                setPendingSell(null);
                setSellQty("");
                setSellNote("");
              }}
              className="focus-ring"
            >
              Cancel
            </Button>
            <Button
              disabled={
                selling ||
                !sellQty ||
                parseInt(sellQty, 10) <= 0 ||
                parseInt(sellQty, 10) > (pendingSell?.stock || 0)
              }
              onClick={handleSell}
              className="focus-ring"
            >
              {selling ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <ShoppingCart className="mr-1 h-4 w-4" />
              )}
              Confirm sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              Remove {pendingDelete?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will archive the medicine from your catalog. Past visits
              that reference it won&apos;t be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault();
                if (!pendingDelete) return;
                const fd = new FormData();
                fd.append("id", pendingDelete.id);
                await submitDelete(fd);
              }}
            >
              {deleting ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-4 w-4" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ─────────────────────────── row ─────────────────────────── */
function MedicineRow({
  medicine,
  onUpdate,
  onReceive,
  receiving,
  deleting,
  onRequestDelete,
  onRequestSell,
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(medicine.name || "");
  const [price, setPrice] = useState(medicine.price?.toString() || "0");
  const [qty, setQty] = useState("");

  const outOfStock = (medicine.stock || 0) <= 0;

  const cancel = () => {
    setEditing(false);
    setEditName(medicine.name || "");
    setPrice(medicine.price?.toString() || "0");
  };

  return (
    <tr className="border-b border-border/40 transition-colors hover:bg-muted/40">
      {/* Name */}
      <td className="px-4 py-3">
        {editing ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="h-8 w-44 focus-ring"
          />
        ) : (
          <span className="font-medium text-foreground">{medicine.name}</span>
        )}
      </td>

      {/* Price */}
      <td className="px-4 py-3">
        {editing ? (
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="h-8 w-24 focus-ring"
          />
        ) : (
          <span className="tabular-nums text-muted-foreground">
            {medicine.price ?? 0}
          </span>
        )}
      </td>

      {/* Stock badge */}
      <td className="px-4 py-3">
        <StockBadge stock={medicine.stock} />
      </td>

      {/* Receive stock */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            placeholder="Qty"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="h-8 w-20 focus-ring"
          />
          <Button
            size="sm"
            variant="secondary"
            className="h-8 focus-ring"
            disabled={receiving || !qty}
            onClick={async () => {
              const fd = new FormData();
              fd.append("medicineId", medicine.id);
              fd.append("quantity", qty);
              await onReceive(fd);
              setQty("");
            }}
          >
            Receive
          </Button>
        </div>
      </td>

      {/* Sell */}
      <td className="px-4 py-3">
        <Button
          size="sm"
          variant="outline"
          className="h-8 focus-ring"
          disabled={outOfStock}
          onClick={onRequestSell}
          title={outOfStock ? "No stock available" : "Sell medicine"}
        >
          <ShoppingCart className="mr-1 h-3.5 w-3.5" />
          Sell
        </Button>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {editing ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 focus-ring"
                onClick={cancel}
                aria-label="Cancel edit"
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                className="h-8 focus-ring"
                onClick={async () => {
                  const fd = new FormData();
                  fd.append("id", medicine.id);
                  fd.append("name", editName);
                  fd.append("price", price);
                  await onUpdate(fd);
                  setEditing(false);
                }}
              >
                <Check className="mr-1 h-4 w-4" /> Save
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 focus-ring"
                onClick={() => setEditing(true)}
                aria-label="Edit medicine"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={deleting}
                className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive focus-ring"
                onClick={onRequestDelete}
                aria-label="Delete medicine"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ─────────────────────────── stat card ─────────────────────────── */
function StatCard({ label, value, tone = "default" }) {
  const toneCls =
    tone === "warning"
      ? "text-warning-foreground bg-warning/10 border-warning/20"
      : tone === "danger"
      ? "text-destructive bg-destructive/10 border-destructive/20"
      : "text-foreground bg-card border-border/60";
  return (
    <div className={cn("rounded-xl border p-4 shadow-sm", toneCls)}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}