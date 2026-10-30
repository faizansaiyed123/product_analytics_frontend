import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

export const Card = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("rounded-lg border border-border bg-card", className)} {...p} />
);
export const CardHeader = ({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) => (
  <div className={cn("flex items-start justify-between gap-3 border-b border-border px-4 py-3", className)}>
    <div className="min-w-0">
      <h2 className="truncate text-sm font-semibold">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
  </div>
);
export const CardBody = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-4", className)} {...p} />
);
