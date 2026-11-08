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
      <DialogContent className={cn("rounded-lg sm:max-w-lg", className)}>
        <form onSubmit={handleFormSubmit} noValidate className="space-y-5">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="space-y-4">{children}</div>
          <DialogFooter>
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
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
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
