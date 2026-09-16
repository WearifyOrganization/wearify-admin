"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@wearify/shared/api";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { ToastProvider } from "@/components/ui/toast";
import {
  LayoutDashboard,
  AlertTriangle,
  Store,
  Monitor,
  Scissors,
  Bot,
  Brain,
  TrendingUp,
  Receipt,
  Network,
  Headphones,
  Scale,
  Shield,
  Database,
  Building2,
  ScrollText,
  Rocket,
  ServerCog,
  Settings,
  Users,
  LogOut,
} from "lucide-react";

type AdminRole = "super_admin" | "staff";

// superAdminOnly items are hidden from (and route-guarded against) staff. The
// unflagged four — stores, tailors, support, network — are the staff scope.
const NAV_ITEMS = [
  { key: "dashboard", label: "AI Dashboard", icon: LayoutDashboard, href: "/admin/dashboard", superAdminOnly: true },
  { key: "command-center", label: "Command Center", icon: AlertTriangle, href: "/admin/command-center", superAdminOnly: true },
  { key: "stores", label: "Stores", icon: Store, href: "/admin/stores" },
  { key: "tailors", label: "Tailors", icon: Scissors, href: "/admin/tailors" },
  { key: "devices", label: "Devices", icon: Monitor, href: "/admin/devices", superAdminOnly: true },
  { key: "agents", label: "AI Agents", icon: Bot, href: "/admin/agents", superAdminOnly: true },
  { key: "models", label: "AI Models", icon: Brain, href: "/admin/models", superAdminOnly: true },
  { key: "revenue", label: "Revenue", icon: TrendingUp, href: "/admin/revenue", superAdminOnly: true },
  { key: "billing", label: "Billing & Tax", icon: Receipt, href: "/admin/billing", superAdminOnly: true },
  { key: "network", label: "Network Intel", icon: Network, href: "/admin/network" },
  { key: "support", label: "Support", icon: Headphones, href: "/admin/support" },
  { key: "legal", label: "Legal", icon: Scale, href: "/admin/legal", superAdminOnly: true },
  { key: "security", label: "Security", icon: Shield, href: "/admin/security", superAdminOnly: true },
  { key: "data-governance", label: "Data Governance", icon: Database, href: "/admin/data-governance", superAdminOnly: true },
  { key: "vendors", label: "Vendors", icon: Building2, href: "/admin/vendors", superAdminOnly: true },
  { key: "audit", label: "Audit Trail", icon: ScrollText, href: "/admin/audit", superAdminOnly: true },
  { key: "releases", label: "OTA & Releases", icon: Rocket, href: "/admin/releases", superAdminOnly: true },
  { key: "resilience", label: "DR & Resilience", icon: ServerCog, href: "/admin/resilience", superAdminOnly: true },
  { key: "admin-users", label: "Admin Users", icon: Users, href: "/admin/admin-users", superAdminOnly: true },
  { key: "settings", label: "Settings", icon: Settings, href: "/admin/settings", superAdminOnly: true },
];

// Path prefixes a scoped staff admin may visit. Anything else redirects to
// /admin/stores. The server is the real gate; this is nav/routing UX.
const STAFF_ALLOWED_PREFIXES = [
  "/admin/stores",
  "/admin/tailors",
  "/admin/support",
  "/admin/network",
];

function Sidebar({ collapsed, onToggle, role }: { collapsed: boolean; onToggle: () => void; role: AdminRole }) {
  const pathname = usePathname();
  const items = role === "super_admin" ? NAV_ITEMS : NAV_ITEMS.filter((i) => !i.superAdminOnly);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 bottom-0 bg-white border-r border-wf-border z-30 flex flex-col transition-all duration-300 overflow-hidden",
        collapsed ? "w-[56px]" : "w-[210px]"
      )}
    >
      {/* Logo — the wordmark when there's room, the mark alone when collapsed */}
      <div className="px-4 py-4 border-b border-wf-border flex items-center gap-2 flex-shrink-0">
        {collapsed ? (
          <div className="w-7 h-7 rounded-lg bg-wf-primary flex items-center justify-center flex-shrink-0">
            <span className="text-wf-bg text-xs font-bold tracking-wider">W</span>
          </div>
        ) : (
          <div className="overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wearify-logo.svg" alt="Wearify" className="h-[18px] w-auto" />
            <div className="text-xs text-wf-muted mt-1">Mission Control</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {items.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-md mb-0.5 text-xs font-semibold transition-all duration-150 no-underline",
                isActive
                  ? "bg-wf-primary/10 text-wf-primary"
                  : "text-wf-subtext hover:bg-wf-card hover:text-wf-text"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={14} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="p-3 border-t border-wf-border text-wf-muted hover:text-wf-text text-xs cursor-pointer bg-transparent"
      >
        {collapsed ? "→" : "← Collapse"}
      </button>
    </aside>
  );
}

function Topbar({ sidebarWidth, userEmail, onLogout }: { sidebarWidth: number; userEmail: string; onLogout: () => void }) {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const i = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(i);
  }, []);

  return (
    <header
      className="fixed top-0 right-0 h-12 bg-white/80 backdrop-blur-md border-b border-wf-border z-20 flex items-center justify-between px-6"
      style={{ left: sidebarWidth }}
    >
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-wf-green animate-pulse" />
        <span className="text-xs text-wf-subtext">
          Platform Live — {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-wf-muted font-mono">v4.0</span>
        <span className="text-xs text-wf-subtext">{userEmail}</span>
        <button
          onClick={onLogout}
          title="Sign out"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-wf-subtext hover:text-wf-red hover:bg-wf-red/5 transition-colors cursor-pointer bg-transparent border-none"
        >
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const sidebarWidth = collapsed ? 56 : 210;

  const isLoginPage = pathname === "/admin/login";

  // Convex auth must settle before we trust getMe — right after sign-in the
  // session token takes a tick to reach the Convex client, during which getMe
  // would (wrongly) resolve as an unauthenticated null. Skip the query until
  // authenticated so we never sign a freshly-logged-in admin back out.
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  // getMe is the authority: undefined = loading/skipped, null = signed in but
  // not an active admin, { email, role } = an active admin. Server-gated.
  const me = useQuery(api.adminUsers.getMe, isAuthenticated ? {} : "skip");

  // Auth settled but no session → go to login.
  useEffect(() => {
    if (isLoginPage || authLoading || isAuthenticated) return;
    router.replace("/admin/login");
  }, [isLoginPage, authLoading, isAuthenticated, router]);

  // Signed in but not a recognized active admin → sign out and bounce to login.
  useEffect(() => {
    if (isLoginPage || !isAuthenticated || me !== null) return;
    authClient
      .signOut()
      .catch(() => {})
      .finally(() => router.replace("/admin/login"));
  }, [me, isLoginPage, isAuthenticated, router]);

  // Scoped staff hitting a super-only path → bounce to their landing page.
  useEffect(() => {
    if (isLoginPage || !me || me.role === "super_admin") return;
    if (!STAFF_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p))) {
      router.replace("/admin/stores");
    }
  }, [me, pathname, isLoginPage, router]);

  const handleLogout = async () => {
    await authClient.signOut();
    router.replace("/admin/login");
  };

  // Login page renders without the admin shell
  if (isLoginPage) {
    return (
      <>
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        {children}
      </>
    );
  }

  // Loading state — auth settling, or getMe in flight for an authed session.
  if (authLoading || (isAuthenticated && me === undefined)) {
    return (
      <div className="min-h-screen bg-wf-bg flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-wf-primary flex items-center justify-center">
            <span className="text-wf-bg text-xs font-bold">W</span>
          </div>
          <div className="text-sm text-wf-subtext">Loading...</div>
        </div>
      </div>
    );
  }

  // Not signed in, or signed in but not an active admin — redirect in progress.
  if (!isAuthenticated || !me) {
    return null;
  }

  // Staff on a super-only path: don't mount the page (its super-only queries
  // would throw) while the route guard above redirects to /admin/stores.
  const staffBlocked =
    me.role !== "super_admin" &&
    !STAFF_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p));
  if (staffBlocked) {
    return null;
  }

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap"
        rel="stylesheet"
      />
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} role={me.role as AdminRole} />
      <Topbar sidebarWidth={sidebarWidth} userEmail={me.email} onLogout={handleLogout} />
      <main
        className="pt-12 min-h-screen bg-wf-bg transition-all duration-300 flex flex-col"
        style={{ marginLeft: sidebarWidth }}
      >
        <div className="p-6 flex-1">{children}</div>
        {/* Same copyright band every other module ends on */}
        <footer className="border-t border-wf-border py-3 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-wf-muted">
          © Copyright {new Date().getFullYear()} Phygify Technoservices Pvt. Ltd.
        </footer>
      </main>
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </ToastProvider>
  );
}
