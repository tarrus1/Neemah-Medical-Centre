import { checkUser } from "@/lib/checkUser";
import HeaderNav from "./header-nav";

export default async function Header() {
  const user = await checkUser();

  const isStaff =
    user?.role === "RECEPTIONIST" ||
    user?.role === "TRIAGE" ||
    user?.role === "LABORATORY" ||
    user?.role === "PHARMACY" ||
    user?.role === "CASHIER" ||
    user?.role === "DOCTOR" ||
    user?.role === "ADMIN";

  const canAccessLab =
    user?.role === "LABORATORY" ||
    user?.role === "DOCTOR" ||
    user?.role === "ADMIN";

  const canAccessPharmacy =
    user?.role === "PHARMACY" ||
    user?.role === "DOCTOR" ||
    user?.role === "ADMIN";

  const navItems = [];
  if (user?.role === "ADMIN")        navItems.push({ href: "/admin",            label: "Admin",      icon: "ShieldCheck" });
  if (user?.role === "DOCTOR")       navItems.push({ href: "/doctor",           label: "Doctor",     icon: "Stethoscope" });
  if (canAccessLab)                  navItems.push({ href: "/staff/laboratory", label: "Laboratory", icon: "FlaskConical" });
  if (canAccessPharmacy)             navItems.push({ href: "/staff/pharmacy",   label: "Pharmacy",   icon: "Pill" });
  if (user?.role === "CASHIER")      navItems.push({ href: "/staff/cashier",    label: "Cashier",    icon: "Wallet" });
  if (isStaff)                       navItems.push({ href: "/staff",            label: "Staff",      icon: "Users" });
  if (user?.role === "PATIENT")      navItems.push({ href: "/appointments",     label: "Appointments", icon: "Calendar" });
  if (user?.role === "UNASSIGNED")   navItems.push({ href: "/onboarding",       label: "Complete Profile", icon: "User" });

  return <HeaderNav navItems={navItems} userRole={user?.role} />;
}