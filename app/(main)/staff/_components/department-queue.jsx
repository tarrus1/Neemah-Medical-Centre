"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";
import { format } from "date-fns";

const ALL_STAGES = [
  { value: "REGISTERED", label: "Reception" },
  { value: "TRIAGE", label: "Triage" },
  { value: "DOCTOR", label: "Doctor" },
  { value: "LABORATORY", label: "Laboratory" },
  { value: "PHARMACY", label: "Pharmacy" },
  { value: "COMPLETED", label: "Completed" },
];

export function DepartmentQueue({
  title,
  currentStatus,
  canRegister = false,
  canDelete = false,
  showPrice = false,
  notesField,
  canSendAnywhere = true,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [notes, setNotes] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [sendTo, setSendTo] = useState("");
  const [message, setMessage] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editIdNumber, setEditIdNumber] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [treatmentText, setTreatmentText] = useState("");
  const [medicines, setMedicines] = useState([
    { name: "", dose: "", available: true },
  ]);

  const { loading, data, fn: fetchCurrent } = useFetch(getPatientVisitsByStatus);
  const { loading: loadingHistory, data: historyData, fn: fetchHistory } =
    useFetch(getDepartmentHistory);
  const { data: notifData, fn: fetchNotifs } = useFetch(getNotifications);
  const { loading: markingRead, fn: submitMarkRead, data: markReadData } =
    useFetch(markNotificationRead);
  const { loading: updating, fn: submitUpdate, data: updateData } =
    useFetch(updatePatientVisit);
  const { loading: sending, fn: submitSend, data: sendData } =
    useFetch(sendToNextStage);
  const { loading: deleting, fn: submitDelete, data: deleteData } =
    useFetch(deletePatientVisit);
  const { loading: creating, fn: submitCreate, data: createData } =
    useFetch(createPatientVisit);
  const { loading: editing, fn: submitEdit, data: editData } =
    useFetch(editPatientVisitDetails);
  const {
    loading: generatingReceipt,
    fn: submitGenerateReceipt,
    data: receiptData,
  } = useFetch(generateReceipt);
  const {
    loading: markingPrinted,
    fn: submitMarkPrinted,
    data: printedData,
  } = useFetch(markReceiptPrinted);
  const { loading: sendingMsg, fn: submitSendMessage, data: sendMsgData } =
    useFetch(sendPatientMessage);
  const { data: msgHistoryData, fn: fetchMessages } =
    useFetch(getPatientMessages);

  const refresh = () => {
    fetchCurrent(currentStatus, searchTerm);
    fetchHistory(currentStatus, searchTerm);
    fetchNotifs(currentStatus);
  };

  useEffect(() => {
    refresh();
  }, [currentStatus, searchTerm]);

  useEffect(() => {
    if (markReadData?.success) fetchNotifs(currentStatus);
  }, [markReadData]);

  useEffect(() => {
    if (
      updateData?.success ||
      sendData?.success ||
      sendMsgData?.success ||
      deleteData?.success ||
      createData?.success ||
      editData?.success ||
      receiptData?.success ||
      printedData?.success
    ) {
      toast.success("Updated successfully");
      setSelectedVisit(null);
      setShowRegister(false);
      setIsEditing(false);
      setFullName("");
      setIdNumber("");
      setPhoneNumber("");
      setSendTo("");
      setMessage("");
      setTreatmentText("");
      setMedicines([{ name: "", dose: "", available: true }]);
      refresh();
    }
  }, [
    updateData,
    sendData,
    sendMsgData,
    deleteData,
    createData,
    editData,
    receiptData,
    printedData,
  ]);

  const openVisit = (visit) => {
    setSelectedVisit(visit);
    setNotes(visit[notesField] || "");
    setTotalPrice(visit.totalPrice?.toString() || "");
    setSendTo("");
    setMessage("");
    setIsEditing(false);
    setEditName(visit.fullName || "");
    setEditIdNumber(visit.idNumber || "");
    setEditPhone(visit.phoneNumber || "");
    setTreatmentText(visit.treatmentText || "");
    try {
      setMedicines(
        visit.medicinesJson
          ? JSON.parse(visit.medicinesJson)
          : [{ name: "", dose: "", available: true }]
      );
    } catch {
      setMedicines([{ name: "", dose: "", available: true }]);
    }
    fetchMessages(visit.id);
  };

  const addMedicineRow = () => {
    setMedicines((prev) => [...prev, { name: "", dose: "", available: true }]);
  };

  const updateMedicine = (index, field, value) => {
    setMedicines((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  const removeMedicine = (index) => {
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const cleanMeds = medicines.filter((m) => m.name.trim());
    const data = new FormData();
    data.append("visitId", selectedVisit.id);
    data.append(notesField, notes);
    data.append("treatmentText", treatmentText);
    data.append("medicinesJson", JSON.stringify(cleanMeds));
    if (showPrice && totalPrice) data.append("totalPrice", totalPrice);
    await submitUpdate(data);
  };

  const handleSend = async () => {
    if (!sendTo) {
      toast.error("Please select where to send the message");
      return;
    }
    if (!message.trim()) {
      toast.error("Message is required");
      return;
    }

    const cleanMeds = medicines.filter((m) => m.name.trim());
    const data = new FormData();
    data.append("visitId", selectedVisit.id);
    data.append("receiverRole", sendTo);
    data.append("message", message);
    data.append("notesField", notesField);
    data.append("notes", notes);
    data.append("treatmentText", treatmentText);
    data.append("medicinesJson", JSON.stringify(cleanMeds));
    if (showPrice && totalPrice) data.append("totalPrice", totalPrice);

    await submitSendMessage(data);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this patient record?")) return;
    const data = new FormData();
    data.append("visitId", id);
    await submitDelete(data);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append("fullName", fullName);
    data.append("idNumber", idNumber);
    data.append("phoneNumber", phoneNumber);
    await submitCreate(data);
  };

  const handleEditSave = async () => {
    if (!editName.trim()) {
      toast.error("Full name is required");
      return;
    }
    const data = new FormData();
    data.append("visitId", selectedVisit.id);
    data.append("fullName", editName);
    data.append("idNumber", editIdNumber);
    data.append("phoneNumber", editPhone);
    await submitEdit(data);
  };

  const handleGenerateReceipt = async () => {
    const cleanMeds = medicines.filter((m) => m.name.trim());

    const saveData = new FormData();
    saveData.append("visitId", selectedVisit.id);
    saveData.append(notesField, notes);
    saveData.append("treatmentText", treatmentText);
    saveData.append("medicinesJson", JSON.stringify(cleanMeds));
    if (totalPrice) saveData.append("totalPrice", totalPrice);
    await submitUpdate(saveData);

    const medsText = cleanMeds
      .map(
        (m, i) =>
          `${i + 1}. ${m.name}${m.dose ? ` — ${m.dose}` : ""} [${m.available ? "Available" : "NOT AVAILABLE"
          }]`
      )
      .join("\n");

    const receiptText = [
      treatmentText && `TREATMENT:\n${treatmentText}`,
      selectedVisit.triageNotes && `Triage:\n${selectedVisit.triageNotes}`,
      selectedVisit.doctorNotes && `Doctor:\n${selectedVisit.doctorNotes}`,
      selectedVisit.laboratoryNotes &&
      `Laboratory:\n${selectedVisit.laboratoryNotes}`,
      medsText && `MEDICINE GIVEN:\n${medsText}`,
      notes && `Pharmacy notes:\n${notes}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const data = new FormData();
    data.append("visitId", selectedVisit.id);
    data.append("receiptNotes", receiptText || "No treatment details recorded.");
    await submitGenerateReceipt(data);
  };

  const availableStages = ALL_STAGES.filter((s) => s.value !== currentStatus);
  const currentVisits = data?.visits || [];
  const historyVisits = historyData?.visits || [];

  return (
    <div className="space-y-8">
      {/* NOTIFICATIONS */}
      {(notifData?.notifications?.length || 0) > 0 && (
        <Card className="border-amber-600/40 bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-amber-400 flex items-center gap-2">
              <Bell className="h-5 w-5" />
              New Messages ({notifData.notifications.length} unread)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifData.notifications.map((n) => (
              <div
                key={n.id}
                className="flex items-start justify-between gap-3 p-3 rounded-lg bg-background/50 border border-amber-900/30"
              >
                <div>
                  <p className="text-white font-medium">
                    {n.visit?.fullName || "Patient"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {n.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(n.createdAt), "MMM d, HH:mm")}
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    disabled={markingRead}
                    onClick={async () => {
                      const data = new FormData();
                      data.append("id", n.id);
                      await submitMarkRead(data);
                      if (n.visit) openVisit(n.visit);
                    }}
                  >
                    Open
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-700/40 text-amber-400"
                    disabled={markingRead}
                    onClick={async () => {
                      const data = new FormData();
                      data.append("id", n.id);
                      await submitMarkRead(data);
                    }}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Mark read
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* CURRENT PATIENTS */}
      <Card className="border-emerald-900/20">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-xl font-bold text-white">{title}</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, ID or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background border-emerald-900/20"
              />
            </div>
            {canRegister && (
              <Button
                onClick={() => setShowRegister(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Register Patient
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : currentVisits.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No patients in this stage right now.
            </p>
          ) : (
            <PatientTable
              visits={currentVisits}
              onAttend={openVisit}
              canDelete={canDelete}
              onDelete={handleDelete}
              isHistory={false}
            />
          )}
        </CardContent>
      </Card>

      {/* HISTORY */}
      <Card className="border-emerald-900/20">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-white">
            Sent / History (records kept here)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <p className="text-center text-muted-foreground py-6">
              Loading history...
            </p>
          ) : historyVisits.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              No sent patients yet.
            </p>
          ) : (
            <PatientTable
              visits={historyVisits}
              onAttend={openVisit}
              canDelete={false}
              isHistory={true}
            />
          )}
        </CardContent>
      </Card>

      {/* Register Dialog */}
      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-white">Register New Patient</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>ID Number</Label>
              <Input
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRegister(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Register"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Attend Dialog */}
      {selectedVisit && (
        <Dialog open={!!selectedVisit} onOpenChange={() => setSelectedVisit(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-[#0b1220] border border-slate-700/80 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-white">
                {selectedVisit.fullName}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* ID + Phone */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400 text-xs mb-1">ID Number</p>
                  <p className="text-white font-medium">
                    {selectedVisit.idNumber || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">Phone</p>
                  <p className="text-white font-medium">
                    {selectedVisit.phoneNumber || "—"}
                  </p>
                </div>
              </div>

              {/* Reception edit */}
              {canRegister && (
                <div className="space-y-3 border border-emerald-900/20 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-emerald-400">Patient Details</Label>
                    {!isEditing ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditing(true)}
                      >
                        Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setIsEditing(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          disabled={editing}
                          onClick={handleEditSave}
                        >
                          {editing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Save"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                  {isEditing && (
                    <div className="space-y-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Full name"
                      />
                      <Input
                        value={editIdNumber}
                        onChange={(e) => setEditIdNumber(e.target.value)}
                        placeholder="ID Number"
                      />
                      <Input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="Phone Number"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Receipt card with logo — no total */}
              {selectedVisit.receiptReady && (
                <div className="space-y-3">
  <div
    id="receipt-print"
    className="bg-white text-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-200 relative"
    style={{ minHeight: '800px' }} // Ensure it looks like a full page receipt
  >
    {/* --- HEADER SECTION --- */}
    <div className="relative z-10 px-6 py-4 flex justify-between items-start border-b-4 border-emerald-600">
      {/* Left: Logo & Name */}
      <div className="flex items-center gap-3">
        {/* Placeholder for the Heart Logo */}
        <div className="h-16 w-16 relative flex-shrink-0">
           <img
            src="/logo.png" // Ensure this is the blue/green heart logo
            alt="Neemah Medical Centre"
            className="h-full w-full object-contain"
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-blue-700 leading-none tracking-tight">
            Neemah
          </h1>
          <h2 className="text-xl font-bold text-emerald-600 leading-none">
            Medical Centre
          </h2>
          <p className="text-[10px] text-blue-500 italic mt-1 font-medium">
            — Your Health, Our Priority —
          </p>
        </div>
      </div>

      {/* Right: Contact Info */}
      <div className="text-[10px] text-right space-y-1 text-slate-700">
        <div className="flex items-center justify-end gap-1">
          <span className="text-emerald-600">📍</span>
          <span>Mogotio, Baringo, Kenya</span>
        </div>
        <div className="flex items-center justify-end gap-1">
          <span className="text-emerald-600">📞</span>
          <span>0180 363 450 / +254 792 195 454</span>
        </div>
        <div className="flex items-center justify-end gap-1">
          <span className="text-emerald-600">✉️</span>
          <span>neemahmedical@gmail.com</span>
        </div>
        <div className="flex items-center justify-end gap-1">
          <span className="text-emerald-600">🕒</span>
          <span>Mon - Sat: 8:00 AM – 8:00 PM</span>
        </div>
      </div>
    </div>

    {/* --- BODY CONTENT --- */}
    <div className="relative px-8 py-6 space-y-6 text-sm z-10">
      
      {/* Background Watermark (The Heart + Cross) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.08] z-[-1]">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-80 h-80 text-blue-600">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          <path fill="white" d="M11 7h2v3h3v2h-3v3h-2v-3H8v-2h3V7z" /> 
          {/* The cross is white to cut out of the heart */}
        </svg>
      </div>

      {/* Receipt Title */}
      <div className="text-center">
        <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider border-b-2 border-slate-100 pb-2 inline-block">
          Patient Treatment Receipt
        </h3>
      </div>

      {/* Patient Details Grid */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
        <div>
          <p className="text-xs text-slate-500 font-semibold uppercase">Patient Name</p>
          <p className="font-bold text-slate-900">{selectedVisit.fullName}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 font-semibold uppercase">Date</p>
          <p className="font-bold text-slate-900">{format(new Date(), "PPP")}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 font-semibold uppercase">ID Number</p>
          <p className="font-semibold text-slate-800">{selectedVisit.idNumber || "—"}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 font-semibold uppercase">Phone</p>
          <p className="font-semibold text-slate-800">{selectedVisit.phoneNumber || "—"}</p>
        </div>
      </div>

      {/* Treatment Details */}
      <div className="mt-6">
        <p className="text-xs text-blue-700 font-bold uppercase tracking-wide mb-2 border-l-4 border-emerald-500 pl-2">
          Treatment & Medicine Details
        </p>
        <div className="bg-white border border-slate-200 rounded-md p-4 min-h-[150px]">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
            {selectedVisit.receiptNotes || "No details recorded."}
          </pre>
        </div>
      </div>

      {/* Footer Message */}
      <div className="text-center pt-8">
        <p className="text-xs text-slate-400 italic">
          Thank you for visiting Neemah Medical Centre
        </p>
      </div>
    </div>

    {/* --- FOOTER WAVES & ICONS --- */}
    <div className="absolute bottom-0 left-0 right-0">
      {/* Green/Blue Wave SVG */}
      <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto block">
        <path d="M0 120L60 110C120 100 240 80 360 75C480 70 600 80 720 85C840 90 960 90 1080 80C1200 70 1320 50 1380 40L1440 30V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#009444"/>
        <path d="M0 120L60 105C120 90 240 60 360 55C480 50 600 65 720 75C840 85 960 90 1080 85C1200 80 1320 65 1380 57.5L1440 50V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#0071BC"/>
      </svg>

      {/* Footer Content Overlay */}
      <div className="absolute bottom-2 left-0 right-0 px-6 flex justify-between items-end text-white">
        {/* Left: Heartbeat Line */}
        <div className="flex items-center gap-2 mb-1">
          <svg width="40" height="20" viewBox="0 0 40 20" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
             <path d="M0 10h5l2-5 3 10 3-12 3 12 2-5h5" />
             <path d="M20 10h20" />
          </svg>
          <p className="text-[10px] font-medium tracking-wide">
            Quality Healthcare for a Healthier Tomorrow
          </p>
        </div>

        {/* Right: Icons */}
        <div className="flex gap-3 mb-1">
            {/* Stethoscope Icon */}
            <div className="h-8 w-8 rounded-full border border-white flex items-center justify-center">
                <span className="text-xs">🩺</span>
            </div>
            {/* Heart Pulse Icon */}
            <div className="h-8 w-8 rounded-full border border-white flex items-center justify-center">
                <span className="text-xs">💓</span>
            </div>
            {/* Cross Icon */}
            <div className="h-8 w-8 rounded-full border border-white flex items-center justify-center">
                <span className="text-xs">✚</span>
            </div>
             {/* People Icon */}
             <div className="h-8 w-8 rounded-full border border-white flex items-center justify-center">
                <span className="text-xs">👥</span>
            </div>
        </div>
      </div>
    </div>
  </div>

  {/* --- BUTTONS --- */}
  <div className="flex gap-2">
    <Button
      onClick={() => {
        const content = document.getElementById("receipt-print")?.innerHTML;
        const win = window.open("", "_blank");
        if (!win) return;
        win.document.write(`
          <html>
            <head>
              <title>Receipt - ${selectedVisit.fullName}</title>
              <script src="https://cdn.tailwindcss.com"></script>
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
        // Wait for Tailwind to load in the new window before printing
        setTimeout(() => {
            win.focus();
            win.print();
        }, 500);
      }}
      className="bg-emerald-600 hover:bg-emerald-700 w-full"
    >
      Print Receipt
    </Button>
    <Button
      variant="outline"
      disabled={markingPrinted}
      onClick={async () => {
        const data = new FormData();
        data.append("visitId", selectedVisit.id);
        await submitMarkPrinted(data);
      }}
      className="w-full"
    >
      Mark as Printed
    </Button>
  </div>
</div>
              )}

              {/* Message received */}
              <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 to-cyan-950/20 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-emerald-500/20">
                  <MessageCircle className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-300">
                    Message received
                  </span>
                </div>
                <div className="max-h-40 overflow-y-auto p-3 space-y-2">
                  {(msgHistoryData?.messages?.length ||
                    selectedVisit.messages?.length ||
                    0) === 0 ? (
                    <p className="text-sm text-slate-400 px-1">No messages yet.</p>
                  ) : (
                    (
                      msgHistoryData?.messages ||
                      selectedVisit.messages ||
                      []
                    ).map((m) => (
                      <div
                        key={m.id}
                        className="rounded-lg bg-black/20 border border-emerald-900/30 p-3"
                      >
                        <p className="text-sm text-emerald-100 whitespace-pre-wrap">
                          {m.message}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1.5">
                          {m.senderRole} → {m.receiverRole}
                          {" · "}
                          {format(new Date(m.createdAt), "MMM d, HH:mm")}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* My Message */}
              <div className="rounded-xl border border-sky-500/40 bg-sky-950/20 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-sky-500/20">
                  <Send className="h-4 w-4 text-sky-400" />
                  <span className="text-sm font-medium text-sky-300">
                    Message
                  </span>
                </div>
                <div className="p-3">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    required
                    placeholder="Type your message here..."
                    className="bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-white placeholder:text-slate-500 resize-y min-h-[90px]"
                  />
                </div>
              </div>

              {/* Optional note */}
              <div className="space-y-2">
                <Label className="text-slate-300"> Note (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Internal note for your department..."
                  className="bg-slate-900/50 border-slate-700 text-white"
                />
              </div>

              {/* Treatment + Medicine table */}
              {showPrice && (
                <div className="space-y-3 rounded-xl border border-emerald-800/40 p-3">
                  <Label className="text-emerald-300">Treatment</Label>
                  <Textarea
                    value={treatmentText}
                    onChange={(e) => setTreatmentText(e.target.value)}
                    rows={3}
                    placeholder="What treatment was given..."
                    className="bg-slate-900/50 border-slate-700 text-white"
                  />

                  <div className="flex items-center justify-between">
                    <Label className="text-emerald-300">Medicine given</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addMedicineRow}
                    >
                      + Add medicine
                    </Button>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-700">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700 text-left text-slate-400">
                          <th className="p-2">Medicine</th>
                          <th className="p-2">Dose / Qty</th>
                          <th className="p-2">Available?</th>
                          <th className="p-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {medicines.map((m, index) => (
                          <tr key={index} className="border-b border-slate-800">
                            <td className="p-2">
                              <Input
                                value={m.name}
                                onChange={(e) =>
                                  updateMedicine(index, "name", e.target.value)
                                }
                                placeholder="e.g. Amoxicillin"
                                className="bg-slate-900/50 border-slate-700 h-8"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={m.dose}
                                onChange={(e) =>
                                  updateMedicine(index, "dose", e.target.value)
                                }
                                placeholder="e.g. 500mg x 10"
                                className="bg-slate-900/50 border-slate-700 h-8"
                              />
                            </td>
                            <td className="p-2">
                              <button
                                type="button"
                                onClick={() =>
                                  updateMedicine(
                                    index,
                                    "available",
                                    !m.available
                                  )
                                }
                                className={`text-xs px-2 py-1 rounded-full border ${m.available
                                  ? "border-emerald-600 text-emerald-400"
                                  : "border-red-600 text-red-400"
                                  }`}
                              >
                                {m.available ? "Available" : "Not available"}
                              </button>
                            </td>
                            <td className="p-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-red-400 h-8 px-2"
                                onClick={() => removeMedicine(index)}
                              >
                                ✕
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Total amount — internal only */}
              {showPrice && (
                <div className="space-y-2">
                  <Label className="text-slate-300">
                    Total amount (KES)
                  </Label>
                  <Input
                    type="number"
                    value={totalPrice}
                    onChange={(e) => setTotalPrice(e.target.value)}
                    placeholder="0.00"
                    className="bg-slate-900/50 border-slate-700"
                  />
                  <p className="text-xs text-slate-500">
                    Saved
                  </p>
                </div>
              )}

              {/* Generate receipt */}
              {showPrice && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-emerald-700 text-emerald-400"
                  disabled={generatingReceipt || updating}
                  onClick={handleGenerateReceipt}
                >
                  {generatingReceipt ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Generate Receipt → Reception
                </Button>
              )}

              {/* Send patient to */}
              <div className="space-y-2">
                <Label className="text-slate-300">Send patient to</Label>
                <Select value={sendTo} onValueChange={setSendTo}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
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
            </div>

            <DialogFooter className="flex gap-2 flex-wrap sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setSelectedVisit(null)}
                className="border-slate-600 text-slate-200"
              >
                Close
              </Button>
              <Button
                onClick={handleSave}
                disabled={updating}
                variant="outline"
                className="border-slate-600 text-slate-200"
              >
                Save Notes Only
              </Button>
              <Button
                onClick={handleSend}
                disabled={sendingMsg || !sendTo || !message.trim()}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {sendingMsg ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Send <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
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
          <tr className="border-b border-emerald-900/20 text-left">
            <th className="py-3 px-2 text-muted-foreground">Patient Name</th>
            <th className="py-3 px-2 text-muted-foreground">ID Number</th>
            <th className="py-3 px-2 text-muted-foreground">Phone</th>
            <th className="py-3 px-2 text-muted-foreground">Message</th>
            <th className="py-3 px-2 text-muted-foreground">
              {isHistory ? "Sent To" : "Time"}
            </th>
            <th className="py-3 px-2 text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {visits.map((visit) => {
            const latestMessage =
              visit.messages?.[0]?.message ||
              visit.movements?.find((m) => m.message)?.message ||
              visit.movements?.[0]?.message ||
              "—";

            return (
              <tr
                key={visit.id}
                className="border-b border-emerald-900/10 hover:bg-muted/10"
              >
                <td className="py-3 px-2 text-white font-medium">
                  {visit.fullName}
                </td>
                <td className="py-3 px-2 text-muted-foreground">
                  {visit.idNumber || "—"}
                </td>
                <td className="py-3 px-2 text-muted-foreground">
                  {visit.phoneNumber || "—"}
                </td>
                <td className="py-3 px-2 text-amber-300 max-w-[180px] truncate">
                  {latestMessage}
                </td>
                <td className="py-3 px-2 text-muted-foreground">
                  {isHistory
                    ? visit.lastSentTo || "—"
                    : format(new Date(visit.createdAt), "HH:mm")}
                </td>
                <td className="py-3 px-2 flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAttend(visit)}
                  >
                    {isHistory ? "View" : "Attend"}
                  </Button>
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={() => onAttend(visit)}
                  >
                    Open Message
                  </Button>
                  {canDelete && !isHistory && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDelete(visit.id)}
                      className="border-red-900/30 text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}