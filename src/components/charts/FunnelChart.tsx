import type { FunnelResult, FunnelStepResult } from "@/types";
import { fmtDuration, fmtNum, fmtPct } from "@/utils/format";

function Steps({ steps }: { steps: FunnelStepResult[] }) {
  const max = Math.max(steps[0]?.count ?? 0, 1);
  return (
    <ol className="space-y-3">
      {steps.map((s) => (
        <li key={s.order}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium">
              <span className="mr-2 text-muted-foreground tabular">{s.order}.</span>
              {s.label}
            </span>
            <span className="tabular">
              <b>{fmtNum(s.count)}</b>{" "}
              <span className="text-muted-foreground">users · {fmtPct(s.overall_conversion_rate)} of first step</span>
            </span>
          </div>
          <div className="h-8 overflow-hidden rounded bg-muted" role="img" aria-label={`${s.label}: ${s.count} users`}>
            <div
              className="h-full rounded bg-primary/80"
              style={{ width: `${(s.count / max) * 100}%`, minWidth: s.count > 0 ? 3 : 0 }}
            />
          </div>
          {s.order > 1 && (
            <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted-foreground tabular">
              <span>
                Conversion from previous: <b className="text-foreground">{fmtPct(s.conversion_rate)}</b>
              </span>
              <span>
                Drop-off:{" "}
                <b className="text-danger">
                  {fmtNum(s.dropoff_count)} ({fmtPct(s.dropoff_rate)})
                </b>
              </span>
              <span>Median time: {fmtDuration(s.median_time_to_convert_seconds)}</span>
              <span>Avg time: {fmtDuration(s.avg_time_to_convert_seconds)}</span>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

export function FunnelChart({ result }: { result: FunnelResult }) {
  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-semibold tabular" data-testid="overall-conversion">
          {fmtPct(result.overall_conversion_rate)}
        </span>
        <span className="text-sm text-muted-foreground">overall conversion</span>
      </div>
      <Steps steps={result.steps} />
      {result.breakdowns && result.breakdowns.length > 0 && (
        <div className="space-y-2 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">By breakdown value</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-1 pr-3 font-medium">Value</th>
                  {result.steps.map((s) => (
                    <th key={s.order} className="px-3 py-1 text-right font-medium">
                      {s.label}
                    </th>
                  ))}
                  <th className="py-1 pl-3 text-right font-medium">Overall</th>
                </tr>
              </thead>
              <tbody>
                {result.breakdowns.map((b) => (
                  <tr key={b.value} className="border-t border-border/60">
                    <td className="py-1.5 pr-3 font-medium">{b.value}</td>
                    {b.steps.map((s) => (
                      <td key={s.order} className="px-3 py-1.5 text-right tabular">
                        {fmtNum(s.count)}
                      </td>
                    ))}
                    <td className="py-1.5 pl-3 text-right tabular">{fmtPct(b.overall_conversion_rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
