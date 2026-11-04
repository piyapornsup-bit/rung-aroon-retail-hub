import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ConfirmTone = "default" | "success" | "danger";

const TONE = {
  default: { icon: Info, wrap: "bg-sun-50 text-sun-600", btn: "default" as const },
  success: { icon: CheckCircle2, wrap: "bg-success-soft text-success", btn: "success" as const },
  danger: { icon: AlertTriangle, wrap: "bg-danger-soft text-danger", btn: "destructive" as const },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "ยืนยัน",
  cancelLabel = "ยกเลิก",
  tone = "default",
  note,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  /** Ask for a note. `required` blocks confirm until filled. */
  note?: { label: string; placeholder?: string; required?: boolean; requiredMessage?: string };
  onConfirm: (note: string) => void;
  children?: ReactNode;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const t = TONE[tone];
  const Icon = t.icon;

  useEffect(() => {
    if (open) {
      setText("");
      setError(null);
    }
  }, [open]);

  const confirm = () => {
    if (note?.required && !text.trim()) {
      setError(note.requiredMessage ?? "กรุณาระบุหมายเหตุ");
      return;
    }
    onConfirm(text.trim());
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-lg">
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <span className={cn("rounded-full p-2", t.wrap)}>
              <Icon className="size-5" />
            </span>
            <div className="space-y-1 text-left">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
            </div>
          </div>
        </AlertDialogHeader>
        {children}
        {note && (
          <div className="space-y-1.5">
            <Label htmlFor="confirm-note">
              {note.label}
              {note.required && <span className="text-danger"> *</span>}
            </Label>
            <Textarea
              id="confirm-note"
              value={text}
              placeholder={note.placeholder}
              aria-invalid={!!error}
              onChange={(e) => {
                setText(e.target.value);
                if (error) setError(null);
              }}
              className={cn(error && "border-danger focus-visible:ring-danger")}
            />
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
        )}
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button variant={t.btn} onClick={confirm}>
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
