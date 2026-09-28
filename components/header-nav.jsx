"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar, ShieldCheck, Stethoscope, User, Users,
  FlaskConical, Pill, Wallet,
} from "lucide-react";
import {
  SignedIn, SignedOut, SignInButton, UserButton,
} from "@clerk/nextjs";
import { Button } from "./ui/button";
import NotificationBell from "./notification-bell";
import { cn } from "@/lib/utils";

const ICONS = {
  Calendar, ShieldCheck, Stethoscope, User, Users, FlaskConical, Pill, Wallet,
};

export default function HeaderNav({ navItems, userRole }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        {/* ── Logo ── */}
        <Link href="/" className="flex shrink-0 items-center gap-3 group">
          <img
            src="/logo.png"
            alt="Neemah Medical Centre"
            className="h-10 w-10 object-contain md:h-11 md:w-11"
          />
          <div className="hidden flex-col leading-none sm:flex">
            <span className="text-lg font-semibold tracking-tight text-foreground">
              Neemah<span className="text-primary">.</span>
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Medical Centre
            </span>
          </div>
        </Link>

        {/* ── Center nav ── */}
        <SignedIn>
          <div className="hidden items-center gap-1 rounded-full border border-border/60 bg-card/60 p-1 md:flex">
            {navItems.map((item) => {
              const Icon = ICONS[item.icon];
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname?.startsWith(item.href + "/"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </SignedIn>

        {/* ── Right side ── */}
        <div className="flex items-center gap-2">
          <SignedOut>
            <SignInButton>
              <Button variant="default" size="sm">Sign In</Button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            {/* Notification bell — staff roles only */}
            <NotificationBell userRole={userRole} />

            {/* Mobile: compact icons */}
            {/* Mobile: compact icons — show all but keep it tidy */}
            <div className="flex items-center gap-0.5 sm:gap-1 md:hidden">
              {navItems.slice(0, 5).map((item) => {
                const Icon = ICONS[item.icon];
                const active = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent"
                    )}
                    aria-label={item.label}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                  </Link>
                );
              })}
            </div>

            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9 ring-2 ring-border",
                  userButtonPopoverCard: "shadow-xl border border-border",
                  userPreviewMainIdentifier: "font-semibold",
                },
              }}
              afterSignOutUrl="/"
            />
          </SignedIn>
        </div>
      </nav>
    </header>
  );
}