import { Download } from "lucide-react";
import { toast } from "sonner";
import { downloadPost } from "@/services/api";
import type { AnalyticsQuery } from "@/types";
import { Button } from "./ui/button";
import { Menu, MenuItem, MenuLabel } from "./ui/menu";

export function ExportMenu({ projectId, query, disabled }: { projectId: string; query: AnalyticsQuery; disabled?: boolean }) {
  const run = async (format: "csv" | "json") => {
    try { await downloadPost("/export/analytics", { project_id: projectId, query, format }, `${query.type}.${format}`); toast.success(`Exported ${format.toUpperCase()}`); }
    catch { toast.error("Export failed. You need the member role or higher to export data."); }
  };
  return (
    <Menu trigger={<Button disabled={disabled} aria-label="Export results"><Download className="h-4 w-4" />Export</Button>}>
      <MenuLabel>Export results</MenuLabel>
      <MenuItem onSelect={() => run("csv")}>Download CSV</MenuItem>
      <MenuItem onSelect={() => run("json")}>Download JSON</MenuItem>
    </Menu>
  );
}
