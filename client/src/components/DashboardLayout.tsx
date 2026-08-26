import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { adminMenu, filterAdminNavigation } from "@/components/AdminNavigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { useIsMobile } from "@/hooks/useMobile";
import { Bell, CheckCheck, Clock3, LayoutDashboard, LogOut, Moon, PanelLeft, Search, Sun, Users, type LucideIcon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { CSSProperties, Fragment, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

export type DashboardNavigationItem = { icon: LucideIcon; label: string; path: string; section?: string };

const defaultMenuItems: DashboardNavigationItem[] = [
  { icon: LayoutDashboard, label: "لوحة التحكم", path: "/" },
  { icon: Users, label: "الحساب", path: "/my-orders" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
  menuItems = defaultMenuItems,
  title = "لوحة التحكم",
}: {
  children: React.ReactNode;
  menuItems?: DashboardNavigationItem[];
  title?: string;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const isAdminLayout = menuItems.some(item => item.path.startsWith("/admin"));

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication. Continue to launch the login flow.
            </p>
          </div>
          <Button
            onClick={() => startLogin()}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      className={isAdminLayout ? "admin-theme" : undefined}
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth} menuItems={menuItems} title={title} isAdminLayout={isAdminLayout}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
  menuItems: DashboardNavigationItem[];
  title: string;
  isAdminLayout: boolean;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
  menuItems,
  title,
  isAdminLayout,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, switchable } = useTheme();
  const notifications = trpc.support.notifications.useQuery(undefined, { enabled: isAdminLayout && Boolean(user), refetchInterval: 10000 });
  const markNotificationsRead = trpc.support.markNotificationsRead.useMutation({ onSuccess: () => notifications.refetch() });
  const unreadNotificationCount = notifications.data?.filter((item) => !item.isRead).length ?? 0;
  const unreadCounts = trpc.support.unreadCounts.useQuery(undefined, { enabled: Boolean(user), refetchInterval: 10000 });
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    if (!isAdminLayout) return;
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [isAdminLayout]);

  const searchableItems = filterAdminNavigation(isAdminLayout ? adminMenu : menuItems, searchQuery);

  const themeToggle = isAdminLayout && switchable && toggleTheme ? (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "التبديل إلى الوضع النهاري" : "التبديل إلى الوضع الليلي"}
      title={theme === "dark" ? "الوضع النهاري" : "الوضع الليلي"}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="sr-only">{theme === "dark" ? "الوضع النهاري" : "الوضع الليلي"}</span>
    </button>
  ) : null;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarRight = sidebarRef.current?.getBoundingClientRect().right ?? window.innerWidth;
      const newWidth = sidebarRight - e.clientX;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
          <Sidebar
            side="right"
            collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate font-semibold tracking-tight">
                    {title}
                  </span>
                  {themeToggle}
                </div>
              ) : themeToggle}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map((item, index) => {
                const isActive = location === item.path;
                return (
                  <Fragment key={item.path}>
                    {item.section && (index === 0 || menuItems[index - 1]?.section !== item.section) && <li className="mb-1 mt-4 px-3 text-[10px] font-black tracking-wide text-muted-foreground first:mt-1">{item.section}</li>}
                    <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-2"><span>{item.label}</span>{item.label.includes("الدعم") && Boolean(unreadCounts.data?.support) && <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-black text-rose-700">{unreadCounts.data?.support}</span>}</span>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                  </Fragment>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="min-w-0 overflow-x-hidden">
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
              <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
            {themeToggle}
          </div>
        )}
        {isAdminLayout && (
          <div className="admin-search-shell sticky top-14 z-30 border-b md:top-0 border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
            <div className="relative mx-auto flex max-w-7xl items-center gap-2">
              <Search className="pointer-events-none absolute right-3 h-4 w-4 text-muted-foreground" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setSearchQuery("");
                  if (event.key === "Enter" && searchableItems[0]) {
                    setLocation(searchableItems[0].path);
                    setSearchQuery("");
                  }
                }}
                placeholder="ابحث داخل لوحة الإدارة…"
                aria-label="البحث داخل لوحة الإدارة"
                className="h-10 w-full rounded-xl border border-input bg-background px-10 text-sm font-bold text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-4 focus:ring-ring/15"
              />
              <kbd className="hidden shrink-0 rounded-lg border border-border bg-muted px-2 py-1 text-[10px] font-black text-muted-foreground sm:inline-flex">Ctrl K</kbd>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="فتح الإشعارات"
                    className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadNotificationCount > 0 && <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white ring-2 ring-background">{unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}</span>}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-2">
                  <div className="flex items-center justify-between gap-3 px-2 py-1.5">
                    <div>
                      <p className="text-sm font-black text-popover-foreground">آخر التنبيهات</p>
                      <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">تحديثات التشغيل والمدفوعات والطلبات</p>
                    </div>
                    <button type="button" disabled={!unreadNotificationCount || markNotificationsRead.isPending} onClick={() => markNotificationsRead.mutate({})} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-extrabold text-primary transition hover:bg-accent disabled:opacity-40"><CheckCheck className="h-3.5 w-3.5" />تعليم الكل</button>
                  </div>
                  <div className="mt-2 max-h-80 space-y-1 overflow-y-auto">
                    {notifications.data?.length ? notifications.data.slice(0, 6).map((item) => <button type="button" key={item.id} onClick={() => { if (!item.isRead) markNotificationsRead.mutate({ notificationIds: [item.id] }); setLocation("/admin/operations"); }} className={`flex w-full items-start gap-2.5 rounded-xl p-3 text-right transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${item.isRead ? "" : "bg-accent/60"}`}><span className={`mt-0.5 rounded-lg p-1.5 ${item.isRead ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"}`}><Bell className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><span className="text-xs font-black text-popover-foreground">{item.title}</span>{!item.isRead && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />}</span><span className="mt-1 block line-clamp-2 text-[11px] font-medium leading-5 text-muted-foreground">{item.body}</span><span className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-muted-foreground"><Clock3 className="h-3 w-3" />{new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</span></span></button>) : <div className="px-3 py-8 text-center"><Bell className="mx-auto h-6 w-6 text-muted-foreground" /><p className="mt-2 text-xs font-bold text-muted-foreground">لا توجد تنبيهات جديدة.</p></div>}
                  </div>
                  <DropdownMenuItem onClick={() => setLocation("/notifications")} className="mt-1 justify-center rounded-xl text-xs font-extrabold text-primary">فتح مركز الإشعارات الكامل</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {searchQuery.trim() && (
                <div className="absolute inset-x-0 top-12 z-50 overflow-hidden rounded-2xl border border-border bg-popover p-1.5 shadow-xl">
                  {searchableItems.length ? searchableItems.slice(0, 8).map((item) => (
                    <button
                      type="button"
                      key={item.path}
                      onClick={() => { setLocation(item.path); setSearchQuery(""); }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right text-sm font-bold text-popover-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <item.icon className="h-4 w-4 shrink-0 text-primary" />
                      <span>{item.label}</span>
                      <span className="mr-auto text-[10px] font-medium text-muted-foreground">{item.section}</span>
                    </button>
                  )) : <p className="px-3 py-3 text-center text-xs font-bold text-muted-foreground">لا توجد نتائج مطابقة.</p>}
                </div>
              )}
            </div>
          </div>
        )}
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}
