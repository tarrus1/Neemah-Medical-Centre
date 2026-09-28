import { cn } from "@/lib/utils";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * Usage:
 *   <PageHeader title="Pharmacy" subtitle="..." breadcrumb={[{label:"Staff", href:"/staff"},{label:"Pharmacy"}]} action={<Button>...</Button>} />
 *   <PageHeader icon={<Users/>} title="..." />   // legacy shape still works
 */
export function PageHeader({
  icon,
  title,
  subtitle,
  breadcrumb,
  action,
  className,
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="space-y-1.5">
        {breadcrumb?.length ? (
          <nav className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            {breadcrumb.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                {c.href ? (
                  <Link href={c.href} className="hover:text-foreground transition-colors">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-foreground/80">{c.label}</span>
                )}
                {i < breadcrumb.length - 1 && <ChevronRight className="h-3 w-3" />}
              </span>
            ))}
          </nav>
        ) : null}

        <div className="flex items-center gap-2.5">
          {icon ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span>
            </span>
          ) : null}
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
        </div>

        {subtitle ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>

      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </div>
  );
}