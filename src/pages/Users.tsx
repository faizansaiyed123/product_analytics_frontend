import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { FilterBuilder } from "@/components/FilterBuilder";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge, EmptyState, ErrorState, LoadingBlock, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { useRange } from "@/hooks/useRange";
import { useWorkspaceProject } from "@/layouts/WorkspaceLayout";
import { messageFor } from "@/services/api";
import { exploreApi, projectApi } from "@/services/endpoints";
import type { Filter, PersonRow } from "@/types";
import { can } from "@/types";
import { activeFilters } from "@/utils/filters";
import { fmtDateTime, fmtNum, relativeTime } from "@/utils/format";
import { EventDetail } from "./Events";

export function UsersPage() {
  const project = useWorkspaceProject();
  const [sp] = useSearchParams();
  const cohort = sp.get("cohort");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filter[]>(
    cohort ? [{ type: "cohort", cohort_id: cohort, negate: false }] : [],
  );
  const active = activeFilters(filters);
  const params = {
    project_id: project.id,
    search: search || undefined,
    filters: active.length ? JSON.stringify(active) : undefined,
  };
  const q = useInfiniteQuery({
    queryKey: ["users", params],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => exploreApi.users({ ...params, cursor: pageParam, limit: 50 }),
    getNextPageParam: (l) => l.next_cursor ?? undefined,
  });
  const rows: PersonRow[] = q.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <>
      <PageHeader
        title="Users"
        description="People after identity resolution: anonymous and identified activity of the same person is merged."
      />
      <Card className="mb-5">
        <CardBody className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Search users"
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, email or name"
            />
          </div>
          <FilterBuilder projectId={project.id} filters={filters} onChange={setFilters} />
        </CardBody>
      </Card>
      <Card>
        {q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : q.isLoading ? (
          <CardBody>
            <LoadingBlock label="Loading users" />
          </CardBody>
        ) : !rows.length ? (
          <EmptyState
            title="No users found"
            description="Users appear automatically when events arrive. Call identify() to attach an email and properties."
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>User</Th>
                  <Th>First seen</Th>
                  <Th>Last seen</Th>
                  <Th className="text-right">Events</Th>
                  <Th className="text-right">Sessions</Th>
                  <Th>Country</Th>
                  <Th>Device</Th>
                  <Th>Browser</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/60">
                    <Td>
                      <Link className="font-medium text-primary hover:underline" to={`/users/${u.id}`}>
                        {u.email || u.name || u.distinct_ids[u.distinct_ids.length - 1]}
                      </Link>
                      {!u.is_identified && <Badge className="ml-2">anonymous</Badge>}
                    </Td>
                    <Td className="whitespace-nowrap text-xs">{fmtDateTime(u.first_seen)}</Td>
                    <Td className="whitespace-nowrap text-xs">{relativeTime(u.last_seen)}</Td>
                    <Td className="text-right tabular">{fmtNum(u.event_count)}</Td>
                    <Td className="text-right tabular">{fmtNum(u.sessions)}</Td>
                    <Td>{u.country ?? "–"}</Td>
                    <Td>{u.device_type ?? "–"}</Td>
                    <Td>{u.browser ?? "–"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
              <span>{rows.length} users loaded</span>
              {q.hasNextPage ? (
                <Button loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
                  Load more
                </Button>
              ) : (
                <span>End of results</span>
              )}
            </div>
          </>
        )}
      </Card>
    </>
  );
}

export function UserDetailPage() {
  const { id = "" } = useParams();
  const project = useWorkspaceProject();
  const nav = useNavigate();
  const { timezone } = useRange();
  const [selected, setSelected] = useState<string | null>(null);
  const [erase, setErase] = useState(false);
  const user = useQuery({ queryKey: ["user", id], queryFn: () => exploreApi.user(id) });
  const tl = useInfiniteQuery({
    queryKey: ["timeline", id],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => exploreApi.timeline(id, { cursor: pageParam, limit: 100 }),
    getNextPageParam: (l) => l.next_cursor ?? undefined,
  });
  const del = useMutation({
    mutationFn: () => projectApi.eraseUser(project.id, id),
    onSuccess: () => {
      toast.success("User and their events were deleted");
      nav("/users");
    },
    onError: (e) => toast.error(messageFor(e)),
  });
  if (user.isError)
    return (
      <Card>
        <ErrorState error={user.error} onRetry={() => user.refetch()} />
      </Card>
    );
  if (!user.data) return <LoadingBlock label="Loading user" height="h-64" />;
  const u = user.data;
  const events = tl.data?.pages.flatMap((p) => p.items) ?? [];
  const tz = timezone || project.settings.timezone;
  const byDay = events.reduce<Record<string, typeof events>>((acc, e) => {
    const d = new Date(e.timestamp).toLocaleDateString("en-CA", { timeZone: tz });
    (acc[d] ??= []).push(e);
    return acc;
  }, {});
  return (
    <>
      <PageHeader
        title={u.email || u.name || u.distinct_ids[u.distinct_ids.length - 1]}
        description={
          <>
            User ID <code className="text-xs">{u.id}</code>
          </>
        }
        actions={
          can(project.role, "admin") && (
            <Button variant="danger" onClick={() => setErase(true)}>
              Delete user data
            </Button>
          )
        }
      />
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Profile" />
          <CardBody className="space-y-3 text-sm">
            <dl className="grid grid-cols-2 gap-y-2">
              {[
                ["First seen", fmtDateTime(u.first_seen, tz)],
                ["Last seen", fmtDateTime(u.last_seen, tz)],
                ["Events", fmtNum(u.event_count)],
                ["Sessions", fmtNum(u.sessions)],
                ["Country", u.country],
                ["Device", u.device_type],
                ["Browser", u.browser],
                ["OS", u.os],
              ].map(([k, v]) => (
                <div key={k as string} className="contents">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right">{v ?? "–"}</dd>
                </div>
              ))}
            </dl>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Identifiers</h3>
              <ul className="space-y-0.5">
                {u.distinct_ids.map((d) => (
                  <li key={d} className="font-mono text-xs">
                    {d}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Properties</h3>
              {Object.keys(u.properties).length ? (
                <pre className="overflow-auto rounded bg-muted p-2 font-mono text-xs">
                  {JSON.stringify(u.properties, null, 2)}
                </pre>
              ) : (
                <p className="text-muted-foreground">No properties. Call identify() with traits.</p>
              )}
            </div>
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Timeline" description="Newest first" />
          <CardBody>
            {tl.isLoading ? (
              <LoadingBlock label="Loading timeline" />
            ) : !events.length ? (
              <EmptyState title="No events" />
            ) : (
              <div className="space-y-4">
                {Object.entries(byDay).map(([day, list]) => (
                  <section key={day} aria-label={day}>
                    <h3 className="sticky top-14 mb-1 bg-card py-1 text-xs font-semibold text-muted-foreground">
                      {day}
                    </h3>
                    <ol className="relative space-y-1 border-l border-border pl-4">
                      {list.map((e) => (
                        <li key={e.id}>
                          <button
                            className="flex w-full items-center gap-3 rounded px-2 py-1 text-left text-sm hover:bg-muted"
                            onClick={() => setSelected(e.id)}
                          >
                            <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground tabular">
                              {new Date(e.timestamp).toLocaleTimeString("en-GB", { timeZone: tz, hour12: false })}
                            </span>
                            <span className="font-medium">{e.event}</span>
                            {e.path && (
                              <span className="truncate font-mono text-xs text-muted-foreground">{e.path}</span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ol>
                  </section>
                ))}
                {tl.hasNextPage && (
                  <Button loading={tl.isFetchingNextPage} onClick={() => tl.fetchNextPage()}>
                    Load older events
                  </Button>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
      <EventDetail projectId={project.id} id={selected} onClose={() => setSelected(null)} tz={tz} />
      <ConfirmDialog
        open={erase}
        onOpenChange={setErase}
        danger
        title="Delete this user's data?"
        confirmLabel="Delete permanently"
        loading={del.isPending}
        onConfirm={() => del.mutate()}
        description="The person and all of their events are permanently removed (right to erasure). This cannot be undone."
      />
    </>
  );
}
