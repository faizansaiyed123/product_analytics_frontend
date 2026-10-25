import { BarChart3 } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  const { backendUnavailable } = useAuth();
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2 text-lg font-semibold"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><BarChart3 className="h-4 w-4" /></span>Product Analytics</div>
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h1 className="text-lg font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          {backendUnavailable && (
            <div role="status" aria-live="polite" className="mt-4 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Frontend preview only.</span> The backend API is not deployed or connected yet. Sign-in, registration, and live analytics will be available after the backend is deployed and connected.
            </div>
          )}
          <div className="mt-5">{children}</div>
        </div>
        {footer && <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </main>
  );
}
