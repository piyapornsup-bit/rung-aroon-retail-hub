import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, ChevronDown, LogOut, Search, UserCircle2, Repeat2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { findNavItem, NAV_BY_ROLE } from "@/lib/navigation";
import { ROLE_LABELS, ROLE_ORDER, type RoleKey } from "@/lib/mock-data";
import { useCurrentUser, useNavBadges, useStore } from "@/lib/store";
import { AppLink } from "./AppLink";

interface Notice {
  title: string;
  description: string;
  href: string;
}

function useNotices(role: RoleKey): Notice[] {
  const b = useNavBadges();
  if (role !== "sales") return [];
  const out: Notice[] = [];
  if (b.payments)
    out.push({ title: `สลิปรอตรวจสอบ ${b.payments} รายการ`, description: "ลูกค้าออนไลน์ส่งหลักฐานการชำระเงินแล้ว", href: "/sales/payments" });
  if (b.returns)
    out.push({ title: `คำขอยกเลิก/คืนสินค้า ${b.returns} รายการ`, description: "รอการพิจารณาจากพนักงานขาย", href: "/sales/returns" });
  if (b.gifts)
    out.push({ title: `ของขวัญรอจัดเตรียม ${b.gifts} รายการ`, description: "ของขวัญวันเกิดและปีใหม่ของสมาชิก", href: "/sales/gifts" });
  return out;
}

export function TopBar() {
  const user = useCurrentUser();
  const { actions } = useStore();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const notices = useNotices(user.role);
  const [q, setQ] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const title =
    findNavItem(pathname)?.title ??
    (pathname === "/search"
      ? "ค้นหาข้อมูล"
      : pathname === "/reports"
        ? "รายงาน"
        : pathname === "/owner/overview"
          ? "ภาพรวมธุรกิจ"
          : "ร้านรุ่งอรุณ มินิมาร์ท");

  const onSwitchRole = (role: string) => {
    const r = role as RoleKey;
    actions.switchRole(r);
    toast.success(`สลับเป็นบทบาท ${ROLE_LABELS[r]}`, { description: "เมนูด้านซ้ายเปลี่ยนตามหน้าที่ของบทบาทนี้" });
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/75">
      <SidebarTrigger className="size-9" aria-label="ย่อ/ขยายเมนู" />
      <div className="h-6 w-px bg-border" />
      <p className="hidden min-w-0 truncate font-display text-base text-foreground md:block">{title}</p>

      <form
        className="relative ml-auto w-full max-w-sm"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ to: "/search", search: q.trim() ? { q: q.trim() } : {} });
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาสินค้า คำสั่งซื้อ สมาชิก..."
          className="h-10 bg-background pl-9"
          aria-label="ค้นหาทั้งระบบ"
        />
      </form>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" aria-label={`การแจ้งเตือน ${notices.length} รายการ`}>
            <Bell className="size-5" />
            {notices.length > 0 && (
              <span className="num absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground">
                {notices.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>การแจ้งเตือน</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notices.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">ไม่มีการแจ้งเตือนใหม่</p>
          ) : (
            notices.map((n) => (
              <DropdownMenuItem key={n.href} asChild className="cursor-pointer">
                <AppLink href={n.href} className="flex flex-col items-start gap-0.5 py-2">
                  <span className="font-medium text-foreground">{n.title}</span>
                  <span className="text-xs text-muted-foreground">{n.description}</span>
                </AppLink>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Select value={user.role} onValueChange={onSwitchRole}>
        <SelectTrigger className="h-10 w-48 bg-sun-50 border-sun-200" aria-label="สลับบทบาท (สำหรับสาธิต)">
          <Repeat2 className="size-4 text-sun-600" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLE_ORDER.map((r) => (
            <SelectItem key={r} value={r}>
              {ROLE_LABELS[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-10 gap-2 px-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-sun-100 text-sm font-semibold text-sun-700">
              {user.nickname.slice(0, 1)}
            </span>
            <span className="hidden text-left leading-tight xl:block">
              <span className="block text-sm">{user.name}</span>
              <span className="block text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
            </span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <p className="font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">
              {ROLE_LABELS[user.role]} · {user.username}
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
            <UserCircle2 /> ข้อมูลส่วนตัว
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-danger focus:text-danger"
            onSelect={() => {
              actions.logout();
              toast.success("ออกจากระบบแล้ว");
              navigate({ to: "/login" });
            }}
          >
            <LogOut /> ออกจากระบบ
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User Profile Modal */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle2 className="size-5 text-primary" />
              <span>ข้อมูลส่วนตัวของพนักงาน</span>
            </DialogTitle>
            <DialogDescription>
              รายละเอียดบัญชีผู้ใช้งานและสิทธิ์ในระบบร้านรุ่งอรุณ
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border">
              <span className="flex size-14 items-center justify-center rounded-full bg-sun-200 text-sun-900 text-xl font-bold">
                {user.nickname.slice(0, 1)}
              </span>
              <div>
                <h3 className="font-bold text-base text-foreground">
                  {user.name} ({user.nickname})
                </h3>
                <Badge className="mt-1" variant="outline">
                  {ROLE_LABELS[user.role]}
                </Badge>
              </div>
            </div>

            <div className="space-y-2 text-xs divide-y divide-border">
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">ตำแหน่งงาน:</span>
                <span className="font-medium text-foreground">{user.position || "-"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">หน้าที่รับผิดชอบหลัก:</span>
                <span className="font-medium text-foreground text-right">{user.duty || "-"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">ชื่อผู้ใช้งาน (Username):</span>
                <span className="font-mono font-medium text-foreground">{user.username}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">สังกัด:</span>
                <span className="font-medium text-foreground">ร้านรุ่งอรุณ มินิมาร์ท (สำนักงานใหญ่)</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileOpen(false)}>
              ปิดหน้าต่าง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
