import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import { Activity, BellRing, Bot, CheckSquare, ChevronRight, FolderKanban, Globe2, LayoutDashboard, LogOut, Radar, Settings, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

const menuItems = [
  { icon: LayoutDashboard, label: "Command center", path: "/" },
  { icon: Radar, label: "Pipeline", path: "/pipeline" },
  { icon: CheckSquare, label: "Approvals", path: "/approvals" },
  { icon: FolderKanban, label: "Projects", path: "/projects" },
  { icon: Bot, label: "Agent operations", path: "/agents" },
  { icon: Globe2, label: "Authorized sites", path: "/sites" },
  { icon: Activity, label: "Activity", path: "/activity" },
  { icon: BellRing, label: "Notifications", path: "/notifications" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  const utils = trpc.useUtils();
  const login = trpc.auth.login.useMutation({ onSuccess: () => { void utils.auth.me.invalidate(); }, onError: error => toast.error(error.message) });
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0f15] p-6 text-[#f2f7f4]">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.035] p-9 text-center shadow-2xl shadow-black/30">
          <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-[#c7f35b] text-[#122014]"><ShieldCheck className="h-7 w-7" /></div>
          <h1 className="text-2xl font-semibold tracking-tight">Access the GIC control center</h1>
          <p className="mt-3 text-sm leading-6 text-[#9cacb4]">Use your private operator identifier and password to access project, agent, and approval records.</p>
          <form className="mt-7 space-y-3 text-left" onSubmit={event => { event.preventDefault(); login.mutate({ identifier, password }); }}>
            <input value={identifier} onChange={event => setIdentifier(event.target.value)} placeholder="Operator identifier" autoComplete="username" className="h-11 w-full rounded-xl border border-white/10 bg-white/[.07] px-3 text-sm outline-none placeholder:text-[#718076] focus:border-[#c7f35b]" />
            <input value={password} onChange={event => setPassword(event.target.value)} placeholder="Password" type="password" autoComplete="current-password" className="h-11 w-full rounded-xl border border-white/10 bg-white/[.07] px-3 text-sm outline-none placeholder:text-[#718076] focus:border-[#c7f35b]" />
            <Button type="submit" disabled={login.isPending || !identifier || !password} className="w-full bg-[#c7f35b] text-[#122014] hover:bg-[#d7ff77]">{login.isPending ? "Signing in…" : "Sign in securely"}</Button>
          </form>
        </div>
      </div>
    );
  }

  return <DashboardLayoutContent>{children}</DashboardLayoutContent>;
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const active = menuItems.find(item => item.path === location) ?? menuItems.find(item => location.startsWith(item.path) && item.path !== "/");

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" className="border-r border-white/[0.07] bg-[#0a0f15] text-[#dce7e0]">
        <SidebarHeader className="h-[88px] border-b border-white/[0.07] px-3 py-4">
          <div className="flex items-center gap-3 px-1">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#c7f35b] text-sm font-black tracking-tighter text-[#102015]">G</div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-semibold tracking-[0.16em] text-[#f4fbf6]">GIC</p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-[#789087]">Project operations</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2 py-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6b7e74] group-data-[collapsible=icon]:hidden">Operations</p>
          <SidebarMenu>
            {menuItems.map(item => {
              const selected = location === item.path || (item.path !== "/" && location.startsWith(`${item.path}/`));
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton tooltip={item.label} isActive={selected} onClick={() => setLocation(item.path)} className="h-10 rounded-xl text-[#a8bbb0] hover:bg-white/[0.06] hover:text-[#edf7f0] data-[active=true]:bg-[#c7f35b] data-[active=true]:text-[#132015]">
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {selected && <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-70 group-data-[collapsible=icon]:hidden" />}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="border-t border-white/[0.07] p-3">
          <div className="rounded-xl bg-white/[0.035] p-2 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
            <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
              <Avatar className="h-8 w-8 border border-white/10"><AvatarFallback className="bg-[#213027] text-xs text-[#c7f35b]">{user?.name?.slice(0, 1).toUpperCase() || "F"}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                <p className="truncate text-xs font-medium text-[#edf7f0]">{user?.name || "GIC operator"}</p>
                <Badge variant="outline" className="mt-1 border-[#c7f35b]/30 px-1.5 py-0 text-[9px] uppercase tracking-wide text-[#c7f35b]">{user?.role}</Badge>
              </div>
              <button onClick={logout} aria-label="Sign out" className="rounded-md p-1 text-[#82958a] transition hover:bg-white/10 hover:text-white group-data-[collapsible=icon]:hidden"><LogOut className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-[#f4f7f4]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[#dce6df] bg-[#f4f7f4]/90 px-5 backdrop-blur-xl lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {isMobile && <SidebarTrigger className="rounded-lg border border-[#dce6df] bg-white" />}
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-[#1c2b22]">{active?.label ?? "GIC operations"}</p><p className="mt-0.5 text-xs text-[#718076]">Private, auditable and human-supervised</p></div>
          </div>
          <div className="hidden items-center gap-2 sm:flex"><span className="h-2 w-2 rounded-full bg-[#79b743] shadow-[0_0_0_4px_rgba(121,183,67,.14)]" /><span className="text-xs font-medium text-[#64736a]">Control plane online</span></div>
        </header>
        <main className="min-h-[calc(100vh-72px)] p-5 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
