import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { EventPicker } from "@/components/EventPicker";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { EmptyState, ErrorState, LoadingBlock, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { useWorkspaceProject } from "@/layouts/WorkspaceLayout";
import { messageFor } from "@/services/api";
import { savedApi } from "@/services/endpoints";
import type { Cohort, CohortCriterion, CohortDefinition, Operator } from "@/types";
import { can } from "@/types";
import { OPERATORS, coerceValue, opMeta } from "@/utils/filters";
import { fmtNum, relativeTime } from "@/utils/format";

const blank = (type: CohortCriterion["type"]): CohortCriterion =>
  type === "performed_event" ? { type, event: "", operator: "at_least", count: 1, within_days: null } : type === "not_performed_event" ? { type, event: "", within_days: null }
  : type === "person_property" ? { type, property: "", operator: "equals", value: "" } : { type, operator: "within_last_days", days: 30 };

export const criterionComplete = (c: CohortCriterion): boolean =>
  c.type === "performed_event" || c.type === "not_performed_event" ? !!c.event.trim() : c.type === "person_property" ? !!c.property.trim() && (!opMeta(c.operator).needsValue || (c.value !== undefined && c.value !== "")) : c.operator === "within_last_days" ? !!c.days : !!c.date;

function CriterionRow({ projectId, c, onChange, onRemove }: { projectId: string; c: CohortCriterion; onChange: (c: CohortCriterion) => void; onRemove: () => void }) {
  const days = (v: number | null | undefined, set: (n: number | null) => void) => <><span className="text-sm text-muted-foreground">in the last</span><Input aria-label="Within days" type="number" min={1} className="w-20" value={v ?? ""} placeholder="any" onChange={(e) => set(e.target.value ? Number(e.target.value) : null)} /><span className="text-sm text-muted-foreground">days</span></>;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2" data-testid="criterion">
      <Select aria-label="Criterion type" className="w-44" value={c.type} onChange={(e) => onChange(blank(e.target.value as CohortCriterion["type"]))}>
        <option value="performed_event">Performed event</option><option value="not_performed_event">Did not perform event</option><option value="person_property">User property</option><option value="first_seen">First seen</option></Select>
      {c.type === "performed_event" && <><div className="w-48"><EventPicker projectId={projectId} value={c.event} onChange={(event) => onChange({ ...c, event })} /></div>
        <Select aria-label="Count operator" className="w-32" value={c.operator} onChange={(e) => onChange({ ...c, operator: e.target.value as typeof c.operator })}><option value="at_least">at least</option><option value="exactly">exactly</option><option value="at_most">at most</option></Select>
        <Input aria-label="Count" type="number" min={0} className="w-20" value={c.count} onChange={(e) => onChange({ ...c, count: Math.max(0, Number(e.target.value)) })} /><span className="text-sm text-muted-foreground">times</span>{days(c.within_days, (within_days) => onChange({ ...c, within_days }))}</>}
      {c.type === "not_performed_event" && <><div className="w-48"><EventPicker projectId={projectId} value={c.event} onChange={(event) => onChange({ ...c, event })} /></div>{days(c.within_days, (within_days) => onChange({ ...c, within_days }))}</>}
      {c.type === "person_property" && <><Input aria-label="Property name" className="w-40" value={c.property} placeholder="plan" onChange={(e) => onChange({ ...c, property: e.target.value })} />
        <Select aria-label="Operator" className="w-36" value={c.operator} onChange={(e) => onChange({ ...c, operator: e.target.value as Operator, value: opMeta(e.target.value as Operator).needsValue ? c.value : undefined })}>{OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
        {opMeta(c.operator).needsValue && <Input aria-label="Property value" className="w-44" value={Array.isArray(c.value) ? c.value.join(", ") : String(c.value ?? "")} onChange={(e) => onChange({ ...c, value: coerceValue(c.operator, e.target.value) })} />}</>}
      {c.type === "first_seen" && <><Select aria-label="First seen operator" className="w-44" value={c.operator} onChange={(e) => onChange({ ...c, operator: e.target.value as typeof c.operator })}><option value="within_last_days">within the last</option><option value="before">before date</option><option value="after">on or after date</option></Select>
        {c.operator === "within_last_days" ? <><Input aria-label="Days" type="number" min={1} className="w-20" value={c.days ?? ""} onChange={(e) => onChange({ ...c, days: Number(e.target.value) })} /><span className="text-sm text-muted-foreground">days</span></> : <Input aria-label="Date" type="date" className="w-40" value={c.date ?? ""} onChange={(e) => onChange({ ...c, date: e.target.value })} />}</>}
      <Button variant="ghost" size="icon" className="ml-auto" aria-label="Remove criterion" onClick={onRemove}><X className="h-4 w-4" /></Button>
    </div>
  );
}

function CohortEditor({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [def, setDef] = useState<CohortDefinition>({ match: "all", criteria: [blank("performed_event")] });
  const complete = def.criteria.length > 0 && def.criteria.every(criterionComplete);
  const preview = useQuery({ queryKey: ["cohort-preview", projectId, def], queryFn: () => savedApi.previewCohort(projectId, def), enabled: open && complete });
  useEffect(() => { if (!open) { setName(""); setDef({ match: "all", criteria: [blank("performed_event")] }); } }, [open]);
  const save = useMutation({ mutationFn: () => savedApi.createCohort({ project_id: projectId, name: name.trim(), definition: def }), onSuccess: () => { toast.success("Cohort saved"); qc.invalidateQueries({ queryKey: ["cohorts"] }); onClose(); }, onError: (e) => toast.error(messageFor(e)) });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} wide title="New cohort" description="People who match the criteria below. Membership is calculated live."
      footer={<><span className="mr-auto self-center text-sm text-muted-foreground" aria-live="polite">{complete ? (preview.isFetching ? "Counting…" : preview.data ? `${fmtNum(preview.data.count)} matching users` : "") : "Complete all criteria to preview"}</span><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!name.trim() || !complete} loading={save.isPending} onClick={() => save.mutate()}>Save cohort</Button></>}>
      <div className="space-y-4">
        <Field label="Name">{(id) => <Input id={id} autoFocus value={name} onChange={(e) => setName(e.target.value)} />}</Field>
        <div className="flex items-center gap-2 text-sm">Users who match <Select aria-label="Match mode" className="w-24" value={def.match} onChange={(e) => setDef({ ...def, match: e.target.value as "all" | "any" })}><option value="all">ALL</option><option value="any">ANY</option></Select> of:</div>
        <div className="space-y-2">{def.criteria.map((c, i) => <CriterionRow key={i} projectId={projectId} c={c} onChange={(n) => setDef({ ...def, criteria: def.criteria.map((x, j) => (j === i ? n : x)) })} onRemove={() => setDef({ ...def, criteria: def.criteria.filter((_, j) => j !== i) })} />)}</div>
        <Button size="sm" onClick={() => setDef({ ...def, criteria: [...def.criteria, blank("performed_event")] })}><Plus className="h-3.5 w-3.5" />Add criterion</Button>
      </div>
    </Dialog>
  );
}

export function CohortsPage() {
  const project = useWorkspaceProject();
  const qc = useQueryClient();
  const canWrite = can(project.role, "member");
  const cohorts = useQuery({ queryKey: ["cohorts", project.id], queryFn: () => savedApi.cohorts(project.id) });
  const [creating, setCreating] = useState(false);
  const [del, setDel] = useState<Cohort | null>(null);
  const remove = useMutation({ mutationFn: (c: Cohort) => savedApi.deleteCohort(c.id), onSuccess: () => { toast.success("Cohort deleted"); setDel(null); qc.invalidateQueries({ queryKey: ["cohorts"] }); }, onError: (e) => toast.error(messageFor(e)) });
  return (
    <>
      <PageHeader title="Cohorts" description="Reusable groups of users. Use them as filters in trends, funnels, retention and the user list." actions={canWrite && <Button variant="primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />New cohort</Button>} />
      <Card>
        {cohorts.isLoading ? <CardBody><LoadingBlock label="Loading cohorts" height="h-32" /></CardBody> : cohorts.isError ? <ErrorState error={cohorts.error} onRetry={() => cohorts.refetch()} /> : !cohorts.data!.length ?
          <EmptyState icon={<Users className="h-8 w-8" />} title="No cohorts yet" description="Create a cohort such as “performed purchase and logged in at least 3 times, plan = pro”." /> : (
          <Table><thead><tr><Th>Name</Th><Th>Criteria</Th><Th className="text-right">Users</Th><Th>Updated</Th><Th /></tr></thead><tbody>{cohorts.data!.map((c) => (
            <tr key={c.id}><Td className="font-medium">{c.name}</Td><Td className="text-xs text-muted-foreground">{c.definition.criteria.length} criteria · match {c.definition.match}</Td><Td className="text-right tabular">{fmtNum(c.last_count)}</Td><Td>{c.last_calculated_at ? relativeTime(c.last_calculated_at) : "–"}</Td>
              <Td className="text-right"><Link className="mr-2 text-sm text-primary hover:underline" to={`/users?cohort=${c.id}`}>View users</Link>{canWrite && <Button size="sm" variant="ghost" className="text-danger" onClick={() => setDel(c)}>Delete</Button>}</Td></tr>))}</tbody></Table>)}
      </Card>
      <CohortEditor projectId={project.id} open={creating} onClose={() => setCreating(false)} />
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} danger title="Delete cohort?" confirmLabel="Delete" loading={remove.isPending} onConfirm={() => del && remove.mutate(del)} description={`“${del?.name}” will be removed. Saved reports that filter by it will stop working.`} />
    </>
  );
}
