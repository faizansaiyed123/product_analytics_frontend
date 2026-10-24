import { Check, ChevronDown } from "lucide-react";
import React, {
  Children,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/utils/cn";

const base = "w-full rounded-md border border-border bg-card px-3 text-sm placeholder:text-muted-foreground/70 disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(base, "h-9", className)} {...p} />
));
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(base, "min-h-[72px] py-2", className)} {...p} />
));
Textarea.displayName = "Textarea";

interface ParsedOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

function extractOptions(children: ReactNode): ParsedOption[] {
  const options: ParsedOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ value?: string | number; disabled?: boolean; children?: ReactNode }>;
    if (el.type === "option" || (el.props && "children" in el.props)) {
      const val = el.props.value !== undefined ? String(el.props.value) : String(el.props.children ?? "");
      options.push({
        value: val,
        label: el.props.children ?? val,
        disabled: el.props.disabled,
      });
    }
  });
  return options;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, value, defaultValue, onChange, disabled, id, placeholder, ...p }, ref) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const hiddenSelectRef = useRef<HTMLSelectElement>(null);

    useImperativeHandle(ref, () => hiddenSelectRef.current as HTMLSelectElement);

    const isControlled = value !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = useState(
      defaultValue !== undefined ? String(defaultValue) : ""
    );

    const currentValue = isControlled ? String(value ?? "") : uncontrolledValue;
    const options = extractOptions(children);
    const selectedOption = options.find((o) => o.value === currentValue) || options[0];

    useEffect(() => {
      if (!open) return;
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      };
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false);
      };
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [open]);

    const handleSelect = (val: string) => {
      if (!isControlled) {
        setUncontrolledValue(val);
      }
      if (hiddenSelectRef.current) {
        hiddenSelectRef.current.value = val;
      }
      if (onChange) {
        const syntheticEvent = {
          target: { value: val, name: p.name, id },
          currentTarget: { value: val, name: p.name, id },
        } as unknown as React.ChangeEvent<HTMLSelectElement>;
        onChange(syntheticEvent);
      }
      setOpen(false);
    };

    const isSmall = className?.includes("h-7") || className?.includes("text-xs");

    return (
      <div ref={containerRef} className={cn("relative inline-block w-full", className)}>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-label={p["aria-label"]}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => !disabled && setOpen((prev) => !prev)}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card font-medium text-foreground shadow-sm transition-all duration-150",
            isSmall ? "h-7 px-2 text-xs" : "h-9 px-3 text-sm",
            "hover:bg-muted/30 hover:border-muted-foreground/30",
            "focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary",
            open && "border-primary ring-2 ring-primary/30",
            disabled && "cursor-not-allowed opacity-50 bg-muted/20"
          )}
        >
          <span className="truncate text-left">
            {selectedOption ? selectedOption.label : placeholder || "Select..."}
          </span>
          <ChevronDown
            className={cn(
              "shrink-0 text-muted-foreground/70 transition-transform duration-200",
              isSmall ? "h-3.5 w-3.5" : "h-4 w-4",
              open && "rotate-180 text-foreground"
            )}
          />
        </button>

        {open && (
          <div
            role="listbox"
            className="absolute left-0 top-[calc(100%+4px)] z-[9999] min-w-full w-max max-w-[min(90vw,360px)] max-h-64 overflow-y-auto rounded-lg border border-border bg-card p-1 text-sm shadow-xl backdrop-blur-sm animate-in fade-in-50 zoom-in-95 duration-100"
          >
            {options.map((opt, idx) => {
              const isSelected = opt.value === currentValue;
              return (
                <div
                  key={`${opt.value}-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => !opt.disabled && handleSelect(opt.value)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-md px-2.5 py-1.5 select-none transition-colors",
                    isSmall ? "text-xs py-1 px-2" : "text-sm",
                    opt.disabled
                      ? "cursor-not-allowed opacity-40 text-muted-foreground"
                      : "cursor-pointer hover:bg-muted/80 hover:text-foreground",
                    isSelected
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground"
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <Check className={cn("shrink-0 text-primary", isSmall ? "h-3.5 w-3.5" : "h-4 w-4")} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <select
          ref={hiddenSelectRef}
          value={currentValue}
          onChange={onChange}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only absolute pointer-events-none h-0 w-0 opacity-0"
          {...p}
        >
          {children}
        </select>
      </div>
    );
  }
);
Select.displayName = "Select";

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      {children(id)}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}
