import Link from "next/link";
import Image from "next/image";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  Heart,
  ShieldCheck,
  MessageCircle,
  Activity,
  Stethoscope,
  Baby,
  Syringe,
  Users,
  HeartPulse,
  Apple,
  CalendarHeart,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "./ui/button";

// ─── Data ────────────────────────────────────────────────
const quickLinks = [
  { name: "Home", href: "/" },
  { name: "Services", href: "/doctors" },
  { name: "Book Appointment", href: "/doctors" },
  { name: "Sign In", href: "/sign-in" },
  { name: "Sign Up", href: "/sign-up" },
];

const services = [
  { name: "Online Consultation",    href: "/doctors", icon: MessageCircle },
  { name: "Minor Surgeries",        href: "/doctors", icon: Activity },
  { name: "Diabetes & Hypertension", href: "/doctors", icon: HeartPulse },
  { name: "Immunization",           href: "/doctors", icon: Syringe },
  { name: "Paediatric Clinic",      href: "/doctors", icon: Baby },
  { name: "Counselling",            href: "/doctors", icon: Users },
  { name: "Nutritional Services",   href: "/doctors", icon: Apple },
  { name: "Family Planning",        href: "/doctors", icon: CalendarHeart },
  { name: "ANC / PNC",              href: "/doctors", icon: Stethoscope },
];

const WHATSAPP_NUMBER = "254792195454";
const WHATSAPP_DISPLAY = "+254 792 195 454";

// ─── Component ───────────────────────────────────────────
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-border/60 bg-muted/30">
      {/* Subtle glow accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-emerald-500/5 blur-3xl" />

      <div className="relative container mx-auto px-4 py-12 sm:py-16">
        {/* ─── Top grid ───────────────────────────── */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">

          {/* ─── Brand + newsletter ─────────────────── */}
          <div className="space-y-5 sm:col-span-2 lg:col-span-1">
            {/* Logo + name — visible on all screens */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-card">
                <Image
                  src="/logo.png"
                  alt="Neemah Medical Centre"
                  width={48}
                  height={48}
                  className="h-10 w-10 object-contain"
                  priority={false}
                />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-base font-semibold tracking-tight text-foreground">
                  Neemah<span className="text-primary">.</span>
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Medical Centre
                </span>
              </div>
            </Link>

            <p className="text-sm leading-relaxed text-muted-foreground">
              Compassionate, modern healthcare for you and your family —
              available online and in-person at Neemah Medical Centre.
            </p>

            {/* Newsletter */}
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-foreground">
                Get health tips & updates
              </p>
              <form className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="w-full rounded-md border border-border/60 bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <Button
                  type="submit"
                  size="icon"
                  className="shrink-0 focus-ring"
                  aria-label="Subscribe"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>

          {/* ─── Quick links ───────────────────────── */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Quick Links
            </h3>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.name}
                    <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ─── Services ──────────────────────────── */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground">
              <Stethoscope className="h-3.5 w-3.5 text-primary" />
              Our Services
            </h3>
            <ul className="space-y-2.5">
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <li key={service.name}>
                    <Link
                      href={service.href}
                      className="group inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-primary" />
                      {service.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ─── Contact ───────────────────────────── */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground">
              <Phone className="h-3.5 w-3.5 text-primary" />
              Get in Touch
            </h3>

            <ul className="space-y-3.5 text-sm">
              <li className="flex items-start gap-3 text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>Neemah Medical Centre, Mogotio, Kenya</span>
              </li>

              <li className="flex items-start gap-3 text-muted-foreground">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="flex flex-col">
                  <a
                    href="tel:0180363450"
                    className="transition-colors hover:text-primary"
                  >
                    0180 363 450
                  </a>
                  <a
                    href={`tel:+${WHATSAPP_NUMBER}`}
                    className="transition-colors hover:text-primary"
                  >
                    {WHATSAPP_DISPLAY}
                  </a>
                </div>
              </li>

              <li className="flex items-start gap-3 text-muted-foreground">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <a
                  href="mailto:neemahmedical@gmail.com"
                  className="break-all transition-colors hover:text-primary"
                >
                  neemahmedical@gmail.com
                </a>
              </li>

              <li className="flex items-start gap-3 text-muted-foreground">
                <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi%2C%20I%27d%20like%20to%20book%20an%20appointment`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-primary"
                >
                  Chat on WhatsApp
                </a>
              </li>

              <li className="flex items-start gap-3 text-muted-foreground">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>Mon – Sat: 8:00 AM – 8:00 PM</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ─── Trust badges ───────────────────────── */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3 border-t border-border/60 pt-8 text-xs text-muted-foreground sm:gap-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Licensed Medical Facility
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1.5">
            <Heart className="h-3.5 w-3.5 text-primary" />
            Patient-First Care
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" />
            Mon – Sat Support
          </span>
        </div>

        {/* ─── Bottom bar ─────────────────────────── */}
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground md:flex-row">
          <p>© {year} Neemah Medical Centre. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}