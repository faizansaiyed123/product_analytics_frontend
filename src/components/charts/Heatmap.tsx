import type { RetentionResult } from "@/types";
import { fmtNum, fmtPct } from "@/utils/format";

const cellStyle = (rate: number | null) =>
  rate === null ? {} : { backgroundColor: `hsl(var(--primary) / ${Math.min(0.08 + rate * 0.85, 0.93).toFixed(2)})`, color: rate > 0.55 ? "hsl(var(--primary-foreground))" : undefined };

export function RetentionHeatmap({ result, interval }: { result: RetentionResult; interval: string }) {
  const unit = interval === "day" ? "Day" : interval === "week" ? "Week" : "Month";
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0.5 text-xs" aria-label="Retention heatmap">
        <thead>
          <tr><th scope="col" className="px-2 py-1.5 text-left font-medium text-muted-foreground">Cohort</th><th scope="col" className="px-2 py-1.5 text-right font-medium text-muted-foreground">Users</th>
            {result.offsets.map((o) => <th key={o} scope="col" className="min-w-[3.5rem] px-2 py-1.5 text-center font-medium text-muted-foreground">{unit} {o}</th>)}</tr>
        </thead>
        <tbody>
          {result.cohorts.map((c) => (
            <tr key={c.period}>
              <th scope="row" className="whitespace-nowrap px-2 py-1.5 text-left font-medium tabular">{c.period}</th>
              <td className="px-2 py-1.5 text-right tabular text-muted-foreground">{fmtNum(c.size)}</td>
              {c.cells.map((cell) => (
                <td key={cell.offset} className="rounded px-2 py-1.5 text-center tabular" style={cellStyle(cell.rate)} title={cell.count === null ? "Period has not happened yet" : `${fmtNum(cell.count)} of ${fmtNum(c.size)} users`}>
                  {cell.rate === null ? <span className="text-muted-foreground/60">–</span> : fmtPct(cell.rate, 0)}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <th scope="row" className="px-2 py-1.5 text-left font-semibold">Average</th><td />
            {result.average.map((cell) => <td key={cell.offset} className="px-2 py-1.5 text-center font-semibold tabular" style={cellStyle(cell.rate)}>{cell.rate === null ? "–" : fmtPct(cell.rate, 0)}</td>)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
