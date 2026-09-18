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
} from "lucide-react";
import { Button } from "./ui/button";

// ─── Data ────────────────────────────────────────────────
const quickLinks = [
  { name: "Home", href: "/" },
  { name: "Services", href: "/services" },
  { name: "Book Appointment", href: "/services" },
  { name: "Sign In", href: "/sign-in" },
  { name: "Sign Up", href: "/sign-up" },
];

// Service links now point to the actual booking routes
const services = [
  { name: "Online Consultation", href: "/book/online-consultation" },
  { name: "Minor Surgeries", href: "/book/minor-surgeries" },
  { name: "Diabetes / Hypertension", href: "/book/diabetes-hypertension" },
  { name: "Immunization", href: "/book/immunization" },
  { name: "Paediatric Clinic", href: "/book/paediatric" },
  { name: "Counselling", href: "/book/counselling" },
  { name: "Nutritional Services", href: "/book/nutrition" },
  { name: "Family Planning", href: "/book/family-planning" },
  { name: "ANC", href: "/book/anc" },
  { name: "PNC", href: "/book/pnc" },
  { name: "MCH", href: "/book/mch" },
];

const WHATSAPP_NUMBER = "254792195454";
const WHATSAPP_DISPLAY = "+254 792 195 454";

// ─── Component ───────────────────────────────────────────
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative bg-muted/50 border-t border-emerald-900/20">
      {/* Subtle glow accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

      <div className="container mx-auto px-4 py-16">
        {/* Top grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">

          {/* ─── Brand + newsletter ─────────────────── */}
          <div className="space-y-6 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo-single.png"
                alt="Neemah Medical Centre"
                width={200}
                height={60}
                className="h-10 w-auto object-contain"
              />
            </Link>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Compassionate, modern healthcare for you and your family —
              available online and in-person at Neemah Medical Centre.
            </p>

            {/* Newsletter */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-white">
                Get health tips & updates
              </p>
              <form className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-emerald-900/30 bg-background text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <Button
                  type="submit"
                  size="icon"
                  className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
                  aria-label="Subscribe"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>

          {/* ─── Quick links ───────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Quick Links
            </h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-emerald-400 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ─── Services ──────────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Our Services
            </h3>
            <ul className="space-y-3">
              {services.map((service) => (
                <li key={service.name}>
                  <Link
                    href="/doctors"
                    className="text-sm text-muted-foreground hover:text-emerald-400 transition-colors"
                  >
                    {service.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ─── Contact ───────────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Get in Touch
            </h3>

            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3 text-muted-foreground">
                <MapPin className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>Neemah Medical Centre, Mogotio, Kenya</span>
              </li>

              <li className="flex items-start gap-3 text-muted-foreground">
                <Phone className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <div className="flex flex-col">
                  <a
                    href="tel:0180363450"
                    className="hover:text-emerald-400 transition-colors"
                  >
                    0180 363 450
                  </a>
                  <a
                    href={`tel:+${WHATSAPP_NUMBER}`}
                    className="hover:text-emerald-400 transition-colors"
                  >
                    {WHATSAPP_DISPLAY}
                  </a>
                </div>
              </li>

              <li className="flex items-start gap-3 text-muted-foreground">
                <Mail className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <a
                  href="mailto:neemahmedical@gmail.com"
                  className="hover:text-emerald-400 transition-colors"
                >
                  neemahmedical@gmail.com
                </a>
              </li>

              {/* ─── WhatsApp link (in contact list) ── */}
              <li className="flex items-start gap-3 text-muted-foreground">
                <MessageCircle className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi%2C%20I%27d%20like%20to%20book%20an%20appointment`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400 transition-colors"
                >
                  Chat on WhatsApp
                </a>
              </li>

              <li className="flex items-start gap-3 text-muted-foreground">
                <Clock className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>Mon – Sat: 8:00 AM – 8:00 PM</span>
              </li>
            </ul>

            {/* Socials */}
          </div>
        </div>

        {/* ─── Trust badges ───────────────────────── */}
        <div className="mt-12 pt-8 border-t border-emerald-900/20 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Licensed Medical Facility
          </span>
          <span className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-emerald-400" />
            Patient-First Care
          </span>
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-400" />
            Mon – Sat Support
          </span>
        </div>

        {/* ─── Bottom bar ─────────────────────────── */}
        <div className="mt-8 pt-6 border-t border-emerald-900/20 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {year} Neemah Medical Centre. All rights reserved.</p>

          
        </div>
      </div>
    </footer>
  );
}