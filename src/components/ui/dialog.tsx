import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const Dialog = DialogPrimitive.Root;

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("title-1 text-ink", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("mt-2 text-sm text-ink-soft", className)} {...props} />;
}

type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  variant?: "center" | "right";
};

export function DialogContent({ className, variant = "center", children, ...props }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-50 bg-[rgba(33,37,41,0.55)]" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 bg-surface focus:outline-none",
          variant === "center"
            ? "dialog-content left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 border border-surface-high p-6 shadow-[0_3px_8px_rgba(0,0,0,0.15)]"
            : "sheet-content inset-y-0 right-0 w-[min(19rem,85vw)] border-l border-surface-high p-5",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute right-3 top-3 p-1 text-outline transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          aria-label="Close"
        >
          <X size={18} weight="bold" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
