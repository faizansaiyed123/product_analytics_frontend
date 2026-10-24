import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { QueryEnvelope } from "@/types";
import { relativeTime } from "@/utils/format";
import { EmptyState, ErrorState, LoadingBlock } from "./ui/misc";

/** Standard loading / error / empty / success presentation for an insight query. */
export function InsightResult<T>({ q, ready, isEmpty, emptyTitle, emptyHint, children }: {
  q: UseQueryResult<QueryEnvelope<T>>; ready: boolean; isEmpty?: (r: T) => boolean; emptyTitle: string; emptyHint?: string; children: (r: T) => ReactNode;
}) {
  if (!ready) return <EmptyState title="Finish setting up the query" description={emptyHint ?? "Complete the highlighted fields above to see results."} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (q.isLoading || !q.data) return <LoadingBlock label="Running query" />;
  const r = q.data.result;
  if (isEmpty?.(r)) return <EmptyState title={emptyTitle} description="No events match this query in the selected date range. Try widening the range or removing filters." />;
  return (
    <div className={q.isFetching ? "opacity-70 transition-opacity" : ""} aria-busy={q.isFetching}>
      {children(r)}
      <p className="mt-3 text-right text-xs text-muted-foreground">{q.data.cached ? `Cached · ` : ""}computed {relativeTime(q.data.computed_at)} · {q.data.duration_ms} ms</p>
    </div>
  );
}
