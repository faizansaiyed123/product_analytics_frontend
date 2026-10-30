import { useQuery } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import {
  useEffect,
  useId,
  useState,
} from "react";

import {
  exploreApi,
  savedApi,
} from "@/services/endpoints";
import type {
  Filter,
  PropertyFilter,
} from "@/types";
import {
  OPERATORS,
  coerceValue,
  newFilter,
  opMeta,
} from "@/utils/filters";

import { Button } from "./ui/button";
import { Input, Select } from "./ui/input";

type ValueInputProps = {
  projectId: string;
  filter: PropertyFilter;
  onChange: (value: unknown) => void;
};

function ValueInput({
  projectId,
  filter,
  onChange,
}: ValueInputProps) {
  const listId = useId();
  const meta = opMeta(filter.operator);

  const { data } = useQuery({
    queryKey: [
      "prop-values",
      projectId,
      filter.type,
      filter.property,
    ],
    enabled:
      !!filter.property &&
      meta.needsValue &&
      !meta.numeric,
    queryFn: () =>
      exploreApi.propertyValues(
        projectId,
        filter.property,
        filter.type,
      ),
    staleTime: 60_000,
  });

  const valueAsText = Array.isArray(filter.value)
    ? filter.value.join(", ")
    : filter.value === undefined ||
        filter.value === null
      ? ""
      : String(filter.value);

  // List values stay as raw text while the user types
  // so input such as "a, " is not rewritten on every keypress.
  const [rawValue, setRawValue] =
    useState(valueAsText);

  useEffect(() => {
    const normalizedValue = coerceValue(
      filter.operator,
      rawValue,
    );

    if (
      JSON.stringify(normalizedValue) !==
      JSON.stringify(filter.value)
    ) {
      setRawValue(valueAsText);
    }
    // The value/operator pair is intentionally the source
    // of truth for synchronizing the local typing state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.value, filter.operator]);

  if (!meta.needsValue) {
    return (
      <span className="px-2 text-xs text-muted-foreground">
        no value needed
      </span>
    );
  }

  const displayValue = meta.list
    ? rawValue
    : valueAsText;

  return (
    <>
      <Input
        aria-label="Filter value"
        list={listId}
        value={displayValue}
        inputMode={
          meta.numeric ? "decimal" : undefined
        }
        placeholder={
          meta.list ? "a, b, c" : "value"
        }
        onChange={(event) => {
          setRawValue(event.target.value);
          onChange(
            coerceValue(
              filter.operator,
              event.target.value,
            ),
          );
        }}
      />

      {!meta.list && (
        <datalist id={listId}>
          {(data ?? []).map((item) => (
            <option
              key={item.value}
              value={item.value}
            />
          ))}
        </datalist>
      )}
    </>
  );
}

type FilterBuilderProps = {
  projectId: string;
  filters: Filter[];
  onChange: (filters: Filter[]) => void;
  allowCohorts?: boolean;
};

export function FilterBuilder({
  projectId,
  filters,
  onChange,
  allowCohorts = true,
}: FilterBuilderProps) {
  const propertiesListId = useId();

  const { data: eventProperties } = useQuery({
    queryKey: ["props", projectId],
    queryFn: () =>
      exploreApi.properties(projectId),
    staleTime: 60_000,
  });

  const { data: cohorts } = useQuery({
    queryKey: ["cohorts", projectId],
    queryFn: () => savedApi.cohorts(projectId),
    enabled: allowCohorts,
    staleTime: 60_000,
  });

  const updatePropertyFilter = (
    index: number,
    patch: Partial<PropertyFilter>,
  ) => {
    onChange(
      filters.map((filter, currentIndex) =>
        currentIndex === index &&
        filter.type !== "cohort"
          ? { ...filter, ...patch }
          : filter,
      ),
    );
  };

  const updateCohortFilter = (
    index: number,
    patch: Partial<Extract<Filter, { type: "cohort" }>>,
  ) => {
    onChange(
      filters.map((filter, currentIndex) =>
        currentIndex === index &&
        filter.type === "cohort"
          ? { ...filter, ...patch }
          : filter,
      ),
    );
  };

  const removeFilter = (index: number) => {
    onChange(
      filters.filter(
        (_, currentIndex) =>
          currentIndex !== index,
      ),
    );
  };

  return (
    <div
      className="space-y-2"
      role="group"
      aria-label="Filters"
    >
      <datalist id={propertiesListId}>
        {(eventProperties ?? []).map((property) => (
          <option
            key={\`\${property.kind}:\${property.name}\`}
            value={property.name}
          >
            {property.kind}
          </option>
        ))}
      </datalist>

      {filters.map((filter, index) => (
        <div
          key={index}
          className="flex flex-wrap items-center gap-2"
          data-testid="filter-row"
        >
          {filter.type === "cohort" ? (
            <>
              <Select
                aria-label="Cohort membership"
                className="w-32"
                value={
                  filter.negate ? "not" : "in"
                }
                onChange={(event) =>
                  updateCohortFilter(index, {
                    negate:
                      event.target.value === "not",
                  })
                }
              >
                <option value="in">
                  In cohort
                </option>
                <option value="not">
                  Not in cohort
                </option>
              </Select>

              <Select
                aria-label="Cohort"
                className="w-56"
                value={filter.cohort_id}
                onChange={(event) =>
                  updateCohortFilter(index, {
                    cohort_id: event.target.value,
                  })
                }
              >
                <option value="">
                  Select cohort…
                </option>
                {(cohorts ?? []).map((cohort) => (
                  <option
                    key={cohort.id}
                    value={cohort.id}
                  >
                    {cohort.name}
                  </option>
                ))}
              </Select>
            </>
          ) : (
            <>
              <Select
                aria-label="Property type"
                className="w-28"
                value={filter.type}
                onChange={(event) =>
                  updatePropertyFilter(index, {
                    type: event.target.value as
                      | "event"
                      | "person",
                  })
                }
              >
                <option value="event">
                  Event
                </option>
                <option value="person">
                  User
                </option>
              </Select>

              <Input
                aria-label="Property name"
                className="w-44"
                list={propertiesListId}
                value={filter.property}
                placeholder="property"
                onChange={(event) =>
                  updatePropertyFilter(index, {
                    property: event.target.value,
                  })
                }
              />

              <Select
                aria-label="Operator"
                className="w-36"
                value={filter.operator}
                onChange={(event) => {
                  const operator =
                    event.target.value as PropertyFilter["operator"];

                  const currentValue = Array.isArray(
                    filter.value,
                  )
                    ? filter.value.join(",")
                    : String(
                        filter.value ?? "",
                      );

                  updatePropertyFilter(index, {
                    operator,
                    value: opMeta(operator).needsValue
                      ? coerceValue(
                          operator,
                          currentValue,
                        )
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

              <div className="min-w-[10rem] flex-1">
                <ValueInput
                  projectId={projectId}
                  filter={filter}
                  onChange={(value) =>
                    updatePropertyFilter(index, {
                      value,
                    })
                  }
                />
              </div>
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            aria-label="Remove filter"
            onClick={() => removeFilter(index)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() =>
            onChange([...filters, newFilter()])
          }
        >
          <Plus className="h-3.5 w-3.5" />
          Add filter
        </Button>

        {allowCohorts &&
          (cohorts?.length ?? 0) > 0 && (
            <Button
              size="sm"
              onClick={() =>
                onChange([
                  ...filters,
                  {
                    type: "cohort",
                    cohort_id: "",
                    negate: false,
                  },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Cohort filter
            </Button>
          )}
      </div>
    </div>
  );
}
