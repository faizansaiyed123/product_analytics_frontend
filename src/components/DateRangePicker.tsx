import { CalendarDays, ChevronDown } from "lucide-react";
import { useState } from "react";
import { DATE_PRESETS, useUI } from "@/stores/ui";
import { COMMON_TIMEZONES, localTimezone, rangeLabel } from "@/utils/dates";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Field, Input, Select } from "./ui/input";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "./ui/menu";

export function DateRangePicker() {
  const { dateRange, setDateRange, timezone, setTimezone } = useUI();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(dateRange.from ?? "");
  const [to, setTo] = useState(dateRange.to ?? "");
  const invalid = !from || (!!to && to < from);
  const tzs = Array.from(new Set([localTimezone(), ...COMMON_TIMEZONES]));
  return (
    <>
      <Menu
        trigger={
          <Button aria-label={`Date range: ${rangeLabel(dateRange)}`}>
            <CalendarDays className="h-4 w-4" />
            {rangeLabel(dateRange)}
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </Button>
        }
      >
        <MenuLabel>Date range</MenuLabel>
        {DATE_PRESETS.map((p) => (
          <MenuItem key={p.value} onSelect={() => setDateRange({ preset: p.value })}>
            {p.label}
          </MenuItem>
        ))}
        <MenuSeparator />
        <MenuItem onSelect={() => setOpen(true)}>Custom range…</MenuItem>
      </Menu>
      <Select
        aria-label="Display timezone"
        className="min-w-[200px] max-w-[280px] lg:ml-auto"
        value={timezone ?? ""}
        onChange={(e) => setTimezone(e.target.value || null)}
      >
        <option value="">Project timezone</option>
        {tzs.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </Select>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Custom date range"
        description="Dates are inclusive and interpreted in the selected timezone."
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={invalid}
              onClick={() => {
                setDateRange({ from, to: to || undefined });
                setOpen(false);
              }}
            >
              Apply
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="From">
            {(id) => <Input id={id} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />}
          </Field>
          <Field
            label="To"
            hint="Leave empty for today"
            error={to && to < from ? "End must not be before start" : null}
          >
            {(id) => <Input id={id} type="date" value={to} onChange={(e) => setTo(e.target.value)} />}
          </Field>
        </div>
      </Dialog>
    </>
  );
}
