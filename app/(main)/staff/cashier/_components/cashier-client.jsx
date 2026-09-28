"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Wallet,
  Search,
  Receipt,
  Printer,
  Check,
  Loader2,
  TrendingUp,
  Users,
  AlertCircle,
  RefreshCw,
  Ban,
  CircleDollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  getPatientVisitsByStatus,
  confirmBillPaid,
  getCashierStats,
  getCashierHistory,
} from "@/actions/patient-visits";

export function CashierClient() {
  const [tab, setTab] = useState("queue");
  const [search, setSearch] = useState("");
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // review-bill dialog
  const [pendingVisit, setPendingVisit] = useState(null);
  const [billRef, setBillRef] = useState("");
  const [cashierNotes, setCashierNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // receipt dialog
  const [receiptVisit, setReceiptVisit] = useState(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [q, h, s] = await Promise.all([
        getPatientVisitsByStatus("CASHIER", search),
        getCashierHistory({ limit: 100, search }),
        getCashierStats(),
      ]);
      setQueue(q?.visits || []);
      setHistory(h?.visits || []);
      setStats(s?.stats || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const openBill = (visit) => {
    setPendingVisit(visit);
    setBillRef("");
    setCashierNotes("");
  };

  const closeBill = () => {
    setPendingVisit(null);
    setBillRef("");
    setCashierNotes("");
  };

  const handleConfirmPaid = async () => {
    if (!pendingVisit) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("visitId", pendingVisit.id);
      if (billRef) fd.append("billRef", billRef);
      if (cashierNotes) fd.append("cashierNotes", cashierNotes);
      const res = await confirmBillPaid(fd);
      if (res?.success) {
        toast.success("Payment confirmed · Bill closed");
        const snapshot = { ...pendingVisit, ...res.visit };
        closeBill();
        await refresh();
        setReceiptVisit(snapshot);
      }
    } catch {
      toast.error("Could not confirm payment");
    } finally {
      setSaving(false);
    }
  };

  const handleWaive = async () => {
    if (!pendingVisit) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("visitId", pendingVisit.id);
      fd.append("waive", "true");
      if (cashierNotes) fd.append("cashierNotes", cashierNotes);
      const res = await confirmBillPaid(fd);
      if (res?.success) {
        toast.success("Bill waived");
        closeBill();
        await refresh();
      }
    } catch {
      toast.error("Could not waive");
    } finally {
      setSaving(false);
    }
  };

  const printReceipt = (visit) => {
    const content = document.getElementById("cashier-receipt-print")?.innerHTML;
    if (!content) {
      toast.error("Receipt not ready");
      return;
    }
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Bill - ${visit.fullName}</title>
          <script src="https://cdn.tailwindcss.com"><\/script>
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              @page { margin: 0; size: auto; }
            }
            body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: white; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    setTimeout(() => {
      win.focus();
      win.print();
    }, 500);
  };

  const filteredQueue = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return queue;
    return queue.filter(
      (v) =>
        v.fullName?.toLowerCase().includes(q) ||
        v.idNumber?.toLowerCase().includes(q) ||
        v.phoneNumber?.toLowerCase().includes(q)
    );
  }, [queue, search]);

  return (
    <div className="space-y-6">
      {/* ── Hero strip ── */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-lime-500/10 text-emerald-400">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Collected today
            </p>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              KES {(stats?.todayRevenue || 0).toLocaleString()}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({stats?.todayTxns || 0} txns)
              </span>
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={loading}
          className="focus-ring"
        >
          {loading ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Today"
          value={`KES ${(stats?.todayRevenue || 0).toLocaleString()}`}
          sub={`${stats?.todayTxns || 0} paid`}
          icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
          tone="emerald"
        />
        <KpiCard
          label="This week"
          value={`KES ${(stats?.weekRevenue || 0).toLocaleString()}`}
          sub={`${stats?.weekTxns || 0} paid`}
          icon={<TrendingUp className="h-4 w-4 text-sky-400" />}
          tone="sky"
        />
        <KpiCard
          label="This month"
          value={`KES ${(stats?.monthRevenue || 0).toLocaleString()}`}
          sub={`${stats?.monthTxns || 0} paid`}
          icon={<TrendingUp className="h-4 w-4 text-violet-400" />}
          tone="violet"
        />
        <KpiCard
          label="Waiting"
          value={String(stats?.waiting || 0)}
          sub={`${stats?.unpaid || 0} unpaid`}
          icon={<AlertCircle className="h-4 w-4 text-amber-400" />}
          tone="amber"
        />
      </div>

      {/* ── Tabs ── */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
            <TabsTrigger value="queue" className="gap-2">
              <Users className="h-4 w-4" />
              Queue
              {(stats?.waiting || 0) > 0 && (
                <Badge
                  variant="outline"
                  className="ml-1 h-5 bg-amber-500/10 px-1.5 text-[10px] text-amber-400 border-amber-500/30"
                >
                  {stats.waiting}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Receipt className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, ID, or ref…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 focus-ring"
            />
          </div>
        </div>

        {/* ── Queue tab ── */}
        <TabsContent value="queue" className="mt-4">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="border-b border-border/60">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Users className="h-4 w-4 text-emerald-400" />
                Patients waiting for their bill
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                The bill already totals all services from doctor, lab, and
                pharmacy. Confirm payment to close the visit.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <SkeletonRows />
              ) : filteredQueue.length === 0 ? (
                <EmptyState
                  icon={<Check className="h-6 w-6 text-emerald-400" />}
                  title="Queue is clear"
                  subtitle="No one is waiting for their bill."
                />
              ) : (
                <ul className="divide-y divide-border/40">
                  {filteredQueue.map((v) => (
                    <li
                      key={v.id}
                      className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-lime-500/10 text-sm font-semibold text-emerald-400">
                          {v.fullName?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {v.fullName}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
                            ID {v.idNumber || "—"} · {v.phoneNumber || "—"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5 text-right">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Bill
                          </p>
                          <p className="text-sm font-semibold tabular-nums text-foreground">
                            KES{" "}
                            {(
                              v.billSubtotal ??
                              v.totalPrice ??
                              0
                            ).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          onClick={() => openBill(v)}
                          className="focus-ring"
                        >
                          <CircleDollarSign className="mr-1 h-4 w-4" />
                          Review bill
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── History tab ── */}
        <TabsContent value="history" className="mt-4">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="border-b border-border/60">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Receipt className="h-4 w-4 text-primary" />
                Paid bills
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <SkeletonRows rows={3} />
              ) : history.length === 0 ? (
                <EmptyState
                  icon={<Receipt className="h-6 w-6 text-muted-foreground/60" />}
                  title="No paid bills yet"
                  subtitle="Completed transactions will appear here."
                />
              ) : (
                <ul className="divide-y divide-border/40">
                  {history.map((v) => (
                    <li
                      key={v.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {v.fullName}
                        </p>
                        <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                          {v.billPaidAt
                            ? format(new Date(v.billPaidAt), "MMM d, HH:mm")
                            : "—"}
                          {v.billRef && ` · ${v.billRef}`}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="tabular-nums border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      >
                        KES{" "}
                        {(v.billSubtotal ?? v.totalPrice ?? 0).toLocaleString()}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReceiptVisit(v)}
                        className="focus-ring"
                        aria-label="Open receipt"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Review bill dialog ── */}
      {pendingVisit && !receiptVisit && (
        <BillDialog
          visit={pendingVisit}
          billRef={billRef}
          setBillRef={setBillRef}
          cashierNotes={cashierNotes}
          setCashierNotes={setCashierNotes}
          onClose={closeBill}
          onConfirm={handleConfirmPaid}
          onWaive={handleWaive}
          saving={saving}
        />
      )}

      {/* ── Receipt preview dialog ── */}
      {receiptVisit && (
        <ReceiptDialog
          visit={receiptVisit}
          onClose={() => setReceiptVisit(null)}
          onPrint={() => printReceipt(receiptVisit)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════ Bill dialog ═══════════════════════════ */
function BillDialog({
  visit,
  billRef,
  setBillRef,
  cashierNotes,
  setCashierNotes,
  onClose,
  onConfirm,
  onWaive,
  saving,
}) {
  const items = Array.isArray(visit.billItems) ? visit.billItems : [];
  const subtotal =
    visit.billSubtotal ??
    items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Review bill · {visit.fullName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Service</th>
                  <th className="px-3 py-2 text-left">Dept</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-4 text-center text-xs text-muted-foreground"
                    >
                      No line items — bill is 0.
                    </td>
                  </tr>
                ) : (
                  items.map((it, i) => (
                    <tr key={i} className="border-t border-border/40">
                      <td className="px-3 py-2 text-foreground">
                        {it.label}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {it.dept}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-foreground">
                        {(parseFloat(it.amount) || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="border-t border-border/60 bg-muted/30">
                <tr>
                  <td
                    colSpan={2}
                    className="px-3 py-2 text-right text-xs uppercase tracking-wider text-muted-foreground"
                  >
                    Total
                  </td>
                  <td className="px-3 py-2 text-right text-base font-semibold tabular-nums text-foreground">
                    KES {subtotal.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="space-y-2">
            <Label>Reference (optional)</Label>
            <Input
              value={billRef}
              onChange={(e) => setBillRef(e.target.value)}
              placeholder="e.g. M-Pesa code, receipt #"
              className="focus-ring"
            />
          </div>

          <div className="space-y-2">
            <Label>Cashier notes (optional)</Label>
            <Input
              value={cashierNotes}
              onChange={(e) => setCashierNotes(e.target.value)}
              placeholder="Any remarks…"
              className="focus-ring"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={onClose} className="focus-ring">
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={onWaive}
            disabled={saving}
            className="focus-ring text-amber-400"
          >
            <Ban className="mr-1 h-4 w-4" />
            Waive
          </Button>
          <Button
            onClick={onConfirm}
            disabled={saving}
            className="focus-ring"
          >
            {saving ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-1 h-4 w-4" />
            )}
            Confirm paid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════ Receipt dialog ═══════════════════════════ */
function ReceiptDialog({ visit, onClose, onPrint }) {
  const items = Array.isArray(visit.billItems) ? visit.billItems : [];
  const subtotal =
    visit.billSubtotal ??
    items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receipt · {visit.fullName}</DialogTitle>
        </DialogHeader>

        <div
          id="cashier-receipt-print"
          className="overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm"
        >
          {/* Header */}
          <div className="border-b-4 border-emerald-600 px-6 py-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="Neemah"
                  className="h-14 w-14 object-contain"
                />
                <div>
                  <h1 className="text-xl font-bold leading-none tracking-tight text-blue-700">
                    Neemah
                  </h1>
                  <h2 className="text-base font-bold leading-none text-emerald-600">
                    Medical Centre
                  </h2>
                  <p className="mt-1 text-[10px] italic text-blue-500">
                    — Your Health, Our Priority —
                  </p>
                </div>
              </div>
              <div className="space-y-0.5 text-right text-[10px] text-slate-700">
                <p>📍 Mogotio, Baringo, Kenya</p>
                <p>📞 0180 363 450 / +254 792 195 454</p>
                <p>✉️ neemahmedical@gmail.com</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-4 px-6 py-5 text-sm">
            <div className="text-center">
              <h3 className="inline-block border-b-2 border-emerald-600 pb-1 text-base font-bold uppercase tracking-wider text-slate-800">
                Patient Bill / Receipt
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-500">
                  Patient
                </p>
                <p className="font-bold text-slate-900">{visit.fullName}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase text-slate-500">
                  Date
                </p>
                <p className="font-bold text-slate-900">
                  {visit.billPaidAt
                    ? format(new Date(visit.billPaidAt), "PPP")
                    : format(new Date(), "PPP")}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-500">
                  ID Number
                </p>
                <p className="font-semibold text-slate-800">
                  {visit.idNumber || "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase text-slate-500">
                  Phone
                </p>
                <p className="font-semibold text-slate-800">
                  {visit.phoneNumber || "—"}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 border-l-4 border-emerald-500 pl-2 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                Services & Charges
              </p>
              <table className="w-full border border-slate-200 text-xs">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border-b border-slate-200 px-2 py-1.5 text-left text-slate-600">
                      Service
                    </th>
                    <th className="border-b border-slate-200 px-2 py-1.5 text-left text-slate-600">
                      Department
                    </th>
                    <th className="border-b border-slate-200 px-2 py-1.5 text-right text-slate-600">
                      Amount (KES)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-2 py-3 text-center text-slate-500"
                      >
                        No charges recorded.
                      </td>
                    </tr>
                  ) : (
                    items.map((it, i) => (
                      <tr key={i}>
                        <td className="border-b border-slate-100 px-2 py-1.5 text-slate-800">
                          {it.label}
                        </td>
                        <td className="border-b border-slate-100 px-2 py-1.5 text-slate-500">
                          {it.dept}
                        </td>
                        <td className="border-b border-slate-100 px-2 py-1.5 text-right font-medium tabular-nums text-slate-800">
                          {(parseFloat(it.amount) || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100">
                    <td
                      colSpan={2}
                      className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600"
                    >
                      Total
                    </td>
                    <td className="px-2 py-2 text-right text-base font-bold tabular-nums text-slate-900">
                      {subtotal.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                {visit.billPaid ? "PAID" : "UNPAID"}
              </p>
              {visit.billRef && (
                <p className="mt-0.5 text-[10px] text-emerald-700">
                  Ref: {visit.billRef}
                </p>
              )}
            </div>

            {visit.cashierNotes && (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                <span className="font-semibold">Note: </span>
                {visit.cashierNotes}
              </div>
            )}

            <p className="pt-2 text-center text-[10px] italic text-slate-400">
              Thank you for visiting Neemah Medical Centre
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onClose} className="focus-ring">
            Close
          </Button>
          <Button onClick={onPrint} className="focus-ring">
            <Printer className="mr-1 h-4 w-4" />
            Print receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════ Small helpers ═══════════════════════════ */
function KpiCard({ label, value, sub, icon, tone = "default" }) {
  const toneCls =
    tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : tone === "sky"
      ? "border-sky-500/30 bg-sky-500/5"
      : tone === "violet"
      ? "border-violet-500/30 bg-violet-500/5"
      : tone === "amber"
      ? "border-amber-500/30 bg-amber-500/5"
      : "border-border/60 bg-card";
  return (
    <div className={cn("rounded-xl border p-4 shadow-sm", toneCls)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {icon}
      </div>
      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
      )}
    </div>
  );
}

function SkeletonRows({ rows = 4 }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/60" />
      ))}
    </div>
  );
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center gap-2 p-10 text-center">
      {icon}
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}