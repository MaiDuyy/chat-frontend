"use client";

import React from "react";
import { Globe, Building2, Lock, ShieldAlert } from "lucide-react";

type Classification = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";

const CLASSIFICATION_CONFIG: Record<
  Classification,
  { icon: React.ComponentType<{ className?: string }>; label: string; color: string; bg: string; borderColor: string }
> = {
  PUBLIC: { icon: Globe, label: "Công khai", color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30", borderColor: "border-green-200 dark:border-green-800" },
  INTERNAL: { icon: Building2, label: "Nội bộ", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30", borderColor: "border-blue-200 dark:border-blue-800" },
  CONFIDENTIAL: { icon: Lock, label: "Mật", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30", borderColor: "border-orange-200 dark:border-orange-800" },
  RESTRICTED: { icon: ShieldAlert, label: "Tối mật", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30", borderColor: "border-red-200 dark:border-red-800" },
};

export function WikiSecurityBadge({
  classification,
  allowedRoles,
  compact = false,
}: {
  classification?: string;
  departmentId?: string;
  allowedRoles?: string;
  compact?: boolean;
}) {
  const cls = (classification?.toUpperCase() || "INTERNAL") as Classification;
  const cfg = CLASSIFICATION_CONFIG[cls] ?? CLASSIFICATION_CONFIG.INTERNAL;
  const Icon = cfg.icon;

  if (compact) {
    return (
      <span title={cfg.label}>
        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 border text-[10.5px] font-mono font-bold uppercase tracking-wider rounded-md ${cfg.bg} ${cfg.color} ${cfg.borderColor}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{cfg.label}</span>
      {allowedRoles && allowedRoles !== "ALL" && (
        <span className="opacity-60">({allowedRoles})</span>
      )}
    </span>
  );
}

export function classificationColor(classification?: string): string {
  const hexColors: Record<Classification, string> = {
    PUBLIC: "#16a34a",
    INTERNAL: "#2563eb",
    CONFIDENTIAL: "#ea580c",
    RESTRICTED: "#dc2626",
  };
  const cls = (classification?.toUpperCase() || "INTERNAL") as Classification;
  return hexColors[cls] ?? "#2563eb";
}
