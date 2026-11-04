import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Info, Loader2, LogIn } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/admin/FormDialog";
import { SunMark } from "@/components/admin/SunMark";
import { ROLE_LABELS, staffUsers } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบ — ร้านรุ่งอรุณ มินิมาร์ท" },
      { name: "description", content: "เข้าสู่ระบบหลังร้านสำหรับพนักงานร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:title", content: "เข้าสู่ระบบ — ร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:description", content: "เข้าสู่ระบบหลังร้านสำหรับพนักงานร้านรุ่งอรุณ มินิมาร์ท" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { actions } = useStore();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [forgot, setForgot] = useState(false);
  const [welcome, setWelcome] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!username.trim()) errs.username = "กรุณากรอกชื่อผู้ใช้";
    if (!password) errs.password = "กรุณากรอกรหัสผ่าน";
    setErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length) return;

    setStatus("loading");
    setTimeout(() => {
      const res = actions.login(username, password);
      if (!res.ok) {
        setStatus("idle");
        setFormError(res.error);
        return;
      }
      setStatus("success");
      setWelcome(`${res.user.name} · ${ROLE_LABELS[res.user.role]}`);
      toast.success("เข้าสู่ระบบสำเร็จ", { description: `ยินดีต้อนรับ ${res.user.name}` });
      setTimeout(() => navigate({ to: "/dashboard" }), 900);
    }, 500);
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      {/* Left: sunrise panel */}
      <div className="relative hidden overflow-hidden bg-sunrise lg:flex lg:flex-col lg:justify-between p-12">
        <div className="flex items-center gap-3">
          <SunMark tone="light" className="h-8 w-12" />
          <span className="font-display text-lg text-sun-50">รุ่งอรุณ มินิมาร์ท</span>
        </div>

        <div className="relative z-10 max-w-md">
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.1, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <SunMark tone="light" className="h-36 w-56" />
          </motion.div>
          <h1 className="mt-8 font-display text-5xl leading-tight text-sun-50">
            ร้านรุ่งอรุณ
            <br />
            มินิมาร์ท
          </h1>
          <p className="mt-4 text-lg text-sun-100/90">
            ระบบหลังร้าน สำหรับพนักงาน — เริ่มวันใหม่อย่างสดใส ทุกงานในที่เดียว
          </p>
        </div>

        <p className="text-sm text-sun-100/80">เปิดทุกวัน 06:00 – 23:00 น.</p>

        <div className="pointer-events-none absolute -bottom-40 -right-24 size-[28rem] rounded-full bg-sun-200/20 blur-3xl" />
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <SunMark className="h-8 w-12" />
            <span className="font-display text-lg">ร้านรุ่งอรุณ มินิมาร์ท</span>
          </div>

          <h2 className="font-display text-3xl text-foreground">เข้าสู่ระบบ</h2>
          <p className="mt-2 text-muted-foreground">กรอกชื่อผู้ใช้และรหัสผ่านที่ได้รับจากร้าน</p>

          <AnimatePresence mode="wait">
            {status === "success" ? (
              <motion.div
                key="ok"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-8 flex flex-col items-center gap-3 rounded-lg border border-success/30 bg-success-soft p-8 text-center"
              >
                <CheckCircle2 className="size-12 text-success" />
                <p className="text-lg font-semibold text-foreground">เข้าสู่ระบบสำเร็จ</p>
                <p className="text-sm text-muted-foreground">{welcome}</p>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> กำลังพาไปยังแดชบอร์ด...
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={submit}
                noValidate
                className="mt-8 space-y-5"
                exit={{ opacity: 0 }}
              >
                {formError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger"
                  >
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    {formError}
                  </div>
                )}

                <Field label="ชื่อผู้ใช้" htmlFor="username" error={errors.username}>
                  <Input
                    id="username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setErrors((s) => ({ ...s, username: undefined }));
                    }}
                    placeholder="เช่น sale01"
                    className={cn("h-11", errors.username && "border-danger")}
                    aria-invalid={!!errors.username}
                  />
                </Field>

                <Field label="รหัสผ่าน" htmlFor="password" error={errors.password}>
                  <div className="relative">
                    <Input
                      id="password"
                      type={show ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrors((s) => ({ ...s, password: undefined }));
                      }}
                      placeholder="••••"
                      className={cn("h-11 pr-11", errors.password && "border-danger")}
                      aria-invalid={!!errors.password}
                    />
                    <button
                      type="button"
                      onClick={() => setShow((v) => !v)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground"
                      aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                    >
                      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </Field>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setForgot((v) => !v)}
                    className="rounded-sm text-sm font-medium text-primary hover:underline"
                  >
                    ลืมรหัสผ่าน
                  </button>
                </div>
                <AnimatePresence>
                  {forgot && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-start gap-2 rounded-md bg-info-soft px-3 py-2.5 text-sm text-info">
                        <Info className="mt-0.5 size-4 shrink-0" />
                        กรุณาติดต่อผู้จัดการร้านเพื่อรีเซ็ตรหัสผ่าน
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button type="submit" size="lg" className="w-full" disabled={status === "loading"}>
                  {status === "loading" ? <Loader2 className="animate-spin" /> : <LogIn />}
                  เข้าสู่ระบบ
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="mt-10 rounded-lg border border-dashed bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">
              บัญชีสาธิต (รหัสผ่าน 1234) — กดเพื่อกรอกอัตโนมัติ
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {staffUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setUsername(u.username);
                    setPassword(u.password);
                    setErrors({});
                    setFormError(null);
                  }}
                  className="rounded-full bg-sun-50 px-2.5 py-1 text-xs text-sun-700 hover:bg-sun-100"
                >
                  {u.username} · {ROLE_LABELS[u.role]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
