"use client";

import React, { useState } from "react";
import { EmployeeDocumentTree } from "./EmployeeDocumentTree";
import { EmployeeDocumentPanel } from "./EmployeeDocumentPanel";
import { Document } from "@/src/redux/feature/knowledgeApi";
import { TreeNode } from "@/src/features/admin/FolderTreeParser";
import {
  BookOpen,
  ChevronRight,
  Home,
} from "lucide-react";

interface BreadcrumbEntry {
  label: string;
  nodeId: string;
}

export function EmployeeDocumentBrowser() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [panelDocuments, setPanelDocuments] = useState<Document[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([]);
  const [nodeLabel, setNodeLabel] = useState<string | undefined>();

  const handleNodeSelect = (
    nodeId: string,
    path: string,
    type: TreeNode["type"],
    documents: Document[]
  ) => {
    if (type === "file") return; // File download handled inside tree, don't update panel
    setSelectedNodeId(nodeId);
    setPanelDocuments(documents);

    // Build breadcrumb label from nodeId segments (e.g. "dept:ws:deptId" → dept name already in tree)
    // We use the path as breadcrumb since the tree passes the logical path
    const segments = path.replace(/^\/+/, "").split("/").filter(Boolean);
    const crumbs: BreadcrumbEntry[] = segments.map((seg, i) => ({
      label: seg,
      nodeId: nodeId,
    }));
    setBreadcrumbs(crumbs);

    // Derive panel label from node id prefix
    const parts = nodeId.split(":");
    if (parts[0] === "workspace") setNodeLabel(path === "workspace-default" ? "Thư mục dùng chung" : path);
    else if (parts[0] === "dept") setNodeLabel(`Phòng ban`);
    else if (parts[0] === "folder") setNodeLabel(segments[segments.length - 1] ?? path);
    else setNodeLabel(path);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-semibold tracking-tight text-foreground flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-primary" />
            Internal Documents
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-lg">
            Browse and download company documents by department. Only documents you have access to are shown.
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground select-none">
          <Home className="w-3.5 h-3.5 shrink-0" />
          <ChevronRight className="w-3 h-3 shrink-0" />
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={crumb.nodeId + i}>
              <span
                className={
                  i === breadcrumbs.length - 1
                    ? "text-foreground font-semibold"
                    : "hover:text-foreground cursor-pointer transition-colors"
                }
              >
                {crumb.label}
              </span>
              {i < breadcrumbs.length - 1 && (
                <ChevronRight className="w-3 h-3 shrink-0" />
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Two-panel layout */}
      <div className="flex gap-6 items-start">
        <EmployeeDocumentTree
          onNodeSelect={handleNodeSelect}
          selectedNodeId={selectedNodeId}
        />
        <EmployeeDocumentPanel
          documents={panelDocuments}
          nodeLabel={nodeLabel}
        />
      </div>
    </div>
  );
}
