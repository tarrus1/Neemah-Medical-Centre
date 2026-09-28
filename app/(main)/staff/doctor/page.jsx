import { PageHeader } from "@/components/page-header";
import { Stethoscope } from "lucide-react";
import { DepartmentQueue } from "../_components/department-queue";

export default function DoctorStationPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Stethoscope />}
        title="Doctor consultation"
        subtitle="Review vitals, record treatment, and prescribe medicine."
        breadcrumb={[
          { label: "Staff", href: "/staff" },
          { label: "Doctor" },
        ]}
      />
      <DepartmentQueue
        title="Doctor queue"
        currentStatus="DOCTOR"
        notesField="doctorNotes"
        canSendAnywhere={true}
      />
    </div>
  );
}