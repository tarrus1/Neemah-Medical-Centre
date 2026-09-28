import { getCurrentUser } from "@/actions/onboarding";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Wallet } from "lucide-react";
import { CashierClient } from "./_components/cashier-client";

export default async function CashierPage() {
  const user = await getCurrentUser();

  if (
    !user ||
    !["CASHIER", "ADMIN", "DOCTOR"].includes(user.role)
  ) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Wallet />}
        title="Cashier"
        subtitle="Collect payment for completed treatments and print the final receipt."
        breadcrumb={[
          { label: "Staff", href: "/staff" },
          { label: "Cashier" },
        ]}
      />
      <CashierClient />
    </div>
  );
}