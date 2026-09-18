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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ClipboardList, Plus, Loader2, Search, Trash2 } from "lucide-react";
import {
  createPatientVisit,
  updatePatientVisit,
  deletePatientVisit,
  getPatientVisits,
} from "@/actions/patient-visits";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_FLOW = [
  "REGISTERED",
  "TRIAGE",
  "DOCTOR",
  "LABORATORY",
  "PHARMACY",
  "COMPLETED",
];

export function PatientRecords() {
  const [showRegister, setShowRegister] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [formData, setFormData] = useState({
    triageNotes: "",
    doctorNotes: "",
    laboratoryNotes: "",
    pharmacyNotes: "",
  });

  const {
    loading: loadingVisits,
    data: visitsData,
    fn: fetchVisits,
  } = useFetch(getPatientVisits);

  const {
    loading: creating,
    fn: submitCreate,
    data: createData,
  } = useFetch(createPatientVisit);

  const {
    loading: updating,
    fn: submitUpdate,
    data: updateData,
  } = useFetch(updatePatientVisit);

  const {
    loading: deleting,
    fn: submitDelete,
    data: deleteData,
  } = useFetch(deletePatientVisit);

  useEffect(() => {
    fetchVisits(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    if (createData?.success) {
      toast.success("Patient registered successfully");
      setShowRegister(false);
      setFullName("");
      setIdNumber("");
      setPhoneNumber("");
      fetchVisits(searchTerm);
    }
  }, [createData]);

  useEffect(() => {
    if (updateData?.success) {
      toast.success("Record updated");
      setSelectedVisit(null);
      fetchVisits(searchTerm);
    }
  }, [updateData]);

  useEffect(() => {
    if (deleteData?.success) {
      toast.success("Record deleted");
      fetchVisits(searchTerm);
    }
  }, [deleteData]);

  const handleRegister = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append("fullName", fullName);
    data.append("idNumber", idNumber);
    data.append("phoneNumber", phoneNumber);
    await submitCreate(data);
  };

  const openVisit = (visit) => {
    setSelectedVisit(visit);
    setFormData({
      triageNotes: visit.triageNotes || "",
      doctorNotes: visit.doctorNotes || "",
      laboratoryNotes: visit.laboratoryNotes || "",
      pharmacyNotes: visit.pharmacyNotes || "",
    });
  };

  const handleUpdate = async (nextStatus) => {
    if (!selectedVisit) return;

    const data = new FormData();
    data.append("visitId", selectedVisit.id);
    data.append("triageNotes", formData.triageNotes);
    data.append("doctorNotes", formData.doctorNotes);
    data.append("laboratoryNotes", formData.laboratoryNotes);
    data.append("pharmacyNotes", formData.pharmacyNotes);
    if (nextStatus) data.append("status", nextStatus);

    await submitUpdate(data);
  };

  const handleDelete = async (visitId) => {
    if (!window.confirm("Are you sure you want to delete this patient record?")) {
      return;
    }

    const data = new FormData();
    data.append("visitId", visitId);
    await submitDelete(data);
  };

  const visits = visitsData?.visits || [];

  return (
    <div className="space-y-6">
      <Card className="border-emerald-900/20">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-xl font-bold text-white flex items-center">
            <ClipboardList className="h-5 w-5 mr-2 text-emerald-400" />
            Patient Records (Physical Visits)
          </CardTitle>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, ID or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background border-emerald-900/20"
              />
            </div>

            <Button
              onClick={() => setShowRegister(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Register Patient
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loadingVisits ? (
            <p className="text-muted-foreground text-center py-8">
              Loading records...
            </p>
          ) : visits.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {searchTerm
                ? "No patients found matching your search."
                : "No patient records yet. Click “Register Patient” to start."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-emerald-900/20 text-left">
                    <th className="py-3 px-2 text-muted-foreground">Patient Name</th>
                    <th className="py-3 px-2 text-muted-foreground">ID Number</th>
                    <th className="py-3 px-2 text-muted-foreground">Phone</th>
                    <th className="py-3 px-2 text-muted-foreground">Status</th>
                    <th className="py-3 px-2 text-muted-foreground">Date</th>
                    <th className="py-3 px-2 text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((visit) => (
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
                      <td className="py-3 px-2">
                        <Badge
                          variant="outline"
                          className="bg-emerald-900/20 border-emerald-900/30 text-emerald-400"
                        >
                          {visit.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">
                        {format(new Date(visit.createdAt), "MMM d, yyyy HH:mm")}
                      </td>
                      <td className="py-3 px-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openVisit(visit)}
                          className="border-emerald-900/30"
                        >
                          Open
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(visit.id)}
                          disabled={deleting}
                          className="border-red-900/30 text-red-400 hover:bg-red-900/10"
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

      {/* Register Dialog */}
      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-white">Register New Patient</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Patient Name *</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter full name"
                required
                className="bg-background border-emerald-900/20"
              />
            </div>

            <div className="space-y-2">
              <Label>ID Number</Label>
              <Input
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="National ID / Passport"
                className="bg-background border-emerald-900/20"
              />
            </div>

            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. 0712 345 678"
                className="bg-background border-emerald-900/20"
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

      {/* Update Record Dialog */}
      {selectedVisit && (
        <Dialog open={!!selectedVisit} onOpenChange={() => setSelectedVisit(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">
                {selectedVisit.fullName} — {selectedVisit.status}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Full Name</p>
                  <p className="text-white font-medium">{selectedVisit.fullName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">ID Number</p>
                  <p className="text-white">{selectedVisit.idNumber || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="text-white">{selectedVisit.phoneNumber || "—"}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>2. Triage Notes</Label>
                <Textarea
                  value={formData.triageNotes}
                  onChange={(e) =>
                    setFormData({ ...formData, triageNotes: e.target.value })
                  }
                  placeholder="Blood pressure, temperature, weight, complaints..."
                  className="bg-background border-emerald-900/20"
                />
              </div>

              <div className="space-y-2">
                <Label>3. Doctor Notes (Treatment)</Label>
                <Textarea
                  value={formData.doctorNotes}
                  onChange={(e) =>
                    setFormData({ ...formData, doctorNotes: e.target.value })
                  }
                  placeholder="Diagnosis and treatment given..."
                  className="bg-background border-emerald-900/20"
                />
              </div>

              <div className="space-y-2">
                <Label>4. Laboratory Notes</Label>
                <Textarea
                  value={formData.laboratoryNotes}
                  onChange={(e) =>
                    setFormData({ ...formData, laboratoryNotes: e.target.value })
                  }
                  placeholder="Lab tests and results..."
                  className="bg-background border-emerald-900/20"
                />
              </div>

              <div className="space-y-2">
                <Label>5. Pharmacy (Medicine Given)</Label>
                <Textarea
                  value={formData.pharmacyNotes}
                  onChange={(e) =>
                    setFormData({ ...formData, pharmacyNotes: e.target.value })
                  }
                  placeholder="Medicines dispensed..."
                  className="bg-background border-emerald-900/20"
                />
              </div>
            </div>

            <DialogFooter className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setSelectedVisit(null)}>
                Close
              </Button>
              <Button
                onClick={() => handleUpdate()}
                disabled={updating}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {updating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Notes"
                )}
              </Button>

              {selectedVisit.status !== "COMPLETED" && (
                <Button
                  onClick={() => {
                    const currentIndex = STATUS_FLOW.indexOf(selectedVisit.status);
                    const next = STATUS_FLOW[currentIndex + 1] || "COMPLETED";
                    handleUpdate(next);
                  }}
                  disabled={updating}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Move to Next Stage
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}