import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Download, Search, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { EventPicker } from "@/components/EventPicker";
import { FilterBuilder } from "@/components/FilterBuilder";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
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
import { downloadUrl } from "@/services/api";
import { exploreApi } from "@/services/endpoints";
import type { EventRow, Filter } from "@/types";
import { activeFilters } from "@/utils/filters";
import { fmtDateTime } from "@/utils/format";

function Json({ value }: { value: unknown }) {
  return (
    <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

type EventDetailProps = {
  projectId: string;
  id: string | null;
  onClose: () => void;
  tz: string | null;
};

export function EventDetail({
  projectId,
  id,
  onClose,
  tz,
}: EventDetailProps) {
  const eventQuery = useQuery({
    queryKey: ["event", id],
    queryFn: () =>
      exploreApi.event(projectId, id!),
    enabled: !!id,
  });

  const event = eventQuery.data;

  return (
    <Dialog
      open={!!id}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      wide
      title={event?.event ?? "Event"}
      description={
        event
          ? fmtDateTime(event.timestamp, tz)
          : undefined
      }
    >
      {eventQuery.isError ? (
        <ErrorState error={eventQuery.error} />
      ) : !event ? (
        <LoadingBlock
          label="Loading event"
          height="h-40"
        />
      ) : (
        <div className="space-y-4 text-sm">
          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
              Properties
            </h3>
            <Json value={event.properties} />
          </section>

          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
              User
            </h3>

            <p>
              <Link
                className="text-primary hover:underline"
                to={`/users/${event.person_id}`}
              >
                {event.distinct_id}
              </Link>
              {event.anonymous_id && (
                <span className="text-muted-foreground">
                  {" "}
                  (anonymous id {event.anonymous_id})
                </span>
              )}
            </p>

            {event.person && (
              <Json value={event.person.properties} />
            )}
          </section>

          <section className="grid grid-cols-2 gap-x-6 gap-y-1">
            <h3 className="col-span-2 mb-1 text-xs font-semibold uppercase text-muted-foreground">
              Request &amp; device
            </h3>

            {[
              [
                "Browser",
                [
                  event.device.browser,
                  event.device.browser_version,
                ]
                  .filter(Boolean)
                  .join(" "),
              ],
              [
                "OS",
                [
                  event.device.os,
                  event.device.os_version,
                ]
                  .filter(Boolean)
                  .join(" "),
              ],
              ["Device", event.device.device_type],
              ["Country", event.country],
              ["IP", event.ip],
              ["Path", event.path],
              ["Host", event.hostname],
              [
                "Received",
                fmtDateTime(
                  event.received_at,
                  tz,
                ),
              ],
              ["Event ID", event.id],
            ].map(([label, value]) => (
              <div
                key={label as string}
                className="flex justify-between gap-2 border-b border-border/50 py-1"
              >
                <span className="text-muted-foreground">
                  {label}
                </span>
                <span className="truncate font-mono text-xs">
                  {value || "–"}
                </span>
              </div>
            ))}
          </section>

          {event.user_agent && (
            <p className="break-all font-mono text-xs text-muted-foreground">
              {event.user_agent}
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
}

export function EventsPage() {
  const project = useWorkspaceProject();
  const { date_range, timezone } = useRange();

  const [eventName, setEventName] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<
    Filter[]
  >([]);
  const [selectedEventId, setSelectedEventId] =
    useState<string | null>(null);

  const active = activeFilters(filters);

  const dateParams = date_range.preset
    ? { preset: date_range.preset }
    : {
        date_from: date_range.from,
        date_to: date_range.to,
      };

  const params = {
    project_id: project.id,
    event: eventName || undefined,
    search: search || undefined,
    filters: active.length
      ? JSON.stringify(active)
      : undefined,
    timezone: timezone ?? undefined,
    ...dateParams,
  };

  const eventsQuery = useInfiniteQuery({
    queryKey: ["events", params],
    initialPageParam: undefined as
      | string
      | undefined,
    queryFn: ({ pageParam }) =>
      exploreApi.events({
        ...params,
        cursor: pageParam,
        limit: 50,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.next_cursor ?? undefined,
  });

  const events: EventRow[] =
    eventsQuery.data?.pages.flatMap(
      (page) => page.items,
    ) ?? [];

  const exportUrl = downloadUrl(
    "/export/events",
    {
      project_id: project.id,
      format: "csv",
      event: eventName || undefined,
      ...dateParams,
      filters: active.length
        ? JSON.stringify(active)
        : undefined,
    },
  );

  const timezoneName =
    timezone || project.settings.timezone;

  return (
    <>
      <PageHeader
        title="Events"
        description="Live stream of raw events. Click a row to inspect properties, user and device metadata."
        actions={
          <a href={exportUrl}>
            <Button>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </a>
        }
      />

      <Card className="mb-5">
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-60">
              <EventPicker
                projectId={project.id}
                value={eventName}
                onChange={setEventName}
                label="Event name"
                placeholder="Any event"
              />
            </div>

            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Search events"
                className="pl-8"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search name, user or path"
              />

              {search && (
                <button
                  className="absolute right-2 top-2"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <FilterBuilder
            projectId={project.id}
            filters={filters}
            onChange={setFilters}
          />
        </CardBody>
      </Card>

      <Card>
        {eventsQuery.isError ? (
          <ErrorState
            error={eventsQuery.error}
            onRetry={() => eventsQuery.refetch()}
          />
        ) : eventsQuery.isLoading ? (
          <CardBody>
            <LoadingBlock label="Loading events" />
          </CardBody>
        ) : !events.length ? (
          <EmptyState
            title="No events found"
            description="Nothing matches these filters in the selected date range."
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Time</Th>
                  <Th>Event</Th>
                  <Th>User</Th>
                  <Th>Path</Th>
                  <Th>Properties</Th>
                </tr>
              </thead>

              <tbody>
                {events.map((event) => (
                  <tr
                    key={event.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`Inspect ${event.event} event`}
                    className="cursor-pointer hover:bg-muted/60 focus-visible:bg-muted"
                    onClick={() =>
                      setSelectedEventId(event.id)
                    }
                    onKeyDown={(keyboardEvent) => {
                      if (
                        keyboardEvent.key === "Enter" ||
                        keyboardEvent.key === " "
                      ) {
                        keyboardEvent.preventDefault();
                        setSelectedEventId(event.id);
                      }
                    }}
                  >
                    <Td className="whitespace-nowrap tabular text-xs">
                      {fmtDateTime(
                        event.timestamp,
                        timezoneName,
                      )}
                    </Td>
                    <Td>
                      <Badge tone="primary">
                        {event.event}
                      </Badge>
                    </Td>
                    <Td className="max-w-[12rem] truncate font-mono text-xs">
                      {event.distinct_id}
                    </Td>
                    <Td className="max-w-[12rem] truncate font-mono text-xs">
                      {event.path ?? "–"}
                    </Td>
                    <Td className="max-w-xs truncate font-mono text-xs text-muted-foreground">
                      {JSON.stringify(
                        event.properties,
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
              <span>
                {events.length} events loaded
              </span>

              {eventsQuery.hasNextPage ? (
                <Button
                  loading={
                    eventsQuery.isFetchingNextPage
                  }
                  onClick={() =>
                    eventsQuery.fetchNextPage()
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

      <EventDetail
        projectId={project.id}
        id={selectedEventId}
        onClose={() =>
          setSelectedEventId(null)
        }
        tz={timezoneName}
      />
    </>
  );
}
