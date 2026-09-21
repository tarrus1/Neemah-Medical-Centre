import { getCurrentUser } from "@/actions/onboarding";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Users } from "lucide-react";

export default async function StaffLayout({ children }) {
  const user = await getCurrentUser();

  const allowedRoles = [
    "RECEPTIONIST",
    "TRIAGE",
    "DOCTOR",
    "LABORATORY",
    "PHARMACY",
    "ADMIN",
  ];

  if (!user || !allowedRoles.includes(user.role)) {
    redirect("/onboarding");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader icon={<Users />} title="Hospital Staff Dashboard" />
      {children}
    </div>
  );
}