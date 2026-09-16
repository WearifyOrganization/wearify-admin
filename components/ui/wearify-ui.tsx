"use client";

import { cn } from "@/lib/utils";
import React from "react";

// ======================================================================
// Badge
// ======================================================================
const badgeColors: Record<string, string> = {
  active: "text-wf-green bg-wf-green/10",
  online: "text-wf-green bg-wf-green/10",
  running: "text-wf-green bg-wf-green/10",
  signed: "text-wf-green bg-wf-green/10",
  verified: "text-wf-green bg-wf-green/10",
  paid: "text-wf-green bg-wf-green/10",
  resolved: "text-wf-green bg-wf-green/10",
  ok: "text-wf-green bg-wf-green/10",
  supervised: "text-wf-green bg-wf-green/10",
  autonomous: "text-wf-green bg-wf-green/10",

  open: "text-wf-red bg-wf-red/10",
  P1: "text-wf-red bg-wf-red/10",
  offline: "text-wf-red bg-wf-red/10",
  churned: "text-wf-red bg-wf-red/10",
  terminated: "text-wf-red bg-wf-red/10",

  trial: "text-wf-amber bg-wf-amber/10",
  pending: "text-wf-amber bg-wf-amber/10",
  P2: "text-wf-amber bg-wf-amber/10",
  paused: "text-wf-amber bg-wf-amber/10",
  review: "text-wf-amber bg-wf-amber/10",

  progress: "text-wf-blue bg-wf-blue/10",
  P3: "text-wf-blue bg-wf-blue/10",

  shadow: "text-wf-primary bg-wf-primary/10",
  planned: "text-wf-muted bg-wf-muted/10",
};

export function Badge({
  status,
  children,
  className,
}: {
  status: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const colorClass = badgeColors[status] || "text-wf-muted bg-wf-muted/10";
  return (
    <span
      className={cn(
        "inline-block px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wide",
        colorClass,
        className
      )}
    >
      {children || status}
    </span>
  );
}

// ======================================================================
// Sample-data marker
// Flags a panel/tab that renders illustrative sample data rather than live
// telemetry, so the admin console never presents mock data as if it were real.
// ======================================================================
export function SampleBadge({ className }: { className?: string }) {
  return (
    <span
      title="Illustrative sample data — not live"
      className={cn(
        "inline-block px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wide text-wf-amber bg-wf-amber/10",
        className
      )}
    >
      Sample data
    </span>
  );
}

// ======================================================================
// KPI Card
// ======================================================================
export function KPI({
  label,
  value,
  subtitle,
  color,
  ai,
  sample,
  className,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  ai?: boolean;
  // Marks the number as illustrative, so a fabricated tile can never sit
  // unlabelled beside a measured one.
  sample?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-wf-card rounded-lg px-5 py-4 border border-wf-border flex-1 min-w-0 relative",
        className
      )}
    >
      {ai && !sample && (
        <div className="absolute top-2 right-3 text-[10px] font-bold text-wf-primary">
          AI
        </div>
      )}
      {sample && (
        <span
          title="Illustrative sample data — not live"
          className="absolute top-2 right-3 text-[10px] font-bold uppercase tracking-wide text-wf-amber"
        >
          Sample
        </span>
      )}
      <div className="text-xs text-wf-subtext mb-1">{label}</div>
      <div className="text-2xl font-extrabold text-wf-text font-mono">
        {value}
      </div>
      {subtitle && (
        <div
          className="text-xs font-semibold mt-1"
          style={{ color: color || "var(--color-wf-primary)" }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}

// ======================================================================
// Card
// ======================================================================
export function Card({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-wf-card rounded-lg border border-wf-border overflow-hidden mb-4",
        className
      )}
    >
      {(title || action) && (
        <div className="px-5 py-3 border-b border-wf-border flex justify-between items-center">
          <span className="text-base font-bold text-wf-text">{title}</span>
          {action}
        </div>
      )}
      <div className="px-5 py-3">{children}</div>
    </div>
  );
}

// ======================================================================
// Row
// ======================================================================
export function Row({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex py-2.5 border-b border-wf-border items-center gap-3 text-sm text-wf-text",
        onClick && "cursor-pointer hover:bg-wf-primary/5 px-2 -mx-2 rounded transition-colors",
        className
      )}
    >
      {children}
    </div>
  );
}

// ======================================================================
// Button
// ======================================================================
export function Btn({
  children,
  primary,
  danger,
  small,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  primary?: boolean;
  danger?: boolean;
  small?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-full font-semibold cursor-pointer whitespace-nowrap transition-all duration-200",
        small ? "px-4 py-1.5 text-xs" : "px-5 py-2.5 text-sm",
        primary
          ? "bg-wf-primary text-wf-bg border-none hover:bg-wf-primary/90"
          : danger
            ? "bg-wf-red text-wf-bg border-none hover:bg-wf-red/90"
            : "bg-transparent text-wf-primary border-[1.5px] border-wf-primary hover:bg-wf-primary/5",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
}

// ======================================================================
// Metric Progress Bar
// ======================================================================
export function Metric({
  label,
  value,
  max = 100,
  color,
}: {
  label: string;
  value: string;
  max?: number;
  color?: string;
}) {
  const pct = Math.min((parseFloat(value) / max) * 100, 100);
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-wf-subtext">{label}</span>
        <span className="font-semibold font-mono">{value}</span>
      </div>
      <div className="h-1.5 rounded bg-wf-border">
        <div
          className="h-full rounded transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: color || "var(--color-wf-primary)",
          }}
        />
      </div>
    </div>
  );
}

// ======================================================================
// Toggle Switch
// ======================================================================
export function Toggle({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={cn(
        "w-10 h-5 rounded-full cursor-pointer relative flex-shrink-0 transition-colors duration-200 border-none p-0",
        on ? "bg-wf-green" : "bg-wf-border"
      )}
    >
      <div
        className={cn(
          "w-4 h-4 rounded-full bg-white absolute top-[2px] shadow-sm transition-all duration-200",
          on ? "left-[22px]" : "left-[2px]"
        )}
      />
    </button>
  );
}

// ======================================================================
// Tabs
// ======================================================================
export function Tabs({
  items,
  active,
  onChange,
}: {
  items: string[];
  active: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex gap-1 mb-4 flex-wrap">
      {items.map((item) => (
        <button
          key={item}
          onClick={() => onChange(item)}
          className={cn(
            "px-4 py-1.5 rounded text-xs font-semibold cursor-pointer transition-colors duration-150",
            active === item
              ? "bg-wf-primary/10 text-wf-primary"
              : "bg-transparent text-wf-muted hover:text-wf-subtext hover:bg-wf-border/50"
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

// ======================================================================
// Loading Skeleton
// ======================================================================
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse bg-wf-border/50 rounded",
        className
      )}
    />
  );
}

export function PageLoading() {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 flex-1" />
        ))}
      </div>
      <Skeleton className="h-52 w-full" />
      <Skeleton className="h-36 w-full" />
    </div>
  );
}
