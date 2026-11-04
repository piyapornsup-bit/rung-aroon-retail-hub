import { useRouterState } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NAV_BY_ROLE } from "@/lib/navigation";
import { ROLE_LABELS } from "@/lib/mock-data";
import { useCurrentUser, useNavBadges } from "@/lib/store";
import { AppLink } from "./AppLink";
import { SunMark } from "./SunMark";

export function AppSidebar() {
  const user = useCurrentUser();
  const badges = useNavBadges();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const groups = NAV_BY_ROLE[user.role];

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-3 pt-4 pb-2">
        <AppLink
          href="/dashboard"
          className="flex items-center gap-2.5 rounded-md px-1 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sun-600/15">
            <SunMark className="h-5 w-8" />
          </span>
          <span className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="block truncate font-display text-[15px] text-sidebar-foreground">
              ร้านรุ่งอรุณ
            </span>
            <span className="block truncate text-xs text-sidebar-muted">มินิมาร์ท · หลังร้าน</span>
          </span>
        </AppLink>
      </SidebarHeader>

      <SidebarContent className="px-1">
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel className="text-sidebar-muted">{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const active = pathname === item.href;
                  const count = item.badgeKey ? badges[item.badgeKey] : 0;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className="relative h-10 text-sidebar-foreground/85 before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-transparent data-[active=true]:before:bg-sidebar-primary data-[active=true]:[&>svg]:text-sun-400"
                      >
                        <AppLink href={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </AppLink>
                      </SidebarMenuButton>
                      {count > 0 && (
                        <SidebarMenuBadge className="num top-2.5 rounded-full bg-sidebar-primary text-sidebar-primary-foreground peer-hover/menu-button:text-sidebar-primary-foreground peer-data-[active=true]/menu-button:text-sidebar-primary-foreground">
                          {count}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2.5 rounded-md bg-sidebar-border/60 p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sun-600 text-sm font-semibold text-primary-foreground">
            {user.nickname.slice(0, 1)}
          </span>
          <span className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-sm text-sidebar-foreground">{user.name}</span>
            <span className="block truncate text-xs text-sidebar-muted">{ROLE_LABELS[user.role]}</span>
          </span>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
