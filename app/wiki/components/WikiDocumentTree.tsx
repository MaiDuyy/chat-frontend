"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSelector } from "react-redux";
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
  Globe,
  Building2,
  Cpu,
  Database,
  Download
} from "lucide-react";
import { useGetDocumentsQuery, Document } from "@/src/redux/feature/knowledgeApi";
import { useGetUserWorkspacesQuery } from "@/src/redux/feature/workspaceApi";
import { useListDepartmentsQuery } from "@/src/redux/feature/departmentApi";
import { parseDocumentsToTree, TreeNode } from "@/src/features/admin/FolderTreeParser";
import { toast } from "sonner";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function WikiDocumentTree() {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 150);

  // States for expanded nodes
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // API Queries
  const { data: documentsData, isLoading: isDocsLoading } = useGetDocumentsQuery({ workspaceId: "all" });
  const { data: workspaces = [], isLoading: isWorkspacesLoading } = useGetUserWorkspacesQuery();
  const { data: departments = [], isLoading: isDeptsLoading } = useListDepartmentsQuery();

  const documents = useMemo(() => {
    if (!documentsData) return [];
    if (Array.isArray(documentsData)) return documentsData;
    return (documentsData as any).content || [];
  }, [documentsData]);

  // Expand all workspace and department nodes by default once data is loaded
  // Note: workspace-default is always pre-expanded so documents are immediately visible
  useEffect(() => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      next.add("workspace:workspace-default"); // always expand global shared folder
      workspaces.forEach(ws => next.add(`workspace:${ws.id}`));
      departments.forEach(dept => next.add(`dept:${dept.id}`));
      return next;
    });
  }, [workspaces, departments]);

  const treeData = useMemo(() => {
    // Filter documents by search first if search query is present
    let filteredDocs = documents;
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      filteredDocs = documents.filter(
        (d: Document) =>
          d.fileName.toLowerCase().includes(q) ||
          (d.folderPath && d.folderPath.toLowerCase().includes(q))
      );
    }

    return parseDocumentsToTree(filteredDocs, workspaces, departments);
  }, [documents, workspaces, departments, debouncedSearch]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
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
      // Build download link using raw endpoint
      const downloadUrl = `/api/documents/${doc.id}/raw`;
      const link = window.document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", doc.fileName);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Đang tải xuống: ${doc.fileName}`);
    } catch (e) {
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
        return isExpanded 
          ? <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          : <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case "file":
        return <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
      default:
        return null;
    }
  };

  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="flex flex-col select-none">
        {/* Row element */}
        <div
          className={`group flex items-center gap-1.5 px-2 py-1 hover:bg-muted/50 rounded-md transition-all border border-transparent hover:border-border text-left ${
            node.type === "file" ? "cursor-pointer" : ""
          }`}
          style={{ paddingLeft: `${Math.max(8, depth * 12)}px` }}
          onClick={() => {
            if (node.type === "file" && node.document) {
              handleDownload(node.document);
            } else if (hasChildren) {
              toggleNode(node.id);
            }
          }}
        >
          {/* Collapse/Expand Toggle Indicator */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="p-0.5 hover:bg-foreground/5 text-muted-foreground rounded-md transition-colors cursor-pointer"
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

          {/* Icon */}
          {renderIcon(node.type, isExpanded)}

          {/* Name */}
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

          {/* Actions for File Node */}
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

        {/* Nested Nodes */}
        {hasChildren && isExpanded && (
          <div className="flex flex-col gap-0.5">
            {node.children.map(child => renderTreeNode(child, depth + 1))}
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
          title="Mở rộng danh mục tài liệu"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 shrink-0 border border-border bg-card flex flex-col overflow-hidden rounded-lg min-h-[500px] shadow-sm">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted select-none">
        <span className="text-[10px] font-mono font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <FolderOpen className="w-4 h-4 text-primary" /> THƯ MỤC TÀI LIỆU
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 hover:bg-foreground/5 text-muted-foreground hover:text-foreground rounded-md transition-colors cursor-pointer"
            title="Thu gọn"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Local Filter input */}
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

      {/* Tree Listing */}
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
            {treeData.map(node => renderTreeNode(node))}
          </div>
        )}
      </div>
    </div>
  );
}
