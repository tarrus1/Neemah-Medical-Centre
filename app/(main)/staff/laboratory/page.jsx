import { getCurrentUser } from "@/actions/onboarding";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { FlaskConical } from "lucide-react";
import { DepartmentQueue } from "../_components/department-queue";
import { LabCatalog } from "../_components/lab-catalog";

export default async function LaboratoryPage() {
  const user = await getCurrentUser();
  if (!user || !["LABORATORY", "ADMIN", "DOCTOR"].includes(user.role)) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FlaskConical />}
        title="Laboratory"
        subtitle="Manage lab tests, enter results, and forward to pharmacy."
        breadcrumb={[
          { label: "Staff", href: "/staff" },
          { label: "Laboratory" },
        ]}
      />
      <LabCatalog />
      <DepartmentQueue
        title="Laboratory queue"
        currentStatus="LABORATORY"
        notesField="laboratoryNotes"
        canSendAnywhere={true}
      />
    </div>
  );
}