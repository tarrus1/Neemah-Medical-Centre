import { getCurrentUser } from "@/actions/onboarding";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  UserPlus,
  Activity,
  Stethoscope,
  FlaskConical,
  Pill,
} from "lucide-react";

export default async function StaffHomePage() {
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

  const departments = [
    {
      name: "Reception",
      href: "/staff/reception",
      icon: <UserPlus className="h-8 w-8 text-emerald-400" />,
      description: "Register new patients",
      roles: ["RECEPTIONIST", "ADMIN", "DOCTOR"],
    },
    {
      name: "Triage",
      href: "/staff/triage",
      icon: <Activity className="h-8 w-8 text-emerald-400" />,
      description: "Patient triage & vital signs",
      roles: ["TRIAGE", "ADMIN", "DOCTOR"],
    },
    {
      name: "Doctor",
      href: "/staff/doctor",
      icon: <Stethoscope className="h-8 w-8 text-emerald-400" />,
      description: "Consultation & treatment",
      roles: ["DOCTOR", "ADMIN"],
    },
    {
      name: "Laboratory",
      href: "/staff/laboratory",
      icon: <FlaskConical className="h-8 w-8 text-emerald-400" />,
      description: "Lab tests & results",
      roles: ["LABORATORY", "ADMIN", "DOCTOR"],
    },
    {
      name: "Pharmacy",
      href: "/staff/pharmacy",
      icon: <Pill className="h-8 w-8 text-emerald-400" />,
      description: "Dispense medicine & pricing",
      roles: ["PHARMACY", "ADMIN", "DOCTOR"],
    },
  ];

  const visibleDepartments = departments.filter((dept) =>
    dept.roles.includes(user.role)
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Hospital Departments
        </h2>
        <p className="text-muted-foreground">
          Select a department to manage patients
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleDepartments.map((dept) => (
          <Link key={dept.href} href={dept.href}>
            <Card className="border-emerald-900/20 hover:border-emerald-700/40 transition-all cursor-pointer h-full">
              <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                <div className="p-4 bg-emerald-900/20 rounded-full">
                  {dept.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {dept.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {dept.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}