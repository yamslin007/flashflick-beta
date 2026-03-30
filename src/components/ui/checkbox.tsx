import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

// 简单的 Checkbox 封装
export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const inputId = id || React.useId();

    return (
      <label
        htmlFor={inputId}
        className="inline-flex items-center gap-2 cursor-pointer select-none"
      >
        <div className="relative flex items-center justify-center">
          <input
            type="checkbox"
            id={inputId}
            ref={ref}
            className={cn(
              "peer h-4 w-4 shrink-0 appearance-none rounded-sm border border-input bg-transparent shadow-sm",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              "checked:bg-primary checked:border-primary",
              "disabled:cursor-not-allowed disabled:opacity-50",
              className
            )}
            {...props}
          />
          <Check
            className={cn(
              "absolute h-3 w-3 text-primary-foreground pointer-events-none",
              "opacity-0 peer-checked:opacity-100"
            )}
          />
        </div>
        {label && <span className="text-sm">{label}</span>}
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
