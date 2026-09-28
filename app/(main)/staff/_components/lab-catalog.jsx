"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Pencil,
  X,
  Check,
  FlaskConical,
  Search,
  Trash2,
} from "lucide-react";
import {
  getLabTests,
  createLabTest,
  updateLabTest,
  deleteLabTest,
} from "@/actions/lab-pharmacy";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DEFAULT_LAB_TESTS = [
  "Fhg",
  "Pregnancy test",
  "Bs for malaria",
  "H.pylori",
  "HIV",
  "Syphilis",
  "Urinalysis",
  "Blood sugar",
  "Typhoid",
];

export function LabCatalog() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState(
    DEFAULT_LAB_TESTS.map((n) => ({
      id: `default-${n}`,
      name: n,
      price: "",
      result: "",
      fromDb: false,
    }))
  );

  // delete flow
  const [pendingDelete, setPendingDelete] = useState(null);

  const { data, fn: fetchTests, loading } = useFetch(getLabTests);
  const { fn: submitCreate, data: createData, loading: creating } =
    useFetch(createLabTest);
  const { fn: submitUpdate, data: updateData, loading: updating } =
    useFetch(updateLabTest);
  const { fn: submitDelete, data: deleteData, loading: deleting } =
    useFetch(deleteLabTest);

  useEffect(() => {
    fetchTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!data?.tests) return;
    const byName = Object.fromEntries(
      data.tests.map((t) => [t.name.toLowerCase(), t])
    );
    setRows((prev) => {
      const defaults = DEFAULT_LAB_TESTS.map((n) => {
        const db = byName[n.toLowerCase()];
        const old = prev.find((r) => r.name === n);
        return {
          id: db?.id || `default-${n}`,
          name: n,
          price: old?.price ?? (db?.price != null ? String(db.price) : ""),
          result: old?.result ?? "",
          fromDb: !!(db && !String(db.id).startsWith("default-")),
        };
      });
      const custom = data.tests
        .filter(
          (t) =>
            !DEFAULT_LAB_TESTS.some(
              (d) => d.toLowerCase() === t.name.toLowerCase()
            )
        )
        .map((t) => {
          const old = prev.find((r) => r.id === t.id || r.name === t.name);
          return {
            id: t.id,
            name: t.name,
            price: old?.price ?? String(t.price ?? ""),
            result: old?.result ?? "",
            fromDb: true,
          };
        });
      return [...defaults, ...custom];
    });
  }, [data]);

  useEffect(() => {
    if (createData?.success) {
      toast.success("Lab service added");
      setName("");
      setPrice("");
      fetchTests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createData]);

  useEffect(() => {
    if (updateData?.success) {
      toast.success("Test updated");
      fetchTests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateData]);

  useEffect(() => {
    if (deleteData?.success) {
      toast.success("Test removed");
      setPendingDelete(null);
      fetchTests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteData]);

  const updateRow = (index, field, value) =>
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;
  }, [rows, search]);

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-col gap-3 border-b border-border/60 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <FlaskConical className="h-4 w-4 text-primary" />
            Lab tests
          </CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Default tests always appear. Set a price to save them permanently.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search test…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 focus-ring"
          />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading && rows.length === 0 ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-md bg-muted/60"
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Test</th>
                  <th className="px-4 py-3 min-w-[180px]">Result</th>
                  <th className="px-4 py-3">Price (KES)</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, index) => (
                  <LabRow
                    key={row.id}
                    row={row}
                    index={index}
                    onUpdate={submitUpdate}
                    onCreate={submitCreate}
                    onLocalChange={updateRow}
                    isSaved={row.fromDb && !String(row.id).startsWith("default-")}
                    updating={updating}
                    deleting={deleting}
                    onRequestDelete={() => setPendingDelete(row)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add new */}
        <div className="border-t border-border/60 bg-muted/30 p-4">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Add new lab service
          </Label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="New test name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="focus-ring"
            />
            <Input
              type="number"
              placeholder="Price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="focus-ring sm:w-36"
            />
            <Button
              disabled={creating || !name.trim()}
              onClick={async () => {
                const fd = new FormData();
                fd.append("name", name);
                fd.append("price", price || "0");
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
      </CardContent>

      {/* Delete confirmation */}
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
              This will archive the test from your catalog. Historical
              results that reference it won&apos;t be affected. Default
              tests cannot be removed.
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
                if (String(pendingDelete.id).startsWith("default-")) {
                  toast.error("Default tests cannot be deleted");
                  setPendingDelete(null);
                  return;
                }
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
    </Card>
  );
}

/* ─────────────────────────── row ─────────────────────────── */
function LabRow({
  row,
  index,
  onUpdate,
  onCreate,
  onLocalChange,
  isSaved,
  updating,
  deleting,
  onRequestDelete,
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(row.name);
  const [editPrice, setEditPrice] = useState(row.price || "");

  const hasPrice = Number(row.price) > 0;
  const canDelete = isSaved; // defaults are virtual, no DB row to archive

  const cancel = () => {
    setEditing(false);
    setEditName(row.name);
    setEditPrice(row.price || "");
  };

  const save = async () => {
    const fd = new FormData();
    if (isSaved) {
      fd.append("id", row.id);
      fd.append("name", editName);
      fd.append("price", editPrice || "0");
      await onUpdate(fd);
    } else {
      fd.append("name", editName);
      fd.append("price", editPrice || "0");
      await onCreate(fd);
    }
    setEditing(false);
  };

  return (
    <tr className="border-b border-border/40 transition-colors hover:bg-muted/40">
      {/* Test name */}
      <td className="px-4 py-3">
        {editing ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="h-8 w-full min-w-[160px] focus-ring"
          />
        ) : (
          <span className="font-medium text-foreground">{row.name}</span>
        )}
      </td>

      {/* Result (always editable — it's per-patient) */}
      <td className="px-4 py-3">
        <Input
          value={row.result}
          onChange={(e) => onLocalChange(index, "result", e.target.value)}
          placeholder="Enter result"
          className="h-8 w-full min-w-[160px] focus-ring"
        />
      </td>

      {/* Price */}
      <td className="px-4 py-3">
        {editing ? (
          <Input
            type="number"
            value={editPrice}
            onChange={(e) => setEditPrice(e.target.value)}
            className="h-8 w-24 focus-ring"
          />
        ) : (
          <Badge
            variant="outline"
            className={cn(
              "tabular-nums font-medium",
              hasPrice
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-muted text-muted-foreground border-border"
            )}
          >
            {hasPrice ? `KES ${row.price}` : "Not priced"}
          </Badge>
        )}
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
                disabled={updating || !editName.trim()}
                onClick={save}
              >
                {updating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="mr-1 h-4 w-4" /> Save
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 focus-ring"
                onClick={() => setEditing(true)}
                aria-label="Edit test"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              {canDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={deleting}
                  className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive focus-ring"
                  onClick={onRequestDelete}
                  aria-label="Delete test"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}