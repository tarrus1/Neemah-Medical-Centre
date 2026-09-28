import { PageHeader } from "@/components/page-header";
import { Activity } from "lucide-react";
import { DepartmentQueue } from "../_components/department-queue";

export default function TriagePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Activity />}
        title="Triage"
        subtitle="Record vitals and send patients to the doctor or laboratory."
        breadcrumb={[
          { label: "Staff", href: "/staff" },
          { label: "Triage" },
        ]}
      />
      <DepartmentQueue
        title="Triage queue"
        currentStatus="TRIAGE"
        notesField="triageNotes"
        canSendAnywhere={true}
      />
    </div>
  );
}