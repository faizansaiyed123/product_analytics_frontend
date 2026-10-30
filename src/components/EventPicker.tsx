import { useQuery } from "@tanstack/react-query";
import { useId } from "react";
import { exploreApi } from "@/services/endpoints";
import { Input } from "./ui/input";

export function EventPicker({
  projectId,
  value,
  onChange,
  allowAll = false,
  label = "Event",
  placeholder = "Choose an event",
}: {
  projectId: string;
  value: string;
  onChange: (v: string) => void;
  allowAll?: boolean;
  label?: string;
  placeholder?: string;
}) {
  const id = useId();
  const { data } = useQuery({
    queryKey: ["event-names", projectId],
    queryFn: () => exploreApi.eventNames(projectId),
    staleTime: 60_000,
  });
  return (
    <>
      <Input
        aria-label={label}
        list={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
      <datalist id={id}>
        {allowAll && <option value="*">All events</option>}
        {(data ?? []).map((d) => (
          <option key={d.name} value={d.name} />
        ))}
      </datalist>
    </>
  );
}
