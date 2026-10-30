import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { EventPicker } from "@/components/EventPicker";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import {
  ConfirmDialog,
  Dialog,
} from "@/components/ui/dialog";
import {
  Field,
  Input,
  Select,
} from "@/components/ui/input";
import {
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/components/ui/misc";
import { useWorkspaceProject } from "@/layouts/WorkspaceLayout";
import { messageFor } from "@/services/api";
import { savedApi } from "@/services/endpoints";
import { can } from "@/types";
import type {
  Cohort,
  CohortCriterion,
  CohortDefinition,
  Operator,
} from "@/types";
import {
  OPERATORS,
  coerceValue,
  opMeta,
} from "@/utils/filters";
import {
  fmtNum,
  relativeTime,
} from "@/utils/format";

const createBlankCriterion = (
  type: CohortCriterion["type"],
): CohortCriterion => {
  switch (type) {
    case "performed_event":
      return {
        type,
        event: "",
        operator: "at_least",
        count: 1,
        within_days: null,
      };

    case "not_performed_event":
      return {
        type,
        event: "",
        within_days: null,
      };

    case "person_property":
      return {
        type,
        property: "",
        operator: "equals",
        value: "",
      };

    case "first_seen":
      return {
        type,
        operator: "within_last_days",
        days: 30,
      };
  }
};

export const criterionComplete = (
  criterion: CohortCriterion,
): boolean => {
  switch (criterion.type) {
    case "performed_event":
    case "not_performed_event":
      return !!criterion.event.trim();

    case "person_property":
      return (
        !!criterion.property.trim() &&
        (!opMeta(criterion.operator).needsValue ||
          (criterion.value !== undefined &&
            criterion.value !== ""))
      );

    case "first_seen":
      return criterion.operator ===
        "within_last_days"
        ? !!criterion.days
        : !!criterion.date;
  }
};

function WithinDaysControl({
  value,
  onChange,
}: {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
}) {
  return (
    <>
      <span className="text-sm text-muted-foreground">
        in the last
      </span>
      <Input
        aria-label="Within days"
        type="number"
        min={1}
        className="w-20"
        value={value ?? ""}
        placeholder="any"
        onChange={(event) =>
          onChange(
            event.target.value
              ? Number(event.target.value)
              : null,
          )
        }
      />
      <span className="text-sm text-muted-foreground">
        days
      </span>
    </>
  );
}

function CriterionRow({
  projectId,
  criterion,
  onChange,
  onRemove,
}: {
  projectId: string;
  criterion: CohortCriterion;
  onChange: (criterion: CohortCriterion) => void;
  onRemove: () => void;
}) {
  const resetCriterionType = (
    type: CohortCriterion["type"],
  ) => {
    onChange(createBlankCriterion(type));
  };

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2"
      data-testid="criterion"
    >
      <Select
        aria-label="Criterion type"
        className="w-44"
        value={criterion.type}
        onChange={(event) =>
          resetCriterionType(
            event.target.value as CohortCriterion["type"],
          )
        }
      >
        <option value="performed_event">
          Performed event
        </option>
        <option value="not_performed_event">
          Did not perform event
        </option>
        <option value="person_property">
          User property
        </option>
        <option value="first_seen">
          First seen
        </option>
      </Select>

      {criterion.type === "performed_event" && (
        <>
          <div className="w-48">
            <EventPicker
              projectId={projectId}
              value={criterion.event}
              onChange={(event) =>
                onChange({
                  ...criterion,
                  event,
                })
              }
            />
          </div>

          <Select
            aria-label="Count operator"
            className="w-32"
            value={criterion.operator}
            onChange={(event) =>
              onChange({
                ...criterion,
                operator:
                  event.target.value as typeof criterion.operator,
              })
            }
          >
            <option value="at_least">
              at least
            </option>
            <option value="exactly">exactly</option>
            <option value="at_most">at most</option>
          </Select>

          <Input
            aria-label="Count"
            type="number"
            min={0}
            className="w-20"
            value={criterion.count}
            onChange={(event) =>
              onChange({
                ...criterion,
                count: Math.max(
                  0,
                  Number(event.target.value),
                ),
              })
            }
          />

          <span className="text-sm text-muted-foreground">
            times
          </span>

          <WithinDaysControl
            value={criterion.within_days}
            onChange={(within_days) =>
              onChange({
                ...criterion,
                within_days,
              })
            }
          />
        </>
      )}

      {criterion.type === "not_performed_event" && (
        <>
          <div className="w-48">
            <EventPicker
              projectId={projectId}
              value={criterion.event}
              onChange={(event) =>
                onChange({
                  ...criterion,
                  event,
                })
              }
            />
          </div>

          <WithinDaysControl
            value={criterion.within_days}
            onChange={(within_days) =>
              onChange({
                ...criterion,
                within_days,
              })
            }
          />
        </>
      )}

      {criterion.type === "person_property" && (
        <>
          <Input
            aria-label="Property name"
            className="w-40"
            value={criterion.property}
            placeholder="plan"
            onChange={(event) =>
              onChange({
                ...criterion,
                property: event.target.value,
              })
            }
          />

          <Select
            aria-label="Operator"
            className="w-36"
            value={criterion.operator}
            onChange={(event) => {
              const operator =
                event.target.value as Operator;

              onChange({
                ...criterion,
                operator,
                value: opMeta(operator).needsValue
                  ? criterion.value
                  : undefined,
              });
            }}
          >
            {OPERATORS.map((operator) => (
              <option
                key={operator.value}
                value={operator.value}
              >
                {operator.label}
              </option>
            ))}
          </Select>

          {opMeta(criterion.operator).needsValue && (
            <Input
              aria-label="Property value"
              className="w-44"
              value={
                Array.isArray(criterion.value)
                  ? criterion.value.join(", ")
                  : String(
                      criterion.value ?? "",
                    )
              }
              onChange={(event) =>
                onChange({
                  ...criterion,
                  value: coerceValue(
                    criterion.operator,
                    event.target.value,
                  ),
                })
              }
            />
          )}
        </>
      )}

      {criterion.type === "first_seen" && (
        <>
          <Select
            aria-label="First seen operator"
            className="w-44"
            value={criterion.operator}
            onChange={(event) =>
              onChange({
                ...criterion,
                operator:
                  event.target.value as typeof criterion.operator,
              })
            }
          >
            <option value="within_last_days">
              within the last
            </option>
            <option value="before">
              before date
            </option>
            <option value="after">
              on or after date
            </option>
          </Select>

          {criterion.operator ===
          "within_last_days" ? (
            <>
              <Input
                aria-label="Days"
                type="number"
                min={1}
                className="w-20"
                value={criterion.days ?? ""}
                onChange={(event) =>
                  onChange({
                    ...criterion,
                    days: Number(
                      event.target.value,
                    ),
                  })
                }
              />
              <span className="text-sm text-muted-foreground">
                days
              </span>
            </>
          ) : (
            <Input
              aria-label="Date"
              type="date"
              className="w-40"
              value={criterion.date ?? ""}
              onChange={(event) =>
                onChange({
                  ...criterion,
                  date: event.target.value,
                })
              }
            />
          )}
        </>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="ml-auto"
        aria-label="Remove criterion"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function CohortEditor({
  projectId,
  open,
  onClose,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [definition, setDefinition] =
    useState<CohortDefinition>({
      match: "all",
      criteria: [
        createBlankCriterion("performed_event"),
      ],
    });

  const complete =
    definition.criteria.length > 0 &&
    definition.criteria.every(criterionComplete);

  const previewQuery = useQuery({
    queryKey: [
      "cohort-preview",
      projectId,
      definition,
    ],
    queryFn: () =>
      savedApi.previewCohort(
        projectId,
        definition,
      ),
    enabled: open && complete,
  });

  useEffect(() => {
    if (!open) {
      setName("");
      setDefinition({
        match: "all",
        criteria: [
          createBlankCriterion("performed_event"),
        ],
      });
    }
  }, [open]);

  const saveCohort = useMutation({
    mutationFn: () =>
      savedApi.createCohort({
        project_id: projectId,
        name: name.trim(),
        definition,
      }),
    onSuccess: () => {
      toast.success("Cohort saved");
      queryClient.invalidateQueries({
        queryKey: ["cohorts"],
      });
      onClose();
    },
    onError: (error) =>
      toast.error(messageFor(error)),
  });

  const updateCriterion = (
    index: number,
    criterion: CohortCriterion,
  ) => {
    setDefinition({
      ...definition,
      criteria: definition.criteria.map(
        (current, currentIndex) =>
          currentIndex === index
            ? criterion
            : current,
      ),
    });
  };

  const removeCriterion = (index: number) => {
    setDefinition({
      ...definition,
      criteria: definition.criteria.filter(
        (_, currentIndex) =>
          currentIndex !== index,
      ),
    });
  };

  const addCriterion = () => {
    setDefinition({
      ...definition,
      criteria: [
        ...definition.criteria,
        createBlankCriterion("performed_event"),
      ],
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
      wide
      title="New cohort"
      description="People who match the criteria below. Membership is calculated live."
      footer={
        <>
          <span
            className="mr-auto self-center text-sm text-muted-foreground"
            aria-live="polite"
          >
            {complete
              ? previewQuery.isFetching
                ? "Counting…"
                : previewQuery.data
                  ? \`\${fmtNum(
                      previewQuery.data.count,
                    )} matching users\`
                  : ""
              : "Complete all criteria to preview"}
          </span>

          <Button onClick={onClose}>Cancel</Button>

          <Button
            variant="primary"
            disabled={!name.trim() || !complete}
            loading={saveCohort.isPending}
            onClick={() => saveCohort.mutate()}
          >
            Save cohort
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          {(id) => (
            <Input
              id={id}
              autoFocus
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
            />
          )}
        </Field>

        <div className="flex items-center gap-2 text-sm">
          Users who match{" "}
          <Select
            aria-label="Match mode"
            className="w-24"
            value={definition.match}
            onChange={(event) =>
              setDefinition({
                ...definition,
                match: event.target.value as
                  | "all"
                  | "any",
              })
            }
          >
            <option value="all">ALL</option>
            <option value="any">ANY</option>
          </Select>{" "}
          of:
        </div>

        <div className="space-y-2">
          {definition.criteria.map(
            (criterion, index) => (
              <CriterionRow
                key={index}
                projectId={projectId}
                criterion={criterion}
                onChange={(nextCriterion) =>
                  updateCriterion(
                    index,
                    nextCriterion,
                  )
                }
                onRemove={() =>
                  removeCriterion(index)
                }
              />
            ),
          )}
        </div>

        <Button
          size="sm"
          onClick={addCriterion}
        >
          <Plus className="h-3.5 w-3.5" />
          Add criterion
        </Button>
      </div>
    </Dialog>
  );
}

export function CohortsPage() {
  const project = useWorkspaceProject();
  const queryClient = useQueryClient();
  const canWrite = can(project.role, "member");

  const cohortsQuery = useQuery({
    queryKey: ["cohorts", project.id],
    queryFn: () => savedApi.cohorts(project.id),
  });

  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<Cohort | null>(null);

  const deleteCohort = useMutation({
    mutationFn: (cohort: Cohort) =>
      savedApi.deleteCohort(cohort.id),
    onSuccess: () => {
      toast.success("Cohort deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({
        queryKey: ["cohorts"],
      });
    },
    onError: (error) =>
      toast.error(messageFor(error)),
  });

  return (
    <>
      <PageHeader
        title="Cohorts"
        description="Reusable groups of users. Use them as filters in trends, funnels, retention and the user list."
        actions={
          canWrite && (
            <Button
              variant="primary"
              onClick={() => setCreating(true)}
            >
              <Plus className="h-4 w-4" />
              New cohort
            </Button>
          )
        }
      />

      <Card>
        {cohortsQuery.isLoading ? (
          <CardBody>
            <LoadingBlock
              label="Loading cohorts"
              height="h-32"
            />
          </CardBody>
        ) : cohortsQuery.isError ? (
          <ErrorState
            error={cohortsQuery.error}
            onRetry={() => cohortsQuery.refetch()}
          />
        ) : !cohortsQuery.data?.length ? (
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title="No cohorts yet"
            description="Create a cohort such as “performed purchase and logged in at least 3 times, plan = pro”."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Criteria</Th>
                <Th className="text-right">
                  Users
                </Th>
                <Th>Updated</Th>
                <Th />
              </tr>
            </thead>

            <tbody>
              {cohortsQuery.data.map((cohort) => (
                <tr key={cohort.id}>
                  <Td className="font-medium">
                    {cohort.name}
                  </Td>
                  <Td className="text-xs text-muted-foreground">
                    {cohort.definition.criteria.length}{" "}
                    criteria · match{" "}
                    {cohort.definition.match}
                  </Td>
                  <Td className="text-right tabular">
                    {fmtNum(cohort.last_count)}
                  </Td>
                  <Td>
                    {cohort.last_calculated_at
                      ? relativeTime(
                          cohort.last_calculated_at,
                        )
                      : "–"}
                  </Td>
                  <Td className="text-right">
                    <Link
                      className="mr-2 text-sm text-primary hover:underline"
                      to={\`/users?cohort=\${cohort.id}\`}
                    >
                      View users
                    </Link>

                    {canWrite && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger"
                        onClick={() =>
                          setDeleteTarget(cohort)
                        }
                      >
                        Delete
                      </Button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <CohortEditor
        projectId={project.id}
        open={creating}
        onClose={() => setCreating(false)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        danger
        title="Delete cohort?"
        confirmLabel="Delete"
        loading={deleteCohort.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            deleteCohort.mutate(deleteTarget);
          }
        }}
        description={\`“\${deleteTarget?.name}” will be removed. Saved reports that filter by it will stop working.\`}
      />
    </>
  );
}
