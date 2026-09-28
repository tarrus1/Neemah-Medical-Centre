"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Loader2,
  ArrowRight,
  Trash2,
  Bell,
  Check,
  MessageCircle,
  Send,
  User,
  ClipboardList,
  FlaskConical,
  Pill,
  Stethoscope,
  Activity,
  Printer,
} from "lucide-react";
import {
  getPatientVisitsByStatus,
  getDepartmentHistory,
  updatePatientVisit,
  sendToNextStage,
  deletePatientVisit,
  createPatientVisit,
  getNotifications,
  markNotificationRead,
  editPatientVisitDetails,
  generateReceipt,
  markReceiptPrinted,
  sendPatientMessage,
  getPatientMessages,
} from "@/actions/patient-visits";
import { getLabTests } from "@/actions/lab-pharmacy";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils"; import {
  VITAL_SERVICES,
  LAB_SERVICES,
  SERVICES_BY_DEPARTMENT,
} from "@/lib/services";
import { useRouter, useSearchParams } from "next/navigation";

function defaultChargeLabel(status) {
  switch (status) {
    case "TRIAGE":     return "Triage";
    case "DOCTOR":     return "Consultation";
    case "LABORATORY": return "Laboratory test";
    case "PHARMACY":   return "Dispensing";
    default:           return "Service";
  }
}

const ALL_STAGES = [
  { value: "REGISTERED", label: "Reception" },
  { value: "TRIAGE", label: "Triage" },
  { value: "DOCTOR", label: "Doctor" },
  { value: "LABORATORY", label: "Laboratory" },
  { value: "PHARMACY", label: "Pharmacy" },
  { value: "CASHIER", label: "Cashier" },
  { value: "COMPLETED", label: "Completed" },
];

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

// ── Role-driven config: which tab shows what ──
const ROLE_CONFIG = {
  REGISTERED: { actionLabel: "Patient", icon: User, showVitals: false, showTreatment: false, showLab: false, showMedicines: false, showPrice: false, showReceipt: true, showPatientEdit: true },
  TRIAGE: { actionLabel: "Vitals", icon: Activity, showVitals: true, showTreatment: false, showLab: false, showMedicines: false, showPrice: false, showReceipt: false, showPatientEdit: false },
  DOCTOR: { actionLabel: "Treatment", icon: Stethoscope, showVitals: false, showTreatment: true, showLab: false, showMedicines: true, showPrice: false, showReceipt: false, showPatientEdit: false },
  LABORATORY: { actionLabel: "Lab tests", icon: FlaskConical, showVitals: false, showTreatment: false, showLab: true, showMedicines: false, showPrice: false, showReceipt: false, showPatientEdit: false },
  PHARMACY: { actionLabel: "Dispense", icon: Pill, showVitals: false, showTreatment: true, showLab: false, showMedicines: true, showPrice: true, showReceipt: true, showPatientEdit: false },
};

function getAge(visit) {
  if (!visit) return null;
  const now = new Date();
  if (visit.dateOfBirth) {
    const dob = new Date(visit.dateOfBirth);
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    return age >= 0 ? age : null;
  }
  if (visit.birthYear) return now.getFullYear() - visit.birthYear;
  return null;
}

export function DepartmentQueue({
  title,
  currentStatus,
  canRegister = false,
  canDelete = false,
  showPrice: showPriceProp = false,
  notesField,
  canSendAnywhere = true,
  hideHistory = false,
  historyOnly = false,
}) {
  const cfg = ROLE_CONFIG[currentStatus] || ROLE_CONFIG.REGISTERED;

  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [dialogTab, setDialogTab] = useState("overview");
  const [notes, setNotes] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [sendTo, setSendTo] = useState("");
  const [message, setMessage] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthInput, setBirthInput] = useState("");
  const [gender, setGender] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editIdNumber, setEditIdNumber] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [treatmentText, setTreatmentText] = useState("");
  const [medicines, setMedicines] = useState([{ name: "", dose: "", available: true }]);
  const [bpSystolic, setBpSystolic] = useState("");
  const [bpDiastolic, setBpDiastolic] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [temperature, setTemperature] = useState("");
  const [spo2, setSpo2] = useState("");
  const [labRows, setLabRows] = useState([]);
  const [labPick, setLabPick] = useState("");
  const [selectedReferrals, setSelectedReferrals] = useState([]);
  // ── Bill charge (per-department amount) ──
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeLabel, setChargeLabel] = useState("");

  // ── 2. Now that selectedVisit exists, derive referrals ──
  const requestedKeys = useMemo(() => {
    if (!selectedVisit) return null;
    const refs = selectedVisit.referrals;
    if (!Array.isArray(refs) || refs.length === 0) return null;
    return refs;
  }, [selectedVisit]);

  const visibleVitalKeys = useMemo(() => {
    if (!cfg.showVitals) return [];
    if (!requestedKeys) return ["BP", "PULSE", "RR", "TEMP", "SPO2"];
    return ["BP", "PULSE", "RR", "TEMP", "SPO2"].filter((k) =>
      requestedKeys.includes(k)
    );
  }, [cfg.showVitals, requestedKeys]);

  const requestedLabNames = useMemo(() => {
    if (!cfg.showLab) return null;
    if (!requestedKeys) return null;
    return requestedKeys;
  }, [cfg.showLab, requestedKeys]);


  const { loading, data, fn: fetchCurrent } = useFetch(getPatientVisitsByStatus);
  const { loading: loadingHistory, data: historyData, fn: fetchHistory } = useFetch(getDepartmentHistory);
  const { data: notifData, fn: fetchNotifs } = useFetch(getNotifications);
  const { loading: markingRead, fn: submitMarkRead, data: markReadData } = useFetch(markNotificationRead);
  const { loading: updating, fn: submitUpdate, data: updateData } = useFetch(updatePatientVisit);
  const { loading: deleting, fn: submitDelete, data: deleteData } = useFetch(deletePatientVisit);
  const { loading: creating, fn: submitCreate, data: createData } = useFetch(createPatientVisit);
  const { loading: editing, fn: submitEdit, data: editData } = useFetch(editPatientVisitDetails);
  const { loading: generatingReceipt, fn: submitGenerateReceipt, data: receiptData } = useFetch(generateReceipt);
  const { loading: markingPrinted, fn: submitMarkPrinted, data: printedData } = useFetch(markReceiptPrinted);
  const { loading: sendingMsg, fn: submitSendMessage, data: sendMsgData } = useFetch(sendPatientMessage);
  const { data: msgHistoryData, fn: fetchMessages } = useFetch(getPatientMessages);
  const { data: labTestsData, fn: fetchLabTests } = useFetch(getLabTests);

  const refresh = () => {
    fetchCurrent(currentStatus, searchTerm);
    fetchHistory(currentStatus, searchTerm);
    fetchNotifs(currentStatus);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [currentStatus, searchTerm]);
  useEffect(() => { if (cfg.showLab) fetchLabTests(); /* eslint-disable-next-line */ }, [cfg.showLab]);
  useEffect(() => { if (markReadData?.success) fetchNotifs(currentStatus); /* eslint-disable-next-line */ }, [markReadData]);

  useEffect(() => {
    if (updateData?.success || sendMsgData?.success || deleteData?.success || createData?.success || editData?.success || receiptData?.success || printedData?.success) {
      toast.success("Updated successfully");
      setSelectedVisit(null);
      setShowRegister(false);
      setIsEditing(false);
      setFirstName(""); setMiddleName(""); setLastName(""); setBirthInput("");
      setGender(""); setMedicalHistory(""); setIdNumber(""); setPhoneNumber("");
      setSendTo(""); setMessage(""); setTreatmentText("");
      setMedicines([{ name: "", dose: "", available: true }]);
      setBpSystolic(""); setBpDiastolic(""); setHeartRate("");
      setRespiratoryRate(""); setTemperature(""); setSpo2("");
      setLabRows([]); setLabPick("");
      setSelectedReferrals([]);
      refresh();
    }
    // eslint-disable-next-line
  }, [updateData, sendMsgData, deleteData, createData, editData, receiptData, printedData]);

  const buildLabRowsFromCatalog = (tests, existingNotes = "") => {
    const list = tests?.length > 0 ? tests : DEFAULT_LAB_TESTS.map((name) => ({ name, price: 0, id: `default-${name}` }));
    const noteMap = {};
    if (existingNotes) {
      existingNotes.split("\n").forEach((line) => {
        const m = line.match(/^(.+?):\s*(.*?)\s*\(KES\s*([\d.]+)\)/i);
        if (m) noteMap[m[1].trim().toLowerCase()] = { result: m[2].trim() === "—" ? "" : m[2].trim(), price: m[3] };
      });
    }
    return list.map((t) => {
      const prev = noteMap[t.name.toLowerCase()];
      return { id: t.id, name: t.name, result: prev?.result ?? "", price: prev?.price ?? (t.price != null ? String(t.price) : "") };
    });
  };

  const openVisit = (visit) => {
    setSelectedVisit(visit);
    setDialogTab("overview");
    setNotes(visit[notesField] || "");
    setTotalPrice(visit.totalPrice?.toString() || "");
    setSendTo("");
    setMessage("");
    setChargeAmount("");
    setChargeLabel("");
    setIsEditing(false);
    setEditName(visit.fullName || "");
    setEditIdNumber(visit.idNumber || "");
    setEditPhone(visit.phoneNumber || "");
    setTreatmentText(visit.treatmentText || "");
    setBpSystolic(visit.bpSystolic?.toString() || "");
    setBpDiastolic(visit.bpDiastolic?.toString() || "");
    setHeartRate(visit.heartRate?.toString() || "");
    setRespiratoryRate(visit.respiratoryRate?.toString() || "");
    setTemperature(visit.temperature?.toString() || "");
    setSpo2(visit.spo2?.toString() || "");
    setSelectedReferrals([]);
    try {
      setMedicines(visit.medicinesJson ? JSON.parse(visit.medicinesJson) : [{ name: "", dose: "", available: true }]);
    } catch {
      setMedicines([{ name: "", dose: "", available: true }]);
    }
    if (cfg.showLab) { setLabRows([]); setLabPick(""); fetchLabTests(); }
    fetchMessages(visit.id);
    fetchNotifs(currentStatus);
  };
  const currentVisits = data?.visits || [];
const historyVisits = historyData?.visits || [];

  /* ─────────────────────────────────────────────────────────────
   Auto-open patient from URL: /staff/<dept>?visit=<id>
   Triggered when the header bell navigates here.
   ───────────────────────────────────────────────────────────── */
  const searchParams = useSearchParams();
  const visitIdFromUrl = searchParams.get("visit");

  useEffect(() => {
    if (!visitIdFromUrl) return;
    if (!currentVisits.length) return;

    const match = currentVisits.find((v) => v.id === visitIdFromUrl);
    if (match && (!selectedVisit || selectedVisit.id !== visitIdFromUrl)) {
      openVisit(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitIdFromUrl, currentVisits]);

  useEffect(() => {
    if (!cfg.showLab || !selectedVisit || !labTestsData?.tests) return;
    setLabRows((prev) => {
      const byName = Object.fromEntries(prev.map((r) => [r.name.toLowerCase(), r]));
      return buildLabRowsFromCatalog(labTestsData.tests, selectedVisit.laboratoryNotes || "").map((row) => {
        const typed = byName[row.name.toLowerCase()];
        if (typed && (typed.result || typed.price)) return { ...row, result: typed.result || row.result, price: typed.price !== "" ? typed.price : row.price };
        return row;
      });
    });
    // eslint-disable-next-line
  }, [labTestsData, cfg.showLab, selectedVisit?.id]);

  const addMedicineRow = () => setMedicines((prev) => [...prev, { name: "", dose: "", available: true }]);
  const updateMedicine = (i, f, v) => setMedicines((prev) => prev.map((m, idx) => (idx === i ? { ...m, [f]: v } : m)));
  const removeMedicine = (i) => setMedicines((prev) => prev.filter((_, idx) => idx !== i));

  const buildLabNotes = () =>
    labRows.filter((r) => r.result?.trim() || r.price).map((r) => `${r.name}: ${r.result?.trim() || "—"} (KES ${r.price || 0})`).join("\n");

  const handleSave = async () => {
    const cleanMeds = medicines.filter((m) => m.name.trim());
    const fd = new FormData();
    fd.append("visitId", selectedVisit.id);
    fd.append(notesField, notes);
    fd.append("treatmentText", treatmentText);
    fd.append("medicinesJson", JSON.stringify(cleanMeds));

    if (cfg.showVitals) {
      fd.append("bpSystolic", bpSystolic); fd.append("bpDiastolic", bpDiastolic);
      fd.append("heartRate", heartRate); fd.append("respiratoryRate", respiratoryRate);
      fd.append("temperature", temperature); fd.append("spo2", spo2);
    }
    if (cfg.showLab) {
      const labNotes = buildLabNotes();
      if (labNotes) { fd.append("message", labNotes); fd.append("notes", labNotes); fd.append("laboratoryNotes", labNotes); }
      const sum = labRows.reduce((a, r) => a + (parseFloat(r.price) || 0), 0);
      if (sum > 0) fd.append("totalPrice", String(sum));
    }
    if (cfg.showPrice && totalPrice) fd.append("totalPrice", totalPrice);
    await submitUpdate(fd);
  };

  const handleSend = async () => {
  if (!sendTo) {
    toast.error("Please select where to send");
    return;
  }
  if (cfg.showLab && labRows.length === 0) {
    toast.error("Add at least one lab test before sending");
    return;
  }

  const cleanMeds = medicines.filter((m) => m.name.trim());
  const fd = new FormData();
  fd.append("visitId", selectedVisit.id);
  fd.append("receiverRole", sendTo);
  fd.append("notesField", notesField || "laboratoryNotes");
  fd.append("treatmentText", treatmentText || "");
  fd.append("medicinesJson", JSON.stringify(cleanMeds));

  // ── Bill: append this department's charge if any ──
  const amount = parseFloat(chargeAmount);
  if (!isNaN(amount) && amount > 0) {
    const label = chargeLabel.trim() || defaultChargeLabel(currentStatus);
    fd.append("billItemsJson", JSON.stringify([{ label, amount }]));
  }

  // ── Referrals: attach when picking a department that acts on them ──
  if (selectedReferrals.length > 0) {
    fd.append("referralsJson", JSON.stringify(selectedReferrals));
  }

  // ── Triage vitals ──
  if (cfg.showVitals) {
    fd.append("bpSystolic", bpSystolic);
    fd.append("bpDiastolic", bpDiastolic);
    fd.append("heartRate", heartRate);
    fd.append("respiratoryRate", respiratoryRate);
    fd.append("temperature", temperature);
    fd.append("spo2", spo2);
  }

  // ── Lab results ──
  if (cfg.showLab) {
    const labNotes = labRows
      .filter((r) => r.result?.trim() || r.price)
      .map(
        (r) =>
          `${r.name}: ${r.result?.trim() || "—"} (KES ${r.price || 0})`
      )
      .join("\n");

    if (!labNotes) {
      toast.error("Enter result for the selected test(s)");
      return;
    }

    fd.append("message", labNotes);
    fd.append("notes", labNotes);
    fd.append("laboratoryNotes", labNotes);

    const sum = labRows.reduce(
      (a, r) => a + (parseFloat(r.price) || 0),
      0
    );
    if (sum > 0) fd.append("totalPrice", String(sum));
  } else {
    // Free-text message — optional, no fallback auto-text
    fd.append("message", message || "");
    fd.append("notes", notes || "");
  }

  if (cfg.showPrice && totalPrice) fd.append("totalPrice", totalPrice);

  await submitSendMessage(fd);
};

  const handleDelete = async (id) => {
    if (!confirm("Delete this patient record?")) return;
    const fd = new FormData(); fd.append("visitId", id);
    await submitDelete(fd);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) { toast.error("First name and last name are required"); return; }
    const fd = new FormData();
    fd.append("firstName", firstName); fd.append("middleName", middleName); fd.append("lastName", lastName);
    fd.append("idNumber", idNumber); fd.append("phoneNumber", phoneNumber); fd.append("birthInput", birthInput);
    fd.append("gender", gender); fd.append("medicalHistory", medicalHistory);
    await submitCreate(fd);
  };

  const handleEditSave = async () => {
    if (!editName.trim()) { toast.error("Full name is required"); return; }
    const fd = new FormData();
    fd.append("visitId", selectedVisit.id); fd.append("fullName", editName);
    fd.append("idNumber", editIdNumber); fd.append("phoneNumber", editPhone);
    await submitEdit(fd);
  };

  const handleGenerateReceipt = async () => {
    const cleanMeds = medicines.filter((m) => m.name.trim());
    const saveFd = new FormData();
    saveFd.append("visitId", selectedVisit.id);
    saveFd.append(notesField, notes);
    saveFd.append("treatmentText", treatmentText);
    saveFd.append("medicinesJson", JSON.stringify(cleanMeds));
    if (totalPrice) saveFd.append("totalPrice", totalPrice);
    await submitUpdate(saveFd);

    const vitalsText = [
      selectedVisit.bpSystolic && selectedVisit.bpDiastolic && `BP: ${selectedVisit.bpSystolic}/${selectedVisit.bpDiastolic} mmHg`,
      selectedVisit.heartRate && `Pulse: ${selectedVisit.heartRate} bpm`,
      selectedVisit.respiratoryRate && `RR: ${selectedVisit.respiratoryRate} /min`,
      selectedVisit.temperature && `Temp: ${selectedVisit.temperature} °C`,
      selectedVisit.spo2 && `SpO2: ${selectedVisit.spo2}%`,
    ].filter(Boolean).join("\n");

    const medsText = cleanMeds.map((m, i) => `${i + 1}. ${m.name}${m.dose ? ` — ${m.dose}` : ""} — ${m.available ? "Given" : "Not given"}`).join("\n");

    const receiptText = [
      treatmentText && treatmentText,
      vitalsText && vitalsText,
      selectedVisit.laboratoryNotes && selectedVisit.laboratoryNotes,
      medsText && `Medicine:\n${medsText}`,
    ].filter(Boolean).join("\n\n");

    const fd = new FormData();
    fd.append("visitId", selectedVisit.id);
    fd.append("receiptNotes", receiptText || "No details recorded.");
    await submitGenerateReceipt(fd);
  };

  const availableStages = ALL_STAGES.filter((s) => {
  if (s.value === currentStatus) return false;
  // Laboratory cannot send to Reception
  if (currentStatus === "LABORATORY" && s.value === "REGISTERED") return false;
  // Cashier only completes visits — no clinical routing
  if (currentStatus === "CASHIER") {
    return s.value === "COMPLETED";
  }
  // Reception cannot send to Cashier (nothing to bill yet)
  if (currentStatus === "REGISTERED" && s.value === "CASHIER") return false;
  return true;
});

  const catalogTests = 
    labTestsData?.tests?.length > 0 
      ? labTestsData.tests : DEFAULT_LAB_TESTS.map((name) => ({ name, price: 0, id: `default-${name}` }));
  const labOptions = catalogTests.filter((t) => !labRows.some((r) => r.name.toLowerCase() === t.name.toLowerCase()));

  const addLabTest = () => {
    if (!labPick) return;
    const t = catalogTests.find((x) => x.name === labPick || x.id === labPick);
    if (!t) return;
    if (labRows.some((r) => r.name.toLowerCase() === t.name.toLowerCase())) { toast.error("Test already added"); return; }
    setLabRows((prev) => [...prev, { id: t.id, name: t.name, result: "", price: t.price != null ? String(t.price) : "" }]);
    setLabPick("");
  };
  const removeLabRow = (i) => setLabRows((prev) => prev.filter((_, idx) => idx !== i));

  const RoleIcon = cfg.icon;

  return (
    <div className="space-y-6">
      {/* ── Inline notification card (below header, above queue) ── */}
      {(notifData?.notifications?.length || 0) > 0 && (
        <Card className="border-warning/30 bg-warning/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-warning-foreground">
              <Bell className="h-4 w-4 text-warning" />
              New messages
              <Badge variant="outline" className="ml-1 bg-warning/10 text-warning-foreground border-warning/30">
                {notifData.notifications.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifData.notifications.map((n) => (
              <div key={n.id} className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-card p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{n.visit?.fullName || "Patient"}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{format(new Date(n.createdAt), "MMM d, HH:mm")}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <Button size="sm" className="h-8 focus-ring" disabled={markingRead} onClick={async () => {
                    const fd = new FormData(); fd.append("id", n.id);
                    await submitMarkRead(fd);
                    if (n.visit) openVisit(n.visit);
                  }}>Open</Button>
                  <Button size="sm" variant="ghost" className="h-8 focus-ring" disabled={markingRead} onClick={async () => {
                    const fd = new FormData(); fd.append("id", n.id);
                    await submitMarkRead(fd);
                  }}>
                    <Check className="mr-1 h-3.5 w-3.5" />Mark read
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Current queue ── */}
      {!historyOnly && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-col gap-3 border-b border-border/60 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <div className="flex flex-col gap-3 sm:w-auto sm:flex-row">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search name, ID or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-9 pl-9 focus-ring" />
              </div>
              {canRegister && (
                <Button onClick={() => setShowRegister(true)} className="focus-ring">Register Patient</Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2 py-2">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/60" />)}
              </div>
            ) : currentVisits.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No patients in this stage right now.</p>
            ) : (
              <PatientTable visits={currentVisits} onAttend={openVisit} canDelete={canDelete} onDelete={handleDelete} isHistory={false} />
            )}
          </CardContent>
        </Card>
      )}

      {/* ── History ── */}
      {!hideHistory && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader><CardTitle className="text-base font-semibold">History</CardTitle></CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="space-y-2 py-2">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/60" />)}
              </div>
            ) : historyVisits.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">No sent patients yet.</p>
            ) : (
              <PatientTable visits={historyVisits} onAttend={openVisit} canDelete={false} isHistory={true} />
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Register dialog ── */}
      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Register new patient</DialogTitle></DialogHeader>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-2"><Label>First name *</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="focus-ring" /></div>
              <div className="space-y-2"><Label>Middle name</Label><Input value={middleName} onChange={(e) => setMiddleName(e.target.value)} className="focus-ring" /></div>
              <div className="space-y-2"><Label>Last name *</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} required className="focus-ring" /></div>
            </div>
            <div className="space-y-2"><Label>ID Number</Label><Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className="focus-ring" /></div>
            <div className="space-y-2"><Label>Phone Number</Label><Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="focus-ring" /></div>
            <div className="space-y-2">
              <Label>Date of birth or year *</Label>
              <Input value={birthInput} onChange={(e) => setBirthInput(e.target.value)} placeholder="e.g. 1950 or 15/03/1990" className="focus-ring" />
              <p className="text-xs text-muted-foreground">Age is calculated automatically</p>
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="focus-ring"><SelectValue placeholder="Select gender..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Medical history (optional)</Label><Textarea value={medicalHistory} onChange={(e) => setMedicalHistory(e.target.value)} rows={2} placeholder="Allergies, chronic illness, etc." className="focus-ring" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowRegister(false)} className="focus-ring">Cancel</Button>
              <Button type="submit" disabled={creating} className="focus-ring">{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Register"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Patient dialog with tabs ── */}
      {selectedVisit && (
        <Dialog
          open={!!selectedVisit}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedVisit(null);
              // remove ?visit= from URL without a full navigation
              if (visitIdFromUrl) {
                const params = new URLSearchParams(searchParams.toString());
                params.delete("visit");
                router.replace(`?${params.toString()}`, { scroll: false });
              }
            }
          }}
        >
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden border-border bg-card p-0 text-foreground">
            {/* Header */}
            <div className="border-b border-border/60 px-6 pb-3 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <DialogTitle className="truncate text-xl font-semibold tracking-tight">
                    {selectedVisit.fullName}
                  </DialogTitle>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="tabular-nums">ID {selectedVisit.idNumber || "—"}</span>
                    <span>·</span>
                    <span className="tabular-nums">{selectedVisit.phoneNumber || "—"}</span>
                    {getAge(selectedVisit) != null && (<><span>·</span><span>{getAge(selectedVisit)} yrs</span></>)}
                    {selectedVisit.gender && (<><span>·</span><span>{selectedVisit.gender}</span></>)}
                    <Badge variant="outline" className="ml-1 h-5 bg-primary/10 text-[10px] text-primary border-primary/20">
                      {selectedVisit.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={dialogTab} onValueChange={setDialogTab} className="flex flex-1 flex-col overflow-hidden">
              <div className="border-b border-border/60 px-6">
                <TabsList className="h-10 w-full justify-start gap-1 rounded-none bg-transparent p-0">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:border-primary data-[state=active]:text-primary">
                    <User className="h-3.5 w-3.5" />Overview
                  </TabsTrigger>
                  <TabsTrigger value="messages" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:border-primary data-[state=active]:text-primary">
                    <MessageCircle className="h-3.5 w-3.5" />Messages
                  </TabsTrigger>
                  <TabsTrigger value="action" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:border-primary data-[state=active]:text-primary">
                    <RoleIcon className="h-3.5 w-3.5" />{cfg.actionLabel}
                  </TabsTrigger>
                  <TabsTrigger value="send" className="data-station=active:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:border-primary data-[state=active]:text-primary">
                    <Send className="h-3.5 w-3.5" />Send
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
                {/* ── OVERVIEW ── */}
                <TabsContent value="overview" className="mt-0 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="mb-1 text-xs text-muted-foreground">ID Number</p><p className="font-medium">{selectedVisit.idNumber || "—"}</p></div>
                    <div><p className="mb-1 text-xs text-muted-foreground">Phone</p><p className="font-medium">{selectedVisit.phoneNumber || "—"}</p></div>
                    <div><p className="mb-1 text-xs text-muted-foreground">Age</p><p className="font-medium">{getAge(selectedVisit) != null ? `${getAge(selectedVisit)} years` : "—"}</p></div>
                    <div><p className="mb-1 text-xs text-muted-foreground">Gender</p><p className="font-medium">{selectedVisit.gender || "—"}</p></div>
                  </div>

                  {cfg.showPatientEdit && (
                    <div className="space-y-3 rounded-lg border border-border/60 p-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-primary">Patient details</Label>
                        {!isEditing ? (
                          <Button type="button" size="sm" variant="outline" onClick={() => setIsEditing(true)} className="focus-ring">Edit</Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={() => setIsEditing(false)} className="focus-ring">Cancel</Button>
                            <Button type="button" size="sm" disabled={editing} onClick={handleEditSave} className="focus-ring">
                              {editing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                            </Button>
                          </div>
                        )}
                      </div>
                      {isEditing && (
                        <div className="space-y-2">
                          <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Full name" className="focus-ring" />
                          <Input value={editIdNumber} onChange={(e) => setEditIdNumber(e.target.value)} placeholder="ID Number" className="focus-ring" />
                          <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Phone Number" className="focus-ring" />
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* ── MESSAGES ── */}
                <TabsContent value="messages" className="mt-0 space-y-3">
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {(msgHistoryData?.messages?.length || selectedVisit.messages?.length || 0) === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">No messages yet.</p>
                    ) : (
                      (msgHistoryData?.messages || selectedVisit.messages || []).map((m) => (
                        <div key={m.id} className="rounded-lg border border-border/60 bg-muted/30 p-3">
                          <p className="whitespace-pre-wrap text-sm text-foreground">{m.message}</p>
                          <p className="mt-1.5 text-[11px] text-muted-foreground">{m.senderRole} → {m.receiverRole} · {format(new Date(m.createdAt), "MMM d, HH:mm")}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Reply</Label>
                    <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Type your message here..." className="focus-ring" />
                  </div>
                </TabsContent>

                {/* ── ACTION (role-specific) ── */}
                <TabsContent value="action" className="mt-0 space-y-4">
                  {cfg.showVitals && (
                    <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium text-primary">Vital signs</Label>
                        {requestedKeys && (
                          <Badge
                            variant="outline"
                            className="bg-primary/10 text-primary border-primary/30 text-[10px]"
                          >
                            Requested by {selectedVisit?.movements?.[0]?.fromStatus || "staff"}
                          </Badge>
                        )}
                      </div>

                      {!requestedKeys && (
                        <p className="text-xs text-muted-foreground">
                          No specific vitals requested — record what's needed.
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        {visibleVitalKeys.includes("BP") && (
                          <>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">BP Systolic</Label>
                              <Input
                                type="number"
                                value={bpSystolic}
                                onChange={(e) => setBpSystolic(e.target.value)}
                                placeholder="e.g. 120"
                                className="focus-ring"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">BP Diastolic</Label>
                              <Input
                                type="number"
                                value={bpDiastolic}
                                onChange={(e) => setBpDiastolic(e.target.value)}
                                placeholder="e.g. 80"
                                className="focus-ring"
                              />
                            </div>
                          </>
                        )}

                        {visibleVitalKeys.includes("PULSE") && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Heart rate (pulse)</Label>
                            <Input
                              type="number"
                              value={heartRate}
                              onChange={(e) => setHeartRate(e.target.value)}
                              placeholder="bpm"
                              className="focus-ring"
                            />
                          </div>
                        )}

                        {visibleVitalKeys.includes("RR") && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Respiratory rate</Label>
                            <Input
                              type="number"
                              value={respiratoryRate}
                              onChange={(e) => setRespiratoryRate(e.target.value)}
                              placeholder="/min"
                              className="focus-ring"
                            />
                          </div>
                        )}

                        {visibleVitalKeys.includes("TEMP") && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Temperature (°C)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={temperature}
                              onChange={(e) => setTemperature(e.target.value)}
                              placeholder="e.g. 36.8"
                              className="focus-ring"
                            />
                          </div>
                        )}

                        {visibleVitalKeys.includes("SPO2") && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">SpO₂ (%)</Label>
                            <Input
                              type="number"
                              value={spo2}
                              onChange={(e) => setSpo2(e.target.value)}
                              placeholder="e.g. 98"
                              className="focus-ring"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {cfg.showLab && (
                    <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="font-medium text-primary">Lab tests</Label>
                        {requestedLabNames && requestedLabNames.length > 0 && (
                          <Badge
                            variant="outline"
                            className="bg-primary/10 text-primary border-primary/30 text-[10px]"
                          >
                            {requestedLabNames.length} requested
                          </Badge>
                        )}
                      </div>

                      {/* Referral summary — which tests were specifically asked for */}
                      {requestedLabNames && requestedLabNames.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {requestedLabNames.map((name) => {
                            const alreadyAdded = labRows.some(
                              (r) => r.name.toLowerCase() === name.toLowerCase()
                            );
                            return (
                              <Badge
                                key={name}
                                variant="outline"
                                className={cn(
                                  "border-primary/30",
                                  alreadyAdded
                                    ? "bg-success/10 text-success border-success/30"
                                    : "bg-primary/5 text-primary"
                                )}
                              >
                                {alreadyAdded && <Check className="mr-1 h-3 w-3" />}
                                {name}
                              </Badge>
                            );
                          })}
                        </div>
                      )}

                      {/* Add test row */}
                      <div className="flex flex-wrap items-end gap-2">
                        <div className="min-w-[180px] flex-1 space-y-1">
                          <Label className="text-xs text-muted-foreground">Select test</Label>
                          <Select value={labPick} onValueChange={setLabPick}>
                            <SelectTrigger className="focus-ring">
                              <SelectValue placeholder="Choose a test..." />
                            </SelectTrigger>
                            <SelectContent>
                              {labOptions
                                .filter((t) =>
                                  requestedLabNames && requestedLabNames.length > 0
                                    ? requestedLabNames.includes(t.name)
                                    : true
                                )
                                .map((t) => (
                                  <SelectItem key={t.id || t.name} value={t.name}>
                                    {t.name}
                                    {t.price ? ` — KES ${t.price}` : ""}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={addLabTest}
                          disabled={!labPick}
                          className="focus-ring"
                        >
                          Add test
                        </Button>
                      </div>

                      {/* Lab rows table */}
                      {labRows.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {requestedLabNames && requestedLabNames.length > 0
                            ? "Add the requested test(s) above, then enter the results."
                            : "Select the test ordered for this patient, then enter the result."}
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border/60 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                <th className="px-2 py-2">Test</th>
                                <th className="px-2 py-2">Result</th>
                                <th className="px-2 py-2">Price</th>
                                <th className="px-2 py-2"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {labRows.map((row, i) => (
                                <tr key={row.name} className="border-b border-border/40">
                                  <td className="px-2 py-1.5 text-xs font-medium">
                                    {row.name}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <Input
                                      value={row.result}
                                      onChange={(e) =>
                                        setLabRows((prev) =>
                                          prev.map((r, idx) =>
                                            idx === i ? { ...r, result: e.target.value } : r
                                          )
                                        )
                                      }
                                      placeholder="Result"
                                      className="h-8 w-28 focus-ring"
                                    />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <Input
                                      type="number"
                                      value={row.price}
                                      onChange={(e) =>
                                        setLabRows((prev) =>
                                          prev.map((r, idx) =>
                                            idx === i ? { ...r, price: e.target.value } : r
                                          )
                                        )
                                      }
                                      placeholder="0"
                                      className="h-8 w-20 focus-ring"
                                    />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 px-2 text-destructive hover:bg-destructive/10 focus-ring"
                                      onClick={() => removeLabRow(i)}
                                    >
                                      ✕
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {cfg.showTreatment && (
                    <div className="space-y-3 rounded-xl border border-border/60 p-3">
                      <Label>Treatment</Label>
                      <Textarea value={treatmentText} onChange={(e) => setTreatmentText(e.target.value)} rows={3} placeholder="What treatment was given..." className="focus-ring" />
                    </div>
                  )}

                  {cfg.showMedicines && (
                    <div className="space-y-3 rounded-xl border border-border/60 p-3">
                      <div className="flex items-center justify-between">
                        <Label>Medicine given</Label>
                        <Button type="button" size="sm" variant="outline" onClick={addMedicineRow} className="focus-ring">+ Add medicine</Button>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-border/60">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border/60 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              <th className="p-2">Medicine</th>
                              <th className="p-2">Dose / Qty</th>
                              <th className="p-2">Available?</th>
                              <th className="p-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {medicines.map((m, i) => (
                              <tr key={i} className="border-b border-border/40">
                                <td className="p-2"><Input value={m.name} onChange={(e) => updateMedicine(i, "name", e.target.value)} placeholder="e.g. Amoxicillin" className="h-8 focus-ring" /></td>
                                <td className="p-2"><Input value={m.dose} onChange={(e) => updateMedicine(i, "dose", e.target.value)} placeholder="e.g. 500mg x 10" className="h-8 focus-ring" /></td>
                                <td className="p-2">
                                  <button type="button" onClick={() => updateMedicine(i, "available", !m.available)} className={cn("rounded-full border px-2 py-1 text-xs transition-colors", m.available ? "border-success/40 bg-success/10 text-success" : "border-destructive/40 bg-destructive/10 text-destructive")}>
                                    {m.available ? "Available" : "Not available"}
                                  </button>
                                </td>
                                <td className="p-2"><Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-destructive hover:bg-destructive/10 focus-ring" onClick={() => removeMedicine(i)}>✕</Button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {cfg.showPrice && (
                    <div className="space-y-2">
                      <Label>Total amount (KES)</Label>
                      <Input type="number" value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)} placeholder="0.00" className="focus-ring" />
                    </div>
                  )}

                  {cfg.showPrice && (
                    <Button type="button" variant="outline" className="w-full focus-ring" disabled={generatingReceipt || updating} onClick={handleGenerateReceipt}>
                      {generatingReceipt ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                      Generate receipt → Reception
                    </Button>
                  )}

                  {cfg.showReceipt && selectedVisit.receiptReady && (
                    <div className="space-y-3">
                      <div id="receipt-print" className="overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-lg">
                        <div className="border-b-4 border-emerald-600 px-6 py-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <img src="/logo.png" alt="Neemah" className="h-14 w-14 object-contain" />
                              <div>
                                <h1 className="text-xl font-bold leading-none tracking-tight text-blue-700">Neemah</h1>
                                <h2 className="text-base font-bold leading-none text-emerald-600">Medical Centre</h2>
                                <p className="mt-1 text-[10px] italic text-blue-500">— Your Health, Our Priority —</p>
                              </div>
                            </div>
                            <div className="space-y-0.5 text-right text-[10px] text-slate-700">
                              <p>📍 Mogotio, Baringo, Kenya</p>
                              <p>📞 0180 363 450 / +254 792 195 454</p>
                              <p>✉️ neemahmedical@gmail.com</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4 px-6 py-5 text-sm">
                          <h3 className="text-center text-base font-bold uppercase tracking-wider text-slate-800">Patient Treatment Receipt</h3>
                          <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                            <div><p className="text-[10px] font-semibold uppercase text-slate-500">Patient</p><p className="font-bold text-slate-900">{selectedVisit.fullName}</p></div>
                            <div className="text-right"><p className="text-[10px] font-semibold uppercase text-slate-500">Date</p><p className="font-bold text-slate-900">{format(new Date(), "PPP")}</p></div>
                            <div><p className="text-[10px] font-semibold uppercase text-slate-500">ID Number</p><p className="font-semibold text-slate-800">{selectedVisit.idNumber || "—"}</p></div>
                            <div className="text-right"><p className="text-[10px] font-semibold uppercase text-slate-500">Phone</p><p className="font-semibold text-slate-800">{selectedVisit.phoneNumber || "—"}</p></div>
                          </div>
                          <div>
                            <p className="mb-1 border-l-4 border-emerald-500 pl-2 text-[10px] font-bold uppercase tracking-wide text-blue-700">Treatment & Medicine Details</p>
                            <div className="min-h-[100px] rounded-md border border-slate-200 bg-white p-3">
                              <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-700">{selectedVisit.receiptNotes || "No details recorded."}</pre>
                            </div>
                          </div>
                          <p className="pt-2 text-center text-[10px] italic text-slate-400">Thank you for visiting Neemah Medical Centre</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => {
                          const content = document.getElementById("receipt-print")?.innerHTML;
                          const win = window.open("", "_blank");
                          if (!win) return;
                          win.document.write(`<html><head><title>Receipt - ${selectedVisit.fullName}</title><script src="https://cdn.tailwindcss.com"><\/script><style>@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{margin:0;size:auto}}body{font-family:system-ui,sans-serif;margin:0;padding:20px;background:white}</style></head><body>${content}</body></html>`);
                          win.document.close();
                          setTimeout(() => { win.focus(); win.print(); }, 500);
                        }} className="w-full focus-ring">Print Receipt</Button>
                        <Button variant="outline" disabled={markingPrinted} className="w-full focus-ring" onClick={async () => {
                          const fd = new FormData(); fd.append("visitId", selectedVisit.id);
                          await submitMarkPrinted(fd);
                        }}>Mark as Printed</Button>
                      </div>
                    </div>
                  )}

                  {/* ── Bill amount for this department ── */}
                  {currentStatus !== "REGISTERED" && currentStatus !== "CASHIER" && (
                    <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium text-emerald-400">
                          Charge for this service
                        </Label>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Added to bill
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Description
                          </Label>
                          <Input
                            value={chargeLabel}
                            onChange={(e) => setChargeLabel(e.target.value)}
                            placeholder={
                              currentStatus === "DOCTOR"
                                ? "e.g. Consultation"
                                : currentStatus === "TRIAGE"
                                  ? "e.g. Triage fee"
                                  : currentStatus === "LABORATORY"
                                    ? "e.g. Lab test"
                                    : currentStatus === "PHARMACY"
                                      ? "e.g. Dispensing"
                                      : "Description"
                            }
                            className="focus-ring"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Amount (KES)
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            step="1"
                            value={chargeAmount}
                            onChange={(e) => setChargeAmount(e.target.value)}
                            placeholder="0"
                            className="focus-ring"
                          />
                        </div>
                      </div>

                      {/* Live preview of running bill */}
                      {selectedVisit && (
                        <div className="rounded-lg border border-border/60 bg-card p-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              Already on this visit
                            </span>
                            <span className="font-medium tabular-nums text-foreground">
                              KES{" "}
                              {(selectedVisit.billSubtotal || 0).toLocaleString()}
                            </span>
                          </div>

                          {chargeAmount && parseFloat(chargeAmount) > 0 && (
                            <>
                              <div className="mt-1 flex items-center justify-between text-xs">
                                <span className="text-emerald-400">+ This charge</span>
                                <span className="font-medium tabular-nums text-emerald-400">
                                  KES {parseFloat(chargeAmount).toLocaleString()}
                                </span>
                              </div>
                              <div className="mt-1.5 flex items-center justify-between border-t border-border/60 pt-1.5 text-sm">
                                <span className="font-medium text-foreground">
                                  New total
                                </span>
                                <span className="font-semibold tabular-nums text-foreground">
                                  KES{" "}
                                  {(
                                    (selectedVisit.billSubtotal || 0) +
                                    parseFloat(chargeAmount || 0)
                                  ).toLocaleString()}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Note (optional)</Label>
                    <Textarea 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)} 
                      rows={2} 
                      placeholder="Internal note for your department..." 
                      className="focus-ring" />
                  </div>
                </TabsContent>

                {/* ── SEND ── */}
                <TabsContent value="send" className="mt-0 space-y-4">
                  {/* Destination selector */}
                  <div className="space-y-2">
                    <Label>Send patient to</Label>
                    <Select
                      value={sendTo}
                      onValueChange={(v) => {
                        setSendTo(v);
                        setSelectedReferrals([]); // reset when destination changes
                      }}
                    >
                      <SelectTrigger className="focus-ring">
                        <SelectValue placeholder="Select department..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableStages.map((stage) => (
                          <SelectItem key={stage.value} value={stage.value}>
                            {stage.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Referral picker — only when destination is referral-aware */}
                  {sendTo && SERVICES_BY_DEPARTMENT[sendTo]?.length > 0 && (
                    <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <div>
                        <Label className="font-medium text-primary">
                          What should {ALL_STAGES.find((s) => s.value === sendTo)?.label || sendTo} do?
                        </Label>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          They will only see these services for this patient. Leave empty
                          to let them decide.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {SERVICES_BY_DEPARTMENT[sendTo].map((svc) => {
                          const active = selectedReferrals.includes(svc.key);
                          return (
                            <button
                              key={svc.key}
                              type="button"
                              onClick={() =>
                                setSelectedReferrals((prev) =>
                                  active
                                    ? prev.filter((k) => k !== svc.key)
                                    : [...prev, svc.key]
                                )
                              }
                              className={cn(
                                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                                active
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border/60 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                              )}
                            >
                              {svc.label}
                            </button>
                          );
                        })}
                      </div>

                      {selectedReferrals.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {selectedReferrals.length} service
                          {selectedReferrals.length > 1 ? "s" : ""} will be sent
                        </p>
                      )}
                    </div>
                  )}
                  {/* ── Bill amount for this department ── */}
                  {currentStatus !== "REGISTERED" && currentStatus !== "CASHIER" && (
                    <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium text-emerald-400">
                          Charge for this service
                        </Label>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Added to bill
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Description
                          </Label>
                          <Input
                            value={chargeLabel}
                            onChange={(e) => setChargeLabel(e.target.value)}
                            placeholder={
                              currentStatus === "DOCTOR"
                                ? "e.g. Consultation"
                                : currentStatus === "TRIAGE"
                                  ? "e.g. Triage fee"
                                  : currentStatus === "LABORATORY"
                                    ? "e.g. Lab test"
                                    : currentStatus === "PHARMACY"
                                      ? "e.g. Dispensing"
                                      : "Description"
                            }
                            className="focus-ring"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Amount (KES)
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            step="1"
                            value={chargeAmount}
                            onChange={(e) => setChargeAmount(e.target.value)}
                            placeholder="0"
                            className="focus-ring"
                          />
                        </div>
                      </div>

                      {/* Live preview of running bill */}
                      {selectedVisit && (
                        <div className="rounded-lg border border-border/60 bg-card p-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              Already on this visit
                            </span>
                            <span className="font-medium tabular-nums text-foreground">
                              KES{" "}
                              {(selectedVisit.billSubtotal || 0).toLocaleString()}
                            </span>
                          </div>

                          {chargeAmount && parseFloat(chargeAmount) > 0 && (
                            <>
                              <div className="mt-1 flex items-center justify-between text-xs">
                                <span className="text-emerald-400">+ This charge</span>
                                <span className="font-medium tabular-nums text-emerald-400">
                                  KES {parseFloat(chargeAmount).toLocaleString()}
                                </span>
                              </div>
                              <div className="mt-1.5 flex items-center justify-between border-t border-border/60 pt-1.5 text-sm">
                                <span className="font-medium text-foreground">
                                  New total
                                </span>
                                <span className="font-semibold tabular-nums text-foreground">
                                  KES{" "}
                                  {(
                                    (selectedVisit.billSubtotal || 0) +
                                    parseFloat(chargeAmount || 0)
                                  ).toLocaleString()}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Optional note */}
                  <div className="space-y-2">
                    <Label>Note (optional)</Label>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={2}
                      placeholder="Add a short note..."
                      className="focus-ring"
                    />
                  </div>
                </TabsContent>
              </div>

              <DialogFooter className="flex flex-wrap gap-2 border-t border-border/60 px-6 py-4 sm:justify-end">
                <Button variant="ghost" onClick={() => setSelectedVisit(null)} className="focus-ring">Close</Button>
                <Button onClick={handleSave} disabled={updating} variant="outline" className="focus-ring">Save notes only</Button>
                <Button onClick={handleSend} disabled={sendingMsg || !sendTo} className="focus-ring">
                  {sendingMsg ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send <ArrowRight className="ml-2 h-4 w-4" /></>}
                </Button>
              </DialogFooter>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function PatientTable({ visits, onAttend, canDelete, onDelete, isHistory }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <th className="px-3 py-3">Patient</th>
            <th className="px-3 py-3">ID Number</th>
            <th className="px-3 py-3">Phone</th>
            <th className="px-3 py-3">Message</th>
            <th className="px-3 py-3">{isHistory ? "Sent To" : "Time"}</th>
            <th className="px-3 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {visits.map((visit) => {
            const latestMessage = visit.messages?.[0]?.message || visit.movements?.find((m) => m.message)?.message || visit.movements?.[0]?.message || "—";
            return (
              <tr key={visit.id} className="border-b border-border/40 transition-colors hover:bg-muted/40">
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{visit.fullName?.[0]?.toUpperCase() || "?"}</div>
                    <span className="font-medium text-foreground">{visit.fullName}</span>
                  </div>
                </td>
                <td className="px-3 py-3 tabular-nums text-muted-foreground">{visit.idNumber || "—"}</td>
                <td className="px-3 py-3 tabular-nums text-muted-foreground">{visit.phoneNumber || "—"}</td>
                <td className="max-w-[220px] truncate px-3 py-3 text-xs text-slate-600 dark:text-slate-400">{latestMessage}</td>
                <td className="px-3 py-3 tabular-nums text-muted-foreground">{isHistory ? visit.lastSentTo || "—" : format(new Date(visit.createdAt), "HH:mm")}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <Button size="sm" className="h-8 focus-ring" onClick={() => onAttend(visit)}>{isHistory ? "View" : "Attend"}</Button>
                    <Button size="sm" variant="ghost" className="h-8 focus-ring" onClick={() => onAttend(visit)}><MessageCircle className="mr-1 h-3.5 w-3.5" />Message</Button>
                    {canDelete && !isHistory && (
                      <Button size="sm" variant="ghost" onClick={() => onDelete(visit.id)} className="h-8 text-destructive hover:bg-destructive/10 focus-ring" aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}