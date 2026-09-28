import { getCurrentUser } from "@/actions/onboarding";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  Activity,
  Stethoscope,
  FlaskConical,
  Pill,
  Wallet,
  ArrowRight,
  Sparkles,
} from "lucide-react";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

const DEPARTMENTS = [
  {
    key: "reception",
    name: "Reception",
    href: "/staff/reception",
    icon: UserPlus,
    tagline: "Front desk & registration",
    description: "Register new patients, print receipts, and manage intake.",
    roles: ["RECEPTIONIST", "ADMIN", "DOCTOR"],
    accent: "from-sky-500/20 to-cyan-500/10 text-sky-400 border-sky-500/30",
    glow: "group-hover:shadow-sky-500/20",
  },
  {
    key: "triage",
    name: "Triage",
    href: "/staff/triage",
    icon: Activity,
    tagline: "Vitals & screening",
    description: "Record requested vitals and hand off to the doctor.",
    roles: ["TRIAGE", "ADMIN", "DOCTOR"],
    accent: "from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30",
    glow: "group-hover:shadow-amber-500/20",
  },
  {
    key: "doctor",
    name: "Doctor",
    href: "/staff/doctor",
    icon: Stethoscope,
    tagline: "Consultation & treatment",
    description: "Review vitals, prescribe treatment, and order tests.",
    roles: ["DOCTOR", "ADMIN"],
    accent: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30",
    glow: "group-hover:shadow-emerald-500/20",
  },
  {
    key: "laboratory",
    name: "Laboratory",
    href: "/staff/laboratory",
    icon: FlaskConical,
    tagline: "Tests & results",
    description: "Run requested tests and report results.",
    roles: ["LABORATORY", "ADMIN", "DOCTOR"],
    accent: "from-violet-500/20 to-purple-500/10 text-violet-400 border-violet-500/30",
    glow: "group-hover:shadow-violet-500/20",
  },
  {
    key: "pharmacy",
    name: "Pharmacy",
    href: "/staff/pharmacy",
    icon: Pill,
    tagline: "Dispense & inventory",
    description: "Dispense medicine, manage stock, and record sales.",
    roles: ["PHARMACY", "ADMIN", "DOCTOR"],
    accent: "from-rose-500/20 to-pink-500/10 text-rose-400 border-rose-500/30",
    glow: "group-hover:shadow-rose-500/20",
  },
  {
    key: "cashier",
    name: "Cashier",
    href: "/staff/cashier",
    icon: Wallet,
    tagline: "Payments & receipts",
    description: "Collect payment, issue receipts, and close visits.",
    roles: ["CASHIER", "ADMIN", "RECEPTIONIST", "DOCTOR"],
    accent: "from-emerald-500/20 to-lime-500/10 text-emerald-400 border-emerald-500/30",
    glow: "group-hover:shadow-emerald-500/20",
  },
];

export default async function StaffHomePage() {
  const user = await getCurrentUser();

  const allowedRoles = [
    "RECEPTIONIST",
    "TRIAGE",
    "DOCTOR",
    "LABORATORY",
    "PHARMACY",
    "CASHIER",
    "ADMIN",
  ];

  if (!user || !allowedRoles.includes(user.role)) {
    redirect("/onboarding");
  }

  const visibleDepartments = DEPARTMENTS.filter((d) =>
    d.roles.includes(user.role)
  );

  return (
    <div className="space-y-10">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-card to-card p-8 shadow-sm">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-4">
          <Badge
            variant="outline"
            className="w-fit border-primary/30 bg-primary/10 text-primary"
          >
            <Sparkles className="mr-1 h-3 w-3" />
            {user.role.replace("_", " ")}
          </Badge>

          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              {getGreeting()}, {user.name?.split(" ")[0] || "Staff"}.
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
              Serving with skill, healing with heart.
              <br/> Welcome to your station.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Compassion first
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              Patient-centred
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Excellence always
            </span>
          </div>
        </div>
      </div>

      {/* ── Stations ── */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Your stations
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {visibleDepartments.length} station
              {visibleDepartments.length === 1 ? "" : "s"} available to you
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleDepartments.map((dept) => {
            const Icon = dept.icon;
            return (
              <Link key={dept.key} href={dept.href} className="group">
                <Card
                  className={`relative h-full overflow-hidden border-border/60 transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:shadow-lg ${dept.glow}`}
                >
                  {/* Color accent bar */}
                  <div
                    className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${dept.accent}`}
                  />

                  {/* Blur glow on hover */}
                  <div
                    className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${dept.accent} opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-100`}
                  />

                  <CardContent className="relative flex h-full flex-col gap-4 p-6">
                    <div className="flex items-start justify-between">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${dept.accent} border`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-foreground" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-foreground">
                          {dept.name}
                        </h3>
                      </div>
                      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {dept.tagline}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {dept.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-medium text-primary opacity-70 transition-opacity group-hover:opacity-100">
                      Open station
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}