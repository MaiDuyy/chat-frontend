"use client";

import React from "react";
import { useSelector } from "react-redux";
import { useHasRole } from "@/src/lib/rbac/usePermission";
import { WikiHealthDashboard } from "../components/WikiHealthDashboard";

export default function WikiHealthPage() {
  const currentWorkspaceId = useSelector((state: any) => state.workspace.currentWorkspaceId);
  const workspaceId = currentWorkspaceId || "default-workspace";

  const isSuperAdmin = useHasRole("SUPER_ADMIN");
  const isAdmin = useHasRole("ADMIN");

  if (!isSuperAdmin && !isAdmin) {
    return (
      <div className="font-sans min-h-[400px] flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Bạn không có quyền truy cập trang này.</p>
      </div>
    );
  }

  return <WikiHealthDashboard workspaceId={workspaceId} />;
}
