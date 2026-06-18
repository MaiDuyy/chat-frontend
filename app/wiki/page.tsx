"use client";

import { useHasAnyRole } from "@/src/lib/rbac/usePermission";
import { EmployeeWikiView } from "@/src/features/employee/EmployeeWikiView";
import { AdminWikiDashboard } from "@/src/features/admin/AdminWikiDashboard";

export default function WikiPage() {
  const canManageWiki = useHasAnyRole([
    "SUPER_ADMIN",
    "ADMIN",
    "WORKSPACE_MANAGER",
  ]);

  if (canManageWiki) {
    return <AdminWikiDashboard />;
  }

  return <EmployeeWikiView />;
}
