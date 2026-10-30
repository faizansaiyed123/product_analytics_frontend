import * as M from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";

export function Menu({
  trigger,
  children,
  align = "end",
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
}) {
  return (
    <M.Root>
      <M.Trigger asChild>{trigger}</M.Trigger>
      <M.Portal>
        <M.Content
          align={align}
          sideOffset={6}
          className="z-[9999] min-w-[11rem] rounded-md border border-border bg-card p-1 text-sm shadow-xl data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1 data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          style={{ animationDuration: "0.15s" }}
        >
          {children}
        </M.Content>
      </M.Portal>
    </M.Root>
  );
}
export const MenuItem = ({
  children,
  onSelect,
  danger,
  disabled,
}: {
  children: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}) => (
  <M.Item
    disabled={disabled}
    onSelect={onSelect}
    className={`flex cursor-${disabled ? "default" : "pointer"} items-center gap-2 rounded-md px-2.5 py-1.5 text-sm outline-none transition-colors data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-muted data-[highlighted]:text-foreground ${danger ? "text-danger" : ""} hover:bg-muted`}
  >
    {children}
  </M.Item>
);
export const MenuLabel = ({ children }: { children: ReactNode }) => (
  <M.Label className="px-2.5 py-1 text-xs font-medium text-muted-foreground">{children}</M.Label>
);
export const MenuSeparator = () => <M.Separator className="my-1 h-px bg-border" />;
