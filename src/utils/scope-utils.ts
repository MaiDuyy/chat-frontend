interface ScopeParams {
  workspaceId?: string;
  departmentId?: string;
  workspaces: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
}

/**
 * Formats workspace and department scopes into a premium, human-readable string.
 * Supporting Level 1, 2, and 3 visibility model.
 */
export function formatScopeLabel({
  workspaceId,
  departmentId,
  workspaces,
  departments,
}: ScopeParams): string {
  const isDeptWide = departmentId && 
                     departmentId !== '' && 
                     departmentId !== 'ALL' && 
                     departmentId !== 'GLOBAL' && 
                     (!workspaceId || workspaceId === 'default-workspace' || workspaceId === 'ALL' || workspaceId === 'GLOBAL');
  
  if (isDeptWide) {
    const deptName = departments.find((d: any) => d.id === departmentId)?.name || departmentId;
    return deptName.toLowerCase().startsWith('phòng')
      ? `Toàn bộ ${deptName} (ALL Workspaces)`
      : `Toàn bộ phòng ban ${deptName} (ALL Workspaces)`;
  }

  if (workspaceId && workspaceId !== 'default-workspace' && workspaceId !== 'ALL' && workspaceId !== 'GLOBAL') {
    const wsName = workspaces.find((ws: any) => ws.id === workspaceId)?.name;
    return wsName || workspaceId;
  }

  return 'Toàn hệ thống (ALL)';
}
