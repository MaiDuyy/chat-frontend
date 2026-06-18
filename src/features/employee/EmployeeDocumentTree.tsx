"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Search,
  X,
  PanelLeftClose,
  PanelLeft,
  Folder,
  FolderOpen,
  FileText,
  Building2,
  Database,
  Download,
} from "lucide-react";
import { useGetDocumentsQuery, Document } from "@/src/redux/feature/knowledgeApi";
import { useGetUserWorkspacesQuery } from "@/src/redux/feature/workspaceApi";
import { useListDepartmentsQuery } from "@/src/redux/feature/departmentApi";
import { parseDocumentsToTree, TreeNode } from "@/src/features/admin/FolderTreeParser";
import { toast } from "sonner";

// ─── Utilities ─────────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Props ──────────────────────────────────────────────────────────────────────
export interface EmployeeDocumentTreeProps {
  /** Called when user clicks on a workspace/department/folder node */
  onNodeSelect: (nodeId: string, path: string, type: TreeNode["type"], documents: Document[]) => void;
  selectedNodeId?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function EmployeeDocumentTree({ onNodeSelect, selectedNodeId }: EmployeeDocumentTreeProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 150);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Backend auto-filters based on the caller's JWT/headers
  const { data: documentsData, isLoading: isDocsLoading } = useGetDocumentsQuery({ workspaceId: "all" });
  const { data: workspaces = [], isLoading: isWorkspacesLoading } = useGetUserWorkspacesQuery();
  const { data: departments = [], isLoading: isDeptsLoading } = useListDepartmentsQuery();

  const allDocuments: Document[] = useMemo(() => {
    if (!documentsData) return [];
    if (Array.isArray(documentsData)) return documentsData;
    return (documentsData as { content?: Document[] }).content ?? [];
  }, [documentsData]);

  // Auto-expand workspace, department, and default-workspace nodes on load
  useEffect(() => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      next.add("workspace:workspace-default");
      workspaces.forEach((ws) => next.add(`workspace:${ws.id}`));
      departments.forEach((dept) => next.add(`dept:${dept.id}`));
      return next;
    });
  }, [workspaces, departments]);

  const treeData = useMemo(() => {
    let filtered = allDocuments;
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      filtered = allDocuments.filter(
        (d) =>
          d.fileName.toLowerCase().includes(q) ||
          (d.folderPath && d.folderPath.toLowerCase().includes(q))
      );
    }
    return parseDocumentsToTree(filtered, workspaces, departments);
  }, [allDocuments, workspaces, departments, debouncedSearch]);

  // Collect documents that belong to a node (workspace/department/folder/file)
  function collectNodeDocuments(node: TreeNode): Document[] {
    if (node.type === "file" && node.document) return [node.document];
    return node.children.flatMap(collectNodeDocuments);
  }

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleDownload = async (doc: Document) => {
    try {
      const link = window.document.createElement("a");
      link.href = `/api/documents/${doc.id}/raw`;
      link.setAttribute("download", doc.fileName);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Đang tải xuống: ${doc.fileName}`);
    } catch {
      toast.error("Lỗi khi tải tài liệu");
    }
  };

  const renderIcon = (type: TreeNode["type"], isExpanded?: boolean) => {
    switch (type) {
      case "workspace":
        return <Database className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
      case "department":
        return <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
      case "folder":
        return isExpanded ? (
          <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        ) : (
          <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        );
      case "file":
        return <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
      default:
        return null;
    }
  };

  const renderTreeNode = (node: TreeNode, depth = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNodeId === node.id;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="flex flex-col select-none">
        <div
          className={`group flex items-center gap-1.5 px-2 py-1 rounded-md transition-all border cursor-pointer ${
            isSelected
              ? "bg-primary/10 border-primary/30 text-primary"
              : "border-transparent hover:bg-muted/50 hover:border-border"
          }`}
          style={{ paddingLeft: `${Math.max(8, depth * 12)}px` }}
          onClick={() => {
            if (node.type === "file" && node.document) {
              handleDownload(node.document);
            } else {
              toggleNode(node.id);
              const docs = collectNodeDocuments(node);
              onNodeSelect(node.id, node.path, node.type, docs);
            }
          }}
        >
          {/* Expand toggle */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="p-0.5 hover:bg-foreground/5 text-muted-foreground rounded-md transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 shrink-0" />
              ) : (
                <ChevronRight className="w-3 h-3 shrink-0" />
              )}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}

          {renderIcon(node.type, isExpanded)}

          <span
            className={`text-xs truncate flex-1 ${
              node.type === "workspace"
                ? "font-mono font-extrabold uppercase text-foreground/80 tracking-wide"
                : node.type === "department"
                ? "font-mono font-bold text-foreground/70"
                : node.type === "folder"
                ? "font-medium text-foreground/75"
                : "text-muted-foreground group-hover:text-foreground"
            }`}
            title={node.name}
          >
            {node.name}
          </span>

          {/* Download button on file hover */}
          {node.type === "file" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (node.document) handleDownload(node.document);
              }}
              className="p-1 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
              title="Tải về tài liệu"
            >
              <Download className="w-3 h-3" />
            </button>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="flex flex-col gap-0.5">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const isLoading = isDocsLoading || isWorkspacesLoading || isDeptsLoading;

  if (collapsed) {
    return (
      <div className="w-12 border border-border bg-card flex flex-col items-center pt-4 gap-3 shrink-0 rounded-lg min-h-[500px] select-none shadow-sm">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 border border-border hover:bg-muted text-foreground transition-all rounded-md hover:border-primary/20 cursor-pointer"
          title="Expand document tree"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 shrink-0 border border-border bg-card flex flex-col overflow-hidden rounded-lg min-h-[500px] shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted select-none">
        <span className="text-[10px] font-mono font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <FolderOpen className="w-4 h-4 text-primary" /> THƯ MỤC TÀI LIỆU
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 hover:bg-foreground/5 text-muted-foreground hover:text-foreground rounded-md transition-colors cursor-pointer"
          title="Thu gọn"
        >
          <PanelLeftClose className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-2.5 py-1.5 border-b border-border bg-background">
        <div className="flex items-center gap-1.5 bg-card border border-border px-2 py-1 rounded-md focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm tài liệu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground font-sans"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-2 px-1 max-h-[580px] bg-background">
        {isLoading ? (
          <div className="px-2 space-y-2 mt-1 select-none">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-7 border border-border bg-muted animate-pulse rounded-md"
                style={{ opacity: 1 - i * 0.15 }}
              />
            ))}
          </div>
        ) : treeData.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic px-3 py-4 select-none">
            Không tìm thấy tài liệu nào
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {treeData.map((node) => renderTreeNode(node))}
          </div>
        )}
      </div>
    </div>
  );
}
