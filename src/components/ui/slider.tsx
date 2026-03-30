"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ value, onValueChange, min = 0, max = 100, step = 1, className, disabled }, ref) => {
    return (
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={(e) => onValueChange([Number(e.target.value)])}
        disabled={disabled}
        className={cn(
          "w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer",
          "accent-primary",
          "[&::-webkit-slider-thumb]:appearance-none",
          "[&::-webkit-slider-thumb]:w-4",
          "[&::-webkit-slider-thumb]:h-4",
          "[&::-webkit-slider-thumb]:rounded-full",
          "[&::-webkit-slider-thumb]:bg-primary",
          "[&::-webkit-slider-thumb]:cursor-pointer",
          "[&::-moz-range-thumb]:w-4",
          "[&::-moz-range-thumb]:h-4",
          "[&::-moz-range-thumb]:rounded-full",
          "[&::-moz-range-thumb]:bg-primary",
          "[&::-moz-range-thumb]:border-0",
          "[&::-moz-range-thumb]:cursor-pointer",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      />
    );
  }
);

Slider.displayName = "Slider";

export { Slider };
