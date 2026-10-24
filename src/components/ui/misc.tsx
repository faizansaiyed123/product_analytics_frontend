import { AlertTriangle, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";
import { messageFor } from "@/services/api";
import { Button } from "./button";

export const Skeleton = ({ className }: { className?: string }) => <div className={cn("skeleton", className)} aria-hidden />;

export function LoadingBlock({ label = "Loading", height = "h-64" }: { label?: string; height?: string }) {
  return <div role="status" aria-label={label} className={cn("flex flex-col gap-2", height)}><Skeleton className="h-4 w-1/3" /><Skeleton className="flex-1" /><span className="sr-only">{label}…</span></div>;
}

export function EmptyState({ title, description, action, icon }: { title: string; description?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="text-muted-foreground">{icon ?? <Inbox className="h-8 w-8" aria-hidden />}</div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <AlertTriangle className="h-7 w-7 text-danger" aria-hidden />
      <p className="text-sm font-medium">Something went wrong</p>
      <p className="max-w-md text-sm text-muted-foreground">{messageFor(error)}</p>
      {onRetry && <Button size="sm" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export const Badge = ({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "success" | "danger" | "warning" | "primary"; className?: string }) => (
  <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
    { neutral: "border-border bg-muted text-muted-foreground", success: "border-success/30 bg-success/10 text-success", danger: "border-danger/30 bg-danger/10 text-danger",
      warning: "border-warning/30 bg-warning/10 text-warning", primary: "border-primary/30 bg-accent text-primary" }[tone], className)}>{children}</span>
);

export const PageHeader = ({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) => (
  <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
    <div><h1 className="text-xl font-semibold tracking-tight">{title}</h1>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("overflow-x-auto", className)}><table className="w-full text-left text-sm">{children}</table></div>;
}
export const Th = ({ children, className }: { children?: ReactNode; className?: string }) => <th scope="col" className={cn("whitespace-nowrap border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground", className)}>{children}</th>;
export const Td = ({ children, className, colSpan }: { children?: ReactNode; className?: string; colSpan?: number }) => <td colSpan={colSpan} className={cn("border-b border-border/60 px-3 py-2 align-middle", className)}>{children}</td>;
