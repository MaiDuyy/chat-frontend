"use client";

import React from "react";
import Link from "next/link";
import {
  Folder,
  FileText,
  ChevronDown,
  ChevronRight,
  Compass,
  HelpCircle,
  Clock,
  Search,
  X,
  List
} from "lucide-react";
import { useGetWikiIndexQuery, WikiIndexEntry, WikiIndexGroup } from "@/src/redux/feature/mrpApi";
import { wikiTypeIcon, wikiTypeGroupLabel } from "./WikiTypeBadge";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "@/src/features/knowledge/MarkdownContent";

interface TreeNode {
  name: string;
  key: string;
  items: WikiIndexEntry[];
  children: Map<string, TreeNode>;
}

export function WikiIndexBrowser({ workspaceId }: { workspaceId: string }) {
  const { data: indexData, isLoading, error } = useGetWikiIndexQuery({
    workspaceId,
    limit: 100, // Fetch a large enough batch to render a robust index
  });

  const [activeTab, setActiveTab] = React.useState<string>("concept");
  const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = React.useState<"tree" | "list">("tree");
  const [searchQuery, setSearchQuery] = React.useState("");

  const groups = indexData?.groups || [];
  const activeGroup = groups.find((g) => g.type === activeTab);

  // Compute search results within active group
  const searchResults = React.useMemo(() => {
    if (!searchQuery || !activeGroup?.items) return [];
    const query = searchQuery.toLowerCase().trim();
    return activeGroup.items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.slug.toLowerCase().includes(query) ||
        (item.summary && item.summary.toLowerCase().includes(query))
    );
  }, [searchQuery, activeGroup]);

  // Compute flat list of active category items (sorted alphabetically)
  const flatListItems = React.useMemo(() => {
    if (!activeGroup?.items) return [];
    return [...activeGroup.items].sort((a, b) => a.title.localeCompare(b.title));
  }, [activeGroup]);

  const toggleFolder = (key: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Convert flat index entries into a tree structure
  const buildFolderTree = (entries: WikiIndexEntry[]): TreeNode => {
    const root: TreeNode = {
      name: "Root",
      key: "root",
      items: [],
      children: new Map(),
    };

    for (const entry of entries) {
      let current = root;
      const path = entry.category_path || [];

      let currentPathKey = "";
      for (const segment of path) {
        const cleanSegment = segment.trim();
        if (!cleanSegment) continue;

        currentPathKey = currentPathKey ? `${currentPathKey}/${cleanSegment}` : cleanSegment;

        if (!current.children.has(cleanSegment)) {
          current.children.set(cleanSegment, {
            name: cleanSegment,
            key: currentPathKey,
            items: [],
            children: new Map(),
          });
        }
        current = current.children.get(cleanSegment)!;
      }

      current.items.push(entry);
    }

    return root;
  };

  const folderTree = React.useMemo(() => {
    if (!activeGroup || !activeGroup.items) return null;
    return buildFolderTree(activeGroup.items);
  }, [activeGroup]);

  // Recursively render TreeNode
  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const sortedChildrenKeys = Array.from(node.children.keys()).sort();

    return (
      <div key={node.key} className="flex flex-col gap-1 w-full select-none">
        {/* Render folders in this node */}
        {sortedChildrenKeys.map((childKey) => {
          const childNode = node.children.get(childKey)!;
          const isExpanded = expandedFolders.has(childNode.key);
          const hasContent = childNode.children.size > 0 || childNode.items.length > 0;

          return (
            <div key={childNode.key} className="flex flex-col w-full">
              <button
                onClick={() => toggleFolder(childNode.key)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-muted/50 rounded-md transition-all text-left text-xs font-semibold text-foreground/80 border border-transparent hover:border-border cursor-pointer"
                style={{ paddingLeft: `${Math.max(10, depth * 16 + 10)}px` }}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
                <Folder className="w-4 h-4 text-amber-500/80 fill-amber-500/10 shrink-0" />
                <span className="flex-1 truncate">{childNode.name}</span>
                <span className="text-[10px] font-mono text-muted-foreground font-bold px-1.5 py-0.2 bg-muted border rounded">
                  {childNode.items.length + childNode.children.size}
                </span>
              </button>

              {isExpanded && hasContent && (
                <div className="flex flex-col gap-0.5 border-l border-border/80 ml-4.5 mt-0.5 pl-1.5">
                  {renderTreeNode(childNode, depth + 1)}
                </div>
              )}
            </div>
          );
        })}

        {/* Render pages (items) directly in this node */}
        {node.items.map((item) => (
          <div key={item.slug} className="flex flex-col w-full">
            <Link
              href={`/wiki/${encodeURIComponent(item.slug)}`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-primary/5 hover:text-primary rounded-md transition-all text-left text-xs text-foreground/90 border border-transparent hover:border-primary/10 cursor-pointer group"
              style={{ paddingLeft: `${Math.max(10, depth * 16 + 10)}px` }}
            >
              <FileText className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{item.title}</div>
                {item.wiki_path && (
                  <div className="text-[9px] text-muted-foreground/60 truncate font-mono mt-0.5">
                    {item.wiki_path}
                  </div>
                )}
                {!item.wiki_path && item.summary && (
                  <div className="text-[10px] text-muted-foreground truncate font-sans font-normal mt-0.5">
                    {item.summary}
                  </div>
                )}
              </div>
            </Link>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 py-6 items-center justify-center text-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent animate-spin rounded-full" />
        <span className="text-xs font-mono text-muted-foreground">Đang tải thư mục tri thức...</span>
      </div>
    );
  }

  if (error || groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-lg bg-muted/5 text-center">
        <HelpCircle className="w-8 h-8 text-muted-foreground/60 mb-2" />
        <h3 className="text-xs font-bold text-foreground">Không tải được thư mục tri thức</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">Vui lòng kiểm tra lại kết nối hoặc tài liệu đã biên soạn.</p>
      </div>
    );
  }

  return (
    <div className="border border-border bg-card p-4 rounded-lg shadow-md flex flex-col gap-4 w-full">
      <div className="border-b pb-2 flex items-center justify-between border-dashed">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-primary shrink-0" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
            THƯ MỤC TRI THỨC (WIKI BROWSER)
          </span>
        </div>
        {/* Total count */}
        <span className="text-[9px] font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
          {groups.reduce((sum, g) => sum + (g.total || 0), 0)} trang
        </span>
      </div>

      {/* Intro from index page — rendered as markdown */}
      {indexData?.intro && indexData.intro.trim().length > 10 && (
        <div className="text-xs leading-relaxed bg-muted/30 p-3 rounded-md border border-border/60 prose-sm max-h-[200px] overflow-y-auto">
          <MarkdownContent content={indexData.intro.length > 600 ? indexData.intro.substring(0, 600) + '\n\n...' : indexData.intro} />
        </div>
      )}

      {/* Per-type statistics bar */}
      {groups.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1 h-2 rounded-full overflow-hidden bg-muted">
            {groups.map((group) => {
              const total = groups.reduce((s, g) => s + (g.total || 0), 0);
              const pct = total > 0 ? ((group.total || 0) / total) * 100 : 0;
              const colors: Record<string, string> = {
                concept: 'bg-emerald-500',
                entity: 'bg-sky-500',
                topic: 'bg-amber-500',
                source: 'bg-rose-500',
              };
              return (
                <div
                  key={group.type}
                  className={cn("h-full transition-all", colors[group.type] || 'bg-primary')}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                  title={`${wikiTypeGroupLabel(group.type)}: ${group.total} trang (${pct.toFixed(0)}%)`}
                />
              );
            })}
          </div>
          {/* Stats Legend Bar */}
          <div className="flex flex-wrap items-center justify-between text-[10px] text-muted-foreground gap-2 pt-1 select-none border-b pb-2 border-dashed">
            {groups.map((group) => {
              const total = groups.reduce((s, g) => s + (g.total || 0), 0);
              const pct = total > 0 ? ((group.total || 0) / total) * 100 : 0;
              const colors: Record<string, string> = {
                concept: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5',
                entity: 'text-sky-500 border-sky-500/20 bg-sky-500/5',
                topic: 'text-amber-500 border-amber-500/20 bg-amber-500/5',
                source: 'text-rose-500 border-rose-500/20 bg-rose-500/5',
              };
              return (
                <div key={group.type} className={cn("px-2 py-0.5 rounded border flex items-center gap-1.5", colors[group.type])}>
                  <span className="font-bold">{wikiTypeGroupLabel(group.type)}:</span>
                  <span className="font-mono font-medium">{group.total} ({pct.toFixed(0)}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs & Search controls */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1 border-b border-border pb-1 select-none">
          {groups.map((group) => {
            const type = group.type;
            const isActive = activeTab === type;
            const Icon = wikiTypeIcon(type);

            return (
              <button
                key={type}
                onClick={() => {
                  setActiveTab(type);
                  setExpandedFolders(new Set()); // Reset folder states when swapping tabs
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{wikiTypeGroupLabel(type)}</span>
                <span className="text-[9px] font-mono font-bold text-muted-foreground px-1 bg-muted rounded ml-1">
                  {group.total}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & View Toggle controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder={`Tìm kiếm trong nhóm ${wikiTypeGroupLabel(activeTab)}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 bg-background border border-border rounded-md pl-8 pr-8 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 border border-border rounded-md p-0.5 bg-muted/35 shrink-0 self-end sm:self-auto select-none">
            <button
              onClick={() => setViewMode("tree")}
              className={cn(
                "px-2.5 py-1 rounded-sm text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer",
                viewMode === "tree"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Dạng thư mục cây"
            >
              <Compass className="w-3 h-3 text-primary" />
              <span className="hidden sm:inline">Cây thư mục</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "px-2.5 py-1 rounded-sm text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer",
                viewMode === "list"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Dạng danh sách phẳng"
            >
              <List className="w-3 h-3 text-primary" />
              <span className="hidden sm:inline">Danh sách</span>
            </button>
          </div>
        </div>
      </div>

      {/* Directory Browser View */}
      <div className="bg-background border border-border/80 rounded-lg p-2 min-h-[300px] overflow-y-auto max-h-[500px]">
        {searchQuery ? (
          searchResults.length > 0 ? (
            <div className="flex flex-col gap-1 w-full">
              <div className="px-2.5 py-1 text-[10px] font-mono text-muted-foreground border-b pb-1 mb-1">
                KẾT QUẢ TÌM KIẾM ({searchResults.length})
              </div>
              {searchResults.map((item) => (
                <Link
                  key={item.slug}
                  href={`/wiki/${encodeURIComponent(item.slug)}`}
                  className="flex items-center gap-1.5 px-2.5 py-2 hover:bg-primary/5 hover:text-primary rounded-md transition-all text-left text-xs text-foreground/90 border border-transparent hover:border-primary/10 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{item.title}</div>
                    <div className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                      /{item.slug} {item.category_path && item.category_path.length > 0 && `• thuộc ${item.category_path.join("/")}`}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HelpCircle className="w-6 h-6 text-muted-foreground/60 mb-2" />
              <p className="text-xs text-muted-foreground">Không tìm thấy tài liệu phù hợp</p>
            </div>
          )
        ) : viewMode === "list" ? (
          flatListItems.length > 0 ? (
            <div className="flex flex-col gap-1 w-full animate-in fade-in duration-200">
              {flatListItems.map((item) => (
                <Link
                  key={item.slug}
                  href={`/wiki/${encodeURIComponent(item.slug)}`}
                  className="flex items-center gap-1.5 px-2.5 py-2 hover:bg-primary/5 hover:text-primary rounded-md transition-all text-left text-xs text-foreground/90 border border-transparent hover:border-primary/10 cursor-pointer group"
                >
                  <FileText className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{item.title}</div>
                    {item.wiki_path && (
                      <div className="text-[9px] text-muted-foreground/60 truncate font-mono mt-0.5">
                        {item.wiki_path}
                      </div>
                    )}
                    {!item.wiki_path && item.summary && (
                      <div className="text-[10px] text-muted-foreground truncate font-sans font-normal mt-0.5">
                        {item.summary}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HelpCircle className="w-6 h-6 text-muted-foreground/60 mb-2" />
              <p className="text-xs text-muted-foreground">Không có trang nào trong mục này</p>
            </div>
          )
        ) : (
          folderTree && (folderTree.children.size > 0 || folderTree.items.length > 0) ? (
            renderTreeNode(folderTree)
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HelpCircle className="w-6 h-6 text-muted-foreground/60 mb-2" />
              <p className="text-xs text-muted-foreground">Không có trang nào trong mục này</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
