"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  ClipboardCheck,
  Printer,
  CalendarDays,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { DepartmentQueue } from "../../_components/department-queue";
import {
  getReceptionStats,
  getReadyReceipts,
  markReceiptPrinted,
} from "@/actions/patient-visits";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function ReceptionClient() {
  const [clock, setClock] = useState(new Date());
  const [tab, setTab] = useState("waiting");

  const { data: statsData, fn: fetchStats, loading: loadingStats } =
    useFetch(getReceptionStats);
  const {
    data: receiptsData,
    fn: fetchReceipts,
    loading: loadingReceipts,
  } = useFetch(getReadyReceipts);
  const { fn: submitPrinted, data: printedData } = useFetch(
    markReceiptPrinted
  );

  useEffect(() => {
    fetchStats();
    fetchReceipts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live clock (updates every 30s — enough for a header)
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Refresh when a receipt is marked printed
  useEffect(() => {
    if (printedData?.success) {
      toast.success("Receipt marked as printed");
      fetchReceipts();
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printedData]);

  const stats = statsData?.stats || {
    today: 0,
    week: 0,
    waiting: 0,
    readyReceipts: 0,
  };
  const receipts = receiptsData?.visits || [];

  return (
    <div className="space-y-6">
      {/* ── Hero strip: clock + refresh ── */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Current time
            </p>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {format(clock, "EEEE, MMMM d · HH:mm")}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            fetchStats();
            fetchReceipts();
            toast.success("Refreshed");
          }}
          className="focus-ring"
        >
          <RefreshCw className="mr-1 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Registered today"
          value={stats.today}
          icon={<Users className="h-4 w-4 text-primary" />}
          loading={loadingStats}
        />
        <KpiCard
          label="Waiting now"
          value={stats.waiting}
          icon={<ClipboardCheck className="h-4 w-4 text-warning" />}
          tone="warning"
          loading={loadingStats}
        />
        <KpiCard
          label="This week"
          value={stats.week}
          icon={<CalendarDays className="h-4 w-4 text-primary" />}
          loading={loadingStats}
        />
        <KpiCard
          label="Ready for pickup"
          value={stats.readyReceipts}
          icon={<Printer className="h-4 w-4 text-success" />}
          tone="success"
          loading={loadingStats}
        />
      </div>

      {/* ── Tabs: Waiting / History / Ready for pickup ── */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-flex">
          <TabsTrigger value="waiting" className="gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Waiting
            {stats.waiting > 0 && (
              <Badge
                variant="outline"
                className="ml-1 h-5 bg-warning/10 px-1.5 text-[10px] text-warning-foreground border-warning/30"
              >
                {stats.waiting}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Users className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="receipts" className="gap-2">
            <Printer className="h-4 w-4" />
            Ready for pickup
            {stats.readyReceipts > 0 && (
              <Badge
                variant="outline"
                className="ml-1 h-5 bg-success/10 px-1.5 text-[10px] text-success border-success/30"
              >
                {stats.readyReceipts}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="waiting" className="mt-4">
          <DepartmentQueue
            title="Registered patients"
            currentStatus="REGISTERED"
            notesField="triageNotes"
            canRegister={true}
            canDelete={true}
            canSendAnywhere={true}
            hideHistory
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <DepartmentQueue
            title="Reception history"
            currentStatus="REGISTERED"
            notesField="triageNotes"
            canRegister={false}
            canDelete={false}
            canSendAnywhere={false}
            historyOnly
          />
        </TabsContent>

        <TabsContent value="receipts" className="mt-4">
          <ReadyReceiptsCard
            receipts={receipts}
            loading={loadingReceipts}
            onPrint={async (visit) => {
              const fd = new FormData();
              fd.append("visitId", visit.id);
              await submitPrinted(fd);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─────────────────────────── KPI ─────────────────────────── */
function KpiCard({ label, value, icon, tone = "default", loading }) {
  const toneCls =
    tone === "warning"
      ? "border-warning/30 bg-warning/5"
      : tone === "success"
      ? "border-success/30 bg-success/5"
      : "border-border/60 bg-card";
  return (
    <div className={cn("rounded-xl border p-4 shadow-sm", toneCls)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {icon}
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
        {loading ? (
          <span className="inline-block h-7 w-10 animate-pulse rounded bg-muted/60" />
        ) : (
          value
        )}
      </p>
    </div>
  );
}

/* ─────────────────────────── Ready receipts ─────────────────────────── */
function ReadyReceiptsCard({ receipts, loading, onPrint }) {
  const [printingId, setPrintingId] = useState(null);

  const handlePrint = async (visit) => {
    setPrintingId(visit.id);
    try {
      const content = document.getElementById("receipt-print");
      // fall back: just mark as printed if no inline preview is available
      await onPrint(visit);
    } finally {
      setPrintingId(null);
    }
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="border-b border-border/60">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Printer className="h-4 w-4 text-primary" />
          Receipts ready for pickup
        </CardTitle>
        <p className="mt-0.5 text-xs text-muted-foreground">
          These patients have completed their visit and are waiting to collect
          a printed receipt.
        </p>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-lg bg-muted/60"
              />
            ))}
          </div>
        ) : receipts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm font-medium text-foreground">
              No receipts waiting
            </p>
            <p className="text-xs text-muted-foreground">
              When pharmacy sends a patient back, their receipt will appear
              here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {receipts.map((visit) => (
              <li
                key={visit.id}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {visit.fullName?.[0]?.toUpperCase() || "?"}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {visit.fullName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
                    ID {visit.idNumber || "—"} · {visit.phoneNumber || "—"}
                  </p>
                </div>

                <Badge
                  variant="outline"
                  className="bg-success/10 text-success border-success/20"
                >
                  Ready
                </Badge>

                <Button
                  size="sm"
                  disabled={printingId === visit.id}
                  onClick={() => handlePrint(visit)}
                  className="focus-ring"
                >
                  {printingId === visit.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Printer className="mr-1 h-3.5 w-3.5" />
                      Mark printed
                    </>
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}