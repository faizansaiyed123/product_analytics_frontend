import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/services/endpoints";
import type { AnalyticsQuery, QueryEnvelope } from "@/types";

/** Runs a structured analytics query. Disabled until `enabled` (e.g. all filters/steps complete). */
export function useInsight<T>(projectId: string | undefined, query: AnalyticsQuery | null, enabled = true) {
  return useQuery<QueryEnvelope<T>>({
    queryKey: ["insight", projectId, query],
    queryFn: () => analyticsApi.query<T>(projectId!, query!),
    enabled: !!projectId && !!query && enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
