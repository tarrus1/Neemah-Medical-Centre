"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Loader2, Inbox } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getNotificationCount,
  getLatestNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/actions/patient-visits";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const ROLE_TO_PATH = {
  RECEPTIONIST: "/staff/reception",
  TRIAGE: "/staff/triage",
  DOCTOR: "/staff/doctor",
  LABORATORY: "/staff/laboratory",
  PHARMACY: "/staff/pharmacy",
  CASHIER: "/staff/cashier",
};

export default function NotificationBell({ userRole }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  /* ─── Refresh count (cheap) ─── */
  const refreshCount = useCallback(async () => {
    if (!userRole || !ROLE_TO_PATH[userRole]) return;
    try {
      const res = await getNotificationCount(userRole);
      setCount(res?.count ?? 0);
    } catch {
      setCount(0);
    }
  }, [userRole]);

  /* ─── Refresh list (full) ─── */
  const refreshList = useCallback(async () => {
    if (!userRole || !ROLE_TO_PATH[userRole]) return;
    setLoadingList(true);
    try {
      const res = await getLatestNotifications(userRole, 8);
      setItems(res?.notifications ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoadingList(false);
    }
  }, [userRole]);

  /* ─── Poll every 10s + refetch on tab focus ─── */
  useEffect(() => {
    if (!userRole || !ROLE_TO_PATH[userRole]) return;

    // run once immediately
    refreshCount();

    const interval = setInterval(refreshCount, 10_000);

    const onFocus = () => refreshCount();
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshCount();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userRole, refreshCount]);

  /* ─── When dropdown opens, fetch fresh list + count ─── */
  useEffect(() => {
    if (!open) return;
    refreshList();
    refreshCount();
  }, [open, refreshList, refreshCount]);

  /* ─── Actions ─── */
  const handleOpenItem = async (n) => {
    try {
      const fd = new FormData();
      fd.append("id", n.id);
      await markNotificationRead(fd);
    } catch {
      // silent — the navigation below still works
    }

    // optimistically remove from UI
    setItems((prev) => prev.filter((x) => x.id !== n.id));
    setCount((c) => Math.max(0, c - 1));
    setOpen(false);

    const path = ROLE_TO_PATH[userRole] || "/staff";
    router.push(`${path}?visit=${n.visitId}`);
    setTimeout(refreshCount, 400);
  };

  const handleDismiss = async (e, n) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append("id", n.id);
      await markNotificationRead(fd);
    } catch {
      // silent
    }
    setItems((prev) => prev.filter((x) => x.id !== n.id));
    setCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAll = async (e) => {
    e.preventDefault();
    setMarkingAll(true);
    try {
      await markAllNotificationsRead(userRole);
      toast.success("All notifications marked as read");
      setItems([]);
      setCount(0);
    } catch {
      toast.error("Couldn't mark all as read");
    } finally {
      setMarkingAll(false);
    }
  };

  if (!userRole || !ROLE_TO_PATH[userRole]) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-11 w-11 focus-ring"
          aria-label="Notifications"
        >
          <Bell className="h-6 w-6" strokeWidth={2} />

          {count > 0 && (
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5",
                "bg-destructive text-[11px] font-bold leading-none text-destructive-foreground",
                "ring-2 ring-background"
              )}
            >
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
          <span className="text-sm font-semibold">Notifications</span>
          {count > 0 ? (
            <Badge
              variant="outline"
              className="tabular-nums text-[10px] bg-destructive/10 text-destructive border-destructive/20"
            >
              {count} new
            </Badge>
          ) : (
            <Badge variant="outline" className="tabular-nums text-[10px]">
              All read
            </Badge>
          )}
        </DropdownMenuLabel>

        {loadingList && items.length === 0 ? (
          <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-3 py-8 text-center">
            <Inbox className="h-6 w-6 text-muted-foreground/60" />
            <p className="text-sm font-medium text-foreground">All caught up</p>
            <p className="text-xs text-muted-foreground">
              No new notifications.
            </p>
          </div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto">
            {items.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onSelect={(e) => {
                  e.preventDefault();
                  handleOpenItem(n);
                }}
                className="flex cursor-pointer items-start gap-3 px-3 py-2.5 focus:bg-muted/60"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {n.visit?.fullName?.[0]?.toUpperCase() || "?"}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {n.visit?.fullName || "Patient"}
                  </p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {n.message}
                  </p>
                  <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                    {format(new Date(n.createdAt), "MMM d, HH:mm")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleDismiss(e, n)}
                  className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="Mark as read"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuItem>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={handleMarkAll}
              disabled={markingAll}
              className="cursor-pointer justify-center gap-2 px-3 py-2 text-xs font-medium text-primary focus:bg-primary/5"
            >
              {markingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Mark all as read
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}