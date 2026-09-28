import { getCurrentUser } from "@/actions/onboarding";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Pill } from "lucide-react";
import { PharmacyCatalog } from "../_components/pharmacy-catalog";
import { SalesLog } from "../_components/sales-log";
import { DepartmentQueue } from "../_components/department-queue";

export default async function PharmacyPage() {
  const user = await getCurrentUser();
  if (!user || !["PHARMACY", "ADMIN", "DOCTOR"].includes(user.role)) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Pill />}
        title="Pharmacy"
        subtitle="Manage inventory, record sales, and dispense to patients in the queue."
        breadcrumb={[
          { label: "Staff", href: "/staff" },
          { label: "Pharmacy" },
        ]}
      />
      <PharmacyCatalog />
      <SalesLog />
      <DepartmentQueue
        title="Pharmacy queue"
        currentStatus="PHARMACY"
        notesField="pharmacyNotes"
        canSendAnywhere={true}
      />
    </div>
  );
}