import { Outlet, useLocation, Link, useNavigate } from "react-router-dom";
import { UtensilsCrossed, ChefHat, Grid2X2, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

const navItems = [
  {
    label: "Menu Management",
    path: "/admin/menu",
    icon: UtensilsCrossed,
  },
  {
    label: "Tables & QR",
    path: "/admin/tables",
    icon: Grid2X2,
  },
];

import { canAccessAdmin } from "@/types/roles";
import { useRestaurantStore } from "@/store/useRestaurantStore";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function DashboardLayout() {
  const { pathname } = useLocation();
  const { activeMemberRole, currentRestaurant, resetStore } = useRestaurantStore();
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    resetStore();
    navigate("/login", { replace: true });
  }

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UtensilsCrossed className="size-5" />
            </div>
            <div className="flex flex-col overflow-hidden gap-1">
              {currentRestaurant ? (
                <>
                  <span className="truncate text-sm font-bold tracking-tight text-foreground">
                    {currentRestaurant.name}
                  </span>
                  <span className="truncate text-xs font-medium text-muted-foreground capitalize">
                    {activeMemberRole}
                  </span>
                </>
              ) : (
                <>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </>
              )}
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                        className={isActive ? "bg-primary/10 text-primary font-semibold relative after:absolute after:left-0 after:top-0 after:bottom-0 after:w-1 after:bg-primary after:rounded-r-full" : "font-medium"}
                      >
                        <Link to={item.path}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 shadow-sm">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-medium text-muted-foreground">
            {navItems.find((n) => pathname.startsWith(n.path))?.label ??
              "Dashboard"}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {canAccessAdmin(activeMemberRole) && (
              <div className="flex items-center gap-3 border-l pl-4 border-border/50">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Switch Surface
                </span>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="bg-transparent text-[#017E84] hover:bg-teal-50 border border-teal-100 shadow-sm transition-colors" 
                  asChild
                >
                  <Link to="/kitchen/orders">
                    <ChefHat className="mr-2 size-3.5" />
                    Kitchen Display
                  </Link>
                </Button>
              </div>
            )}
            <div className="h-4 w-px bg-border/50 mx-1" />
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 size-3.5" />
              Logout
            </Button>
          </div>
        </header>
        <div className="flex-1">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
