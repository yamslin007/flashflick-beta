"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
}

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

// Dialog Context
const DialogContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
} | null>(null);

// Dialog Root
export function Dialog({ open, onOpenChange, children }: DialogProps) {
  // 处理 ESC 键关闭
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onOpenChange]);

  // 禁止背景滚动
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

// Dialog Content (includes overlay)
export function DialogContent({ children, className, onClose }: DialogContentProps) {
  const context = React.useContext(DialogContext);
  if (!context) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      context.onOpenChange(false);
      onClose?.();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleOverlayClick}
    >
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 animate-in fade-in-0" />

      {/* Content */}
      <div
        className={cn(
          "relative z-50 w-full max-w-lg max-h-[90vh] overflow-auto",
          "bg-background rounded-lg shadow-lg border",
          "animate-in fade-in-0 zoom-in-95",
          "mx-4",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={() => {
            context.onOpenChange(false);
            onClose?.();
          }}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">关闭</span>
        </button>

        {children}
      </div>
    </div>
  );
}

// Dialog Header
export function DialogHeader({ children, className }: DialogHeaderProps) {
  return (
    <div className={cn("flex flex-col space-y-1.5 p-6 pb-0", className)}>
      {children}
    </div>
  );
}

// Dialog Title
export function DialogTitle({ children, className }: DialogTitleProps) {
  return (
    <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>
      {children}
    </h2>
  );
}

// Dialog Footer
export function DialogFooter({ children, className }: DialogFooterProps) {
  return (
    <div className={cn("flex justify-end gap-2 p-6 pt-4", className)}>
      {children}
    </div>
  );
}

// Dialog Body (for main content)
export function DialogBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("p-6", className)}>
      {children}
    </div>
  );
}
