import {
  useInfiniteQuery,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { toast } from "sonner";

import { FilterBuilder } from "@/components/FilterBuilder";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardBody,
  CardHeader,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/components/ui/misc";
import { useRange } from "@/hooks/useRange";
import { useWorkspaceProject } from "@/layouts/WorkspaceLayout";
import { messageFor } from "@/services/api";
import {
  exploreApi,
  projectApi,
} from "@/services/endpoints";
import { can } from "@/types";
import type {
  Filter,
  PersonRow,
} from "@/types";
import { activeFilters } from "@/utils/filters";
import {
  fmtDateTime,
  fmtNum,
  relativeTime,
} from "@/utils/format";

import { EventDetail } from "./Events";

export function UsersPage() {
  const project = useWorkspaceProject();
  const [searchParams] = useSearchParams();
  const cohortId = searchParams.get("cohort");

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filter[]>(
    cohortId
      ? [
          {
            type: "cohort",
            cohort_id: cohortId,
            negate: false,
          },
        ]
      : [],
  );

  const active = activeFilters(filters);
  const params = {
    project_id: project.id,
    search: search || undefined,
    filters: active.length
      ? JSON.stringify(active)
      : undefined,
  };

  const usersQuery = useInfiniteQuery({
    queryKey: ["users", params],
    initialPageParam: undefined as
      | string
      | undefined,
    queryFn: ({ pageParam }) =>
      exploreApi.users({
        ...params,
        cursor: pageParam,
        limit: 50,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.next_cursor ?? undefined,
  });

  const users: PersonRow[] =
    usersQuery.data?.pages.flatMap(
      (page) => page.items,
    ) ?? [];

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
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search by ID, email or name"
            />
          </div>

          <FilterBuilder
            projectId={project.id}
            filters={filters}
            onChange={setFilters}
          />
        </CardBody>
      </Card>

      <Card>
        {usersQuery.isError ? (
          <ErrorState
            error={usersQuery.error}
            onRetry={() => usersQuery.refetch()}
          />
        ) : usersQuery.isLoading ? (
          <CardBody>
            <LoadingBlock label="Loading users" />
          </CardBody>
        ) : !users.length ? (
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
                  <Th className="text-right">
                    Events
                  </Th>
                  <Th className="text-right">
                    Sessions
                  </Th>
                  <Th>Country</Th>
                  <Th>Device</Th>
                  <Th>Browser</Th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => {
                  const displayName =
                    user.email ||
                    user.name ||
                    user.distinct_ids[
                      user.distinct_ids.length - 1
                    ];

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-muted/60"
                    >
                      <Td>
                        <Link
                          className="font-medium text-primary hover:underline"
                          to={`/users/${user.id}`}
                        >
                          {displayName}
                        </Link>

                        {!user.is_identified && (
                          <Badge className="ml-2">
                            anonymous
                          </Badge>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap text-xs">
                        {fmtDateTime(user.first_seen)}
                      </Td>
                      <Td className="whitespace-nowrap text-xs">
                        {relativeTime(user.last_seen)}
                      </Td>
                      <Td className="text-right tabular">
                        {fmtNum(user.event_count)}
                      </Td>
                      <Td className="text-right tabular">
                        {fmtNum(user.sessions)}
                      </Td>
                      <Td>{user.country ?? "–"}</Td>
                      <Td>
                        {user.device_type ?? "–"}
                      </Td>
                      <Td>
                        {user.browser ?? "–"}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>

            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
              <span>
                {users.length} users loaded
              </span>

              {usersQuery.hasNextPage ? (
                <Button
                  loading={
                    usersQuery.isFetchingNextPage
                  }
                  onClick={() =>
                    usersQuery.fetchNextPage()
                  }
                >
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
  const navigate = useNavigate();
  const { timezone } = useRange();

  const [selectedEventId, setSelectedEventId] =
    useState<string | null>(null);
  const [eraseOpen, setEraseOpen] = useState(false);

  const userQuery = useQuery({
    queryKey: ["user", id],
    queryFn: () => exploreApi.user(id),
  });

  const timelineQuery = useInfiniteQuery({
    queryKey: ["timeline", id],
    initialPageParam: undefined as
      | string
      | undefined,
    queryFn: ({ pageParam }) =>
      exploreApi.timeline(id, {
        cursor: pageParam,
        limit: 100,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.next_cursor ?? undefined,
  });

  const eraseUser = useMutation({
    mutationFn: () =>
      projectApi.eraseUser(project.id, id),
    onSuccess: () => {
      toast.success(
        "User and their events were deleted",
      );
      navigate("/users");
    },
    onError: (error) =>
      toast.error(messageFor(error)),
  });

  if (userQuery.isError) {
    return (
      <Card>
        <ErrorState
          error={userQuery.error}
          onRetry={() => userQuery.refetch()}
        />
      </Card>
    );
  }

  if (!userQuery.data) {
    return (
      <LoadingBlock
        label="Loading user"
        height="h-64"
      />
    );
  }

  const user = userQuery.data;
  const events =
    timelineQuery.data?.pages.flatMap(
      (page) => page.items,
    ) ?? [];

  const timezoneName =
    timezone || project.settings.timezone;

  const eventsByDay = events.reduce<
    Record<string, typeof events>
  >((groups, event) => {
    const day = new Date(
      event.timestamp,
    ).toLocaleDateString("en-CA", {
      timeZone: timezoneName,
    });

    (groups[day] ??= []).push(event);
    return groups;
  }, {});

  const displayName =
    user.email ||
    user.name ||
    user.distinct_ids[
      user.distinct_ids.length - 1
    ];

  return (
    <>
      <PageHeader
        title={displayName}
        description={
          <>
            User ID{" "}
            <code className="text-xs">
              {user.id}
            </code>
          </>
        }
        actions={
          can(project.role, "admin") && (
            <Button
              variant="danger"
              onClick={() => setEraseOpen(true)}
            >
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
                [
                  "First seen",
                  fmtDateTime(
                    user.first_seen,
                    timezoneName,
                  ),
                ],
                [
                  "Last seen",
                  fmtDateTime(
                    user.last_seen,
                    timezoneName,
                  ),
                ],
                ["Events", fmtNum(user.event_count)],
                ["Sessions", fmtNum(user.sessions)],
                ["Country", user.country],
                ["Device", user.device_type],
                ["Browser", user.browser],
                ["OS", user.os],
              ].map(([label, value]) => (
                <div
                  key={label as string}
                  className="contents"
                >
                  <dt className="text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="text-right">
                    {value ?? "–"}
                  </dd>
                </div>
              ))}
            </dl>

            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                Identifiers
              </h3>
              <ul className="space-y-0.5">
                {user.distinct_ids.map(
                  (distinctId) => (
                    <li
                      key={distinctId}
                      className="font-mono text-xs"
                    >
                      {distinctId}
                    </li>
                  ),
                )}
              </ul>
            </div>

            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                Properties
              </h3>

              {Object.keys(user.properties).length ? (
                <pre className="overflow-auto rounded bg-muted p-2 font-mono text-xs">
                  {JSON.stringify(
                    user.properties,
                    null,
                    2,
                  )}
                </pre>
              ) : (
                <p className="text-muted-foreground">
                  No properties. Call identify() with
                  traits.
                </p>
              )}
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Timeline"
            description="Newest first"
          />

          <CardBody>
            {timelineQuery.isLoading ? (
              <LoadingBlock label="Loading timeline" />
            ) : !events.length ? (
              <EmptyState title="No events" />
            ) : (
              <div className="space-y-4">
                {Object.entries(eventsByDay).map(
                  ([day, dayEvents]) => (
                    <section
                      key={day}
                      aria-label={day}
                    >
                      <h3 className="sticky top-14 mb-1 bg-card py-1 text-xs font-semibold text-muted-foreground">
                        {day}
                      </h3>

                      <ol className="relative space-y-1 border-l border-border pl-4">
                        {dayEvents.map((event) => (
                          <li key={event.id}>
                            <button
                              className="flex w-full items-center gap-3 rounded px-2 py-1 text-left text-sm hover:bg-muted"
                              onClick={() =>
                                setSelectedEventId(
                                  event.id,
                                )
                              }
                            >
                              <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground tabular">
                                {new Date(
                                  event.timestamp,
                                ).toLocaleTimeString(
                                  "en-GB",
                                  {
                                    timeZone:
                                      timezoneName,
                                    hour12: false,
                                  },
                                )}
                              </span>

                              <span className="font-medium">
                                {event.event}
                              </span>

                              {event.path && (
                                <span className="truncate font-mono text-xs text-muted-foreground">
                                  {event.path}
                                </span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ol>
                    </section>
                  ),
                )}

                {timelineQuery.hasNextPage && (
                  <Button
                    loading={
                      timelineQuery.isFetchingNextPage
                    }
                    onClick={() =>
                      timelineQuery.fetchNextPage()
                    }
                  >
                    Load older events
                  </Button>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <EventDetail
        projectId={project.id}
        id={selectedEventId}
        onClose={() => setSelectedEventId(null)}
        tz={timezoneName}
      />

      <ConfirmDialog
        open={eraseOpen}
        onOpenChange={setEraseOpen}
        danger
        title="Delete this user's data?"
        confirmLabel="Delete permanently"
        loading={eraseUser.isPending}
        onConfirm={() => eraseUser.mutate()}
        description="The person and all of their events are permanently removed (right to erasure). This cannot be undone."
      />
    </>
  );
}
