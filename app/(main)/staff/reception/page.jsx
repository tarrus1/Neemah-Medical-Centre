import { PageHeader } from "@/components/page-header";
import { ClipboardList } from "lucide-react";
import { ReceptionClient } from "./_components/reception-client";

export default function ReceptionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ClipboardList />}
        title="Reception Desk"
        subtitle="Register new patients"
        breadcrumb={[
          { label: "Staff", href: "/staff" },
          { label: "Reception" },
        ]}
      />

      <ReceptionClient />
    </div>
  );
}