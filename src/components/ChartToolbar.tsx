import { BarChart3, LineChart, Table2, TrendingUp } from "lucide-react";
import type { ChartType } from "@/types";
import { cn } from "@/utils/cn";

const ICONS: Record<ChartType, typeof LineChart> = { line: LineChart, area: TrendingUp, bar: BarChart3, table: Table2 };
export function ChartToolbar({ value, onChange }: { value: ChartType; onChange: (c: ChartType) => void }) {
  return (
    <div role="radiogroup" aria-label="Chart type" className="inline-flex rounded-md border border-border bg-muted p-0.5">
      {(Object.keys(ICONS) as ChartType[]).map((c) => {
        const Icon = ICONS[c];
        return <button key={c} type="button" role="radio" aria-checked={value === c} aria-label={`${c} chart`} title={c[0].toUpperCase() + c.slice(1)} onClick={() => onChange(c)}
          className={cn("rounded p-1.5", value === c ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}><Icon className="h-4 w-4" /></button>;
      })}
    </div>
  );
}
