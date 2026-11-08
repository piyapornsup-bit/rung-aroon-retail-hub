import type { FormEvent, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  submitLabel?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  submitting?: boolean;
  onSubmit?: () => boolean | void | Promise<boolean | void>;
  onConfirm?: () => boolean | void | Promise<boolean | void>;
  onSave?: () => boolean | void | Promise<boolean | void>;
  children: ReactNode;
  className?: string;
}

/** Dialog wrapping a form. Return false from onSubmit/onConfirm/onSave to keep it open (e.g. validation). */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel = "บันทึก",
  confirmLabel,
  cancelLabel = "ยกเลิก",
  submitting,
  onSubmit,
  onConfirm,
  onSave,
  children,
  className,
}: FormDialogProps) {
  const handleFormSubmit = async (e?: FormEvent | React.MouseEvent) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    const submitFn =
      (typeof onSubmit === "function" && onSubmit) ||
      (typeof onSave === "function" && onSave) ||
      (typeof onConfirm === "function" && onConfirm) ||
      null;

    if (submitFn) {
      try {
        const res = await submitFn();
        if (res !== false) onOpenChange?.(false);
      } catch (err) {
        console.error("FormDialog submit error:", err);
      }
    } else {
      console.warn("FormDialog: No submit function provided, closing dialog.");
      onOpenChange?.(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "w-full max-w-[95vw] sm:max-w-lg md:max-w-xl max-h-[90vh] flex flex-col overflow-hidden p-4 sm:p-6 rounded-lg",
          className,
        )}
      >
        <form onSubmit={handleFormSubmit} noValidate className="flex flex-col flex-1 min-h-0 w-full min-w-0">
          <DialogHeader className="shrink-0 pb-3">
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription className="break-words">{description}</DialogDescription>}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto overflow-x-hidden pr-1 space-y-4 w-full min-w-0">
            {children}
          </div>
          <DialogFooter className="shrink-0 pt-3 flex justify-end gap-2 border-t mt-2 w-full sm:space-x-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
              {cancelLabel}
            </Button>
            <Button type="submit" disabled={submitting} onClick={handleFormSubmit}>
              {submitting && <Loader2 className="animate-spin" />}
              {confirmLabel || submitLabel || "บันทึก"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Field wrapper with label and inline Thai validation message. */
export function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5 w-full min-w-0 box-border", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground block">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      <div className="w-full min-w-0 box-border">{children}</div>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
