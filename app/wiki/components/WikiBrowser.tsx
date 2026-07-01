"use client";

import React from "react";
import Link from "next/link";
import {
  Search, X, ChevronLeft, Eye, Network,
  Folder, FileText, ChevronRight, ChevronDown, List,
  Compass, Menu, BookOpen, ArrowUpRight, Link2,
  HelpCircle, Loader2, FolderTree, AlertTriangle,
} from "lucide-react";
import {
  useGetWikiPageBySlugQuery,
  useGetWikiIndexQuery,
  useGetWikiPagesMetadataQuery,
  useGetWikiIssueCountQuery,
  WikiIndexEntry,
} from "@/src/redux/feature/mrpApi";
import { WikiContent } from "./WikiContent";
import { wikiTypeColor, wikiTypeGroupLabel, wikiTypeIcon } from "./WikiTypeBadge";
import { MarkdownContent } from "@/src/features/knowledge/MarkdownContent";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { WikiIssuePanel } from "./WikiIssuePanel";
import { WikiFixerChat } from "./WikiFixerChat";
import { useHasAnyRole } from "@/src/lib/rbac/usePermission";

// ── Tree types ────────────────────────────────────────────────────────
interface TreeNode {
  name: string;
  key: string;
  items: WikiIndexEntry[];
  children: Map<string, TreeNode>;
}

function buildTree(entries: WikiIndexEntry[]): TreeNode {
  const root: TreeNode = { name: "Root", key: "root", items: [], children: new Map() };
  for (const entry of entries) {
    let cur = root;
    for (const seg of (entry.category_path || [])) {
      const s = seg.trim();
      if (!s) continue;
      const pathKey = cur.key === "root" ? s : `${cur.key}/${s}`;
      if (!cur.children.has(s))
        cur.children.set(s, { name: s, key: pathKey, items: [], children: new Map() });
      cur = cur.children.get(s)!;
    }
    cur.items.push(entry);
  }
  return root;
}

// ── Sidebar panel ─────────────────────────────────────────────────────
interface SidebarProps {
  workspaceId: string;
  selectedSlug: string | null;
  systemView: "index" | null;
  onSelectPage: (slug: string) => void;
  onOpenIndex: () => void;
}

function WikiSidebar({ workspaceId, selectedSlug, systemView, onSelectPage, onOpenIndex }: SidebarProps) {
  const { data: indexData, isLoading } = useGetWikiIndexQuery({ workspaceId, limit: 200 });
  const [activeTab, setActiveTab] = React.useState<string>("");
  const [viewMode, setViewMode] = React.useState<"tree" | "list">("tree");
  const [search, setSearch] = React.useState("");
  const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(new Set());

  const groups = indexData?.groups || [];

  React.useEffect(() => {
    if (groups.length > 0 && !activeTab) {
      setActiveTab(groups[0].type);
    }
  }, [groups, activeTab]);

  const activeGroup = groups.find((g) => g.type === activeTab);

  const searchResults = React.useMemo(() => {
    if (!search || !activeGroup?.items) return [];
    const q = search.toLowerCase();
    return activeGroup.items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q) ||
        (item.summary && item.summary.toLowerCase().includes(q))
    );
  }, [search, activeGroup]);

  const folderTree = React.useMemo(() => {
    if (!activeGroup?.items) return null;
    return buildTree(activeGroup.items);
  }, [activeGroup]);

  const flatItems = React.useMemo(() => {
    if (!activeGroup?.items) return [];
    return [...activeGroup.items].sort((a, b) => a.title.localeCompare(b.title));
  }, [activeGroup]);

  const toggleFolder = (key: string) =>
    setExpandedFolders((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  const renderTreeNode = (node: TreeNode, depth = 0): React.ReactNode => {
    const sortedKeys = Array.from(node.children.keys()).sort();
    return (
      <div key={node.key} className="flex flex-col w-full">
        {sortedKeys.map((k) => {
          const child = node.children.get(k)!;
          const isExpanded = expandedFolders.has(child.key);
          return (
            <div key={child.key} className="flex flex-col w-full">
              <button
                onClick={() => toggleFolder(child.key)}
                className="flex items-center gap-1.5 w-full py-1.5 hover:bg-muted/60 rounded-md transition-colors text-left"
                style={{ paddingLeft: `${depth * 14 + 8}px` }}
              >
                {isExpanded
                  ? <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                  : <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                }
                <Folder className="w-3.5 h-3.5 text-amber-500/70 fill-amber-500/10 shrink-0" />
                <span className="flex-1 text-xs font-medium text-foreground/80 truncate">{child.name}</span>
                <span className="text-[9px] font-mono text-muted-foreground mr-1.5">
                  {child.items.length}
                </span>
              </button>
              {isExpanded && (
                <div className="border-l border-border/60 ml-4 pl-1">
                  {renderTreeNode(child, depth + 1)}
                </div>
              )}
            </div>
          );
        })}
        {node.items.map((item) => (
          <button
            key={item.slug}
            onClick={() => onSelectPage(item.slug)}
            className={cn(
              "flex items-center gap-1.5 w-full py-1.5 rounded-md transition-colors text-left group",
              selectedSlug === item.slug
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted/60 text-foreground/80 hover:text-foreground"
            )}
            style={{ paddingLeft: `${depth * 14 + 8}px` }}
          >
            <FileText className={cn(
              "w-3.5 h-3.5 shrink-0",
              selectedSlug === item.slug ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
            )} />
            <span className="text-xs font-medium truncate flex-1">{item.title}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Search */}
      <div className="p-2 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm kiếm trang..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 bg-background border border-border rounded-md pl-8 pr-7 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Special nav items */}
      <div className="px-2 pt-2 pb-1 shrink-0">
        <button
          onClick={onOpenIndex}
          className={cn(
            "flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
            systemView === "index"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          )}
        >
          <BookOpen className="w-3.5 h-3.5 shrink-0" />
          <span>Tổng quan tri thức</span>
        </button>
      </div>

      <div className="mx-2 border-t border-border/60 my-1 shrink-0" />

      {/* Type tabs */}
      {groups.length > 0 && (
        <div className="px-2 shrink-0">
          <div className="flex flex-wrap gap-1 pb-2">
            {groups.map((g) => {
              const Icon = wikiTypeIcon(g.type);
              const isActive = activeTab === g.type;
              return (
                <button
                  key={g.type}
                  onClick={() => { setActiveTab(g.type); setExpandedFolders(new Set()); }}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer",
                    isActive
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  <span>{wikiTypeGroupLabel(g.type)}</span>
                  <span className="font-mono opacity-60">{g.total}</span>
                </button>
              );
            })}
          </div>

          {/* View toggle */}
          <div className="flex items-center justify-between pb-2">
            <span className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
              {wikiTypeGroupLabel(activeTab)}
            </span>
            <div className="flex items-center gap-0.5 bg-muted/50 border border-border rounded-md p-0.5">
              <button
                onClick={() => setViewMode("tree")}
                className={cn("p-1 rounded transition-all", viewMode === "tree" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                title="Cây thư mục"
              >
                <FolderTree className="w-3 h-3" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn("p-1 rounded transition-all", viewMode === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                title="Danh sách"
              >
                <List className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Đang tải...</span>
          </div>
        ) : search ? (
          searchResults.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              <p className="text-[9px] font-mono text-muted-foreground pb-1">
                {searchResults.length} KẾT QUẢ
              </p>
              {searchResults.map((item) => (
                <button
                  key={item.slug}
                  onClick={() => onSelectPage(item.slug)}
                  className={cn(
                    "flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-left transition-colors",
                    selectedSlug === item.slug
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted/60 text-foreground/80"
                  )}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{item.title}</div>
                    {item.summary && (
                      <div className="text-[10px] text-muted-foreground truncate">{item.summary}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <HelpCircle className="w-5 h-5 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">Không tìm thấy trang phù hợp</p>
            </div>
          )
        ) : viewMode === "list" ? (
          flatItems.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {flatItems.map((item) => (
                <button
                  key={item.slug}
                  onClick={() => onSelectPage(item.slug)}
                  className={cn(
                    "flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-left transition-colors",
                    selectedSlug === item.slug
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted/60 text-foreground/80"
                  )}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-xs font-medium truncate">{item.title}</span>
                </button>
              ))}
            </div>
          ) : null
        ) : folderTree ? (
          renderTreeNode(folderTree)
        ) : null}
      </div>
    </div>
  );
}

// ── Reader panel ──────────────────────────────────────────────────────
interface ReaderProps {
  workspaceId: string;
  selectedSlug: string | null;
  systemView: "index" | null;
  navHistory: string[];
  onNavigate: (slug: string) => void;
  onBack: () => void;
}

function WikiReader({ workspaceId, selectedSlug, systemView, navHistory, onNavigate, onBack }: ReaderProps) {
  const [showIssues, setShowIssues] = React.useState(false);
  const [fixerOpen, setFixerOpen] = React.useState(false);
  const [fixerIssueId, setFixerIssueId] = React.useState<number | undefined>(undefined);

  const canManageWiki = useHasAnyRole([
    "SUPER_ADMIN",
    "ADMIN",
    "WORKSPACE_MANAGER",
  ]);

  const { data: indexData, isLoading: indexLoading } = useGetWikiIndexQuery(
    { workspaceId, limit: 200 },
    { skip: systemView !== "index" }
  );
  const { data: pageData, isLoading: pageLoading } = useGetWikiPageBySlugQuery(
    { slug: selectedSlug ?? "", workspaceId },
    { skip: !selectedSlug }
  );
  const { data: allPagesData } = useGetWikiPagesMetadataQuery({ workspaceId });
  const { data: issueCount } = useGetWikiIssueCountQuery(
    { slug: selectedSlug ?? "" },
    { skip: !selectedSlug || systemView === "index" || !canManageWiki }
  );
  const openIssueCount = typeof issueCount === "number" ? issueCount : 0;

  const allPages = React.useMemo(
    () => (Array.isArray(allPagesData) ? allPagesData : []).map((p) => ({ title: p.title, slug: p.slug })),
    [allPagesData]
  );

  const backlinkPages = React.useMemo(() => {
    if (!selectedSlug || !allPagesData) return [];
    const allArr = Array.isArray(allPagesData) ? allPagesData : [];
    return allArr.filter((page) => {
      if (page.slug === selectedSlug) return false;
      const links = (page as any).links;
      if (Array.isArray(links)) return links.some((l: string) => l === selectedSlug);
      return (page.content || "").includes(`/wiki/${selectedSlug}`) ||
        (page.content || "").includes(`[[${selectedSlug}]]`) ||
        (pageData?.title ? (page.content || "").includes(`[[${pageData.title}]]`) : false);
    });
  }, [selectedSlug, allPagesData, pageData]);

  // ── Index view ──
  if (systemView === "index") {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-display font-bold text-foreground">Tổng quan tri thức</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border ml-auto">
              Tổng quan hệ thống
            </span>
          </div>

          {indexLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Đang tải tổng quan...</span>
            </div>
          ) : (
            <>
              {indexData?.intro && (
                <div className="mb-6 p-4 bg-muted/30 border border-border rounded-lg">
                  <MarkdownContent content={indexData.intro} />
                </div>
              )}
              {indexData?.groups && indexData.groups.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 h-2.5 rounded-full overflow-hidden bg-muted">
                    {indexData.groups.map((g) => {
                      const total = indexData.groups!.reduce((s, x) => s + (x.total || 0), 0);
                      const pct = total > 0 ? ((g.total || 0) / total) * 100 : 0;
                      const colors: Record<string, string> = {
                        concept: "#10b981", entity: "#0ea5e9", topic: "#f59e0b", source: "#f43f5e",
                      };
                      return (
                        <div
                          key={g.type}
                          style={{ width: `${Math.max(pct, 2)}%`, background: colors[g.type] || "#6366f1" }}
                          className="h-full transition-all"
                          title={`${wikiTypeGroupLabel(g.type)}: ${g.total} trang`}
                        />
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {indexData.groups.map((g) => {
                      const colors: Record<string, string> = {
                        concept: "text-emerald-600 dark:text-emerald-400",
                        entity: "text-sky-600 dark:text-sky-400",
                        topic: "text-amber-600 dark:text-amber-400",
                        source: "text-rose-600 dark:text-rose-400",
                      };
                      return (
                        <div key={g.type} className="border border-border bg-card rounded-lg p-3 shadow-sm">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                            {wikiTypeGroupLabel(g.type)}
                          </p>
                          <p className={cn("text-2xl font-display font-bold mt-1", colors[g.type])}>
                            {g.total}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">trang</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-border pt-4">
                    <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">
                      Xem đồ thị tri thức
                    </p>
                    <Link
                      href="/wiki/graph"
                      className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md text-xs font-semibold hover:bg-primary/90 transition-colors"
                    >
                      <Network className="w-3.5 h-3.5" />
                      Mở đồ thị tri thức
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Empty state ──
  if (!selectedSlug) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
        <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center">
          <BookOpen className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Chọn một trang để đọc</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Duyệt danh sách bên trái hoặc xem "Tổng quan tri thức" để bắt đầu khám phá.
          </p>
        </div>
        <div className="flex gap-2 mt-2">
          <Link
            href="/wiki/graph"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Network className="w-3.5 h-3.5" />
            Đồ thị tri thức
          </Link>
        </div>
      </div>
    );
  }

  // ── Page view ──
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Back nav */}
        {navHistory.length > 1 && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Quay lại trang trước
          </button>
        )}

        {pageLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Đang tải nội dung...</span>
          </div>
        ) : pageData ? (
          <div className="space-y-6">
            {/* Page header */}
            <div className="border-b border-border pb-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="text-xl font-display font-bold text-foreground leading-tight flex-1">
                  {pageData.title}
                </h2>
                <div className="flex items-center gap-1.5 shrink-0">
                  {pageData.pageType && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                      style={{
                        color: wikiTypeColor(pageData.pageType),
                        borderColor: `${wikiTypeColor(pageData.pageType)}40`,
                        backgroundColor: `${wikiTypeColor(pageData.pageType)}10`,
                      }}
                    >
                      {wikiTypeGroupLabel(pageData.pageType)}
                    </span>
                  )}
                  {pageData.version && (
                    <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                      v{pageData.version}
                    </span>
                  )}
                  <Link
                    href={`/wiki/${encodeURIComponent(selectedSlug)}${workspaceId !== "default-workspace" ? `?workspaceId=${workspaceId}` : ""}`}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent border border-border transition-colors"
                    title="Mở trang toàn màn hình"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href={`/wiki/graph${workspaceId !== "default-workspace" ? `?workspaceId=${workspaceId}` : ""}`}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent border border-border transition-colors"
                    title="Xem trong đồ thị"
                  >
                    <Network className="w-3.5 h-3.5" />
                  </Link>
                  {canManageWiki && (
                    <button
                      onClick={() => setShowIssues((v) => !v)}
                      className={cn(
                        "relative p-1.5 rounded-md border transition-colors",
                        showIssues
                          ? "bg-amber-500/10 border-amber-400/30 text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent border-border"
                      )}
                      title="Vấn đề chất lượng trang"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {openIssueCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-[8px] font-bold text-white flex items-center justify-center">
                          {openIssueCount > 9 ? "9+" : openIssueCount}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
              {pageData.summary && (
                <p className="text-sm text-muted-foreground leading-relaxed italic">
                  {pageData.summary}
                </p>
              )}
            </div>

            {/* Wiki Issue Panel */}
            {canManageWiki && showIssues && selectedSlug && (
              <WikiIssuePanel
                slug={selectedSlug}
                workspaceId={workspaceId}
                onOpenFixer={(issueId, _issueslug) => {
                  setFixerIssueId(issueId);
                  setFixerOpen(true);
                }}
              />
            )}

            {/* Backlinks bar */}
            {backlinkPages.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider shrink-0">
                  Liên kết từ:
                </span>
                {backlinkPages.slice(0, 8).map((p) => (
                  <button
                    key={p.slug}
                    onClick={() => onNavigate(p.slug)}
                    className="px-2 py-0.5 rounded-full border border-border bg-muted/50 hover:bg-primary/10 hover:border-primary/30 hover:text-primary text-foreground transition-all text-[11px] font-medium"
                  >
                    {p.title}
                  </button>
                ))}
                {backlinkPages.length > 8 && (
                  <span className="text-[10px] text-muted-foreground">+{backlinkPages.length - 8} trang khác</span>
                )}
              </div>
            )}

            {/* Content */}
            <WikiContent
              markdown={pageData.content}
              onWikiLinkClick={onNavigate}
              allPages={allPages}
            />

            {/* Source doc */}
            {pageData.sourceDocumentId && (
              <div className="border-t border-dashed border-border pt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Tài liệu nguồn
                </p>
                <Link
                  href={`/knowledge/${pageData.sourceDocumentId}`}
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium border border-primary/20 bg-primary/5 px-2.5 py-1.5 rounded-md"
                >
                  <Compass className="w-3.5 h-3.5" />
                  Xem tài liệu gốc
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
            <HelpCircle className="w-6 h-6 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Không tìm thấy trang này</p>
            <Link href={`/wiki/${encodeURIComponent(selectedSlug)}`} className="text-xs text-primary hover:underline">
              Thử mở trực tiếp →
            </Link>
          </div>
        )}
      </div>
      {/* Wiki Fixer Chat Sheet */}
      {canManageWiki && selectedSlug && (
        <WikiFixerChat
          open={fixerOpen}
          onClose={() => { setFixerOpen(false); setFixerIssueId(undefined); }}
          slug={selectedSlug}
          issueId={fixerIssueId}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}

// ── Main WikiBrowser component ────────────────────────────────────────
export interface WikiBrowserProps {
  workspaceId: string;
  initialSlug?: string;
}

export function WikiBrowser({ workspaceId, initialSlug }: WikiBrowserProps) {
  const [selectedSlug, setSelectedSlug] = React.useState<string | null>(initialSlug ?? null);
  const [systemView, setSystemView] = React.useState<"index" | null>(null);
  const [navHistory, setNavHistory] = React.useState<string[]>(initialSlug ? [initialSlug] : []);

  const selectPage = (slug: string) => {
    setSelectedSlug(slug);
    setSystemView(null);
    setNavHistory((prev) => {
      const last = prev[prev.length - 1];
      if (last === slug) return prev;
      return [...prev, slug];
    });
  };

  const openIndex = () => {
    setSelectedSlug(null);
    setSystemView("index");
    setNavHistory([]);
  };

  const goBack = () => {
    setNavHistory((prev) => {
      if (prev.length <= 1) {
        setSelectedSlug(null);
        return [];
      }
      const next = prev.slice(0, -1);
      setSelectedSlug(next[next.length - 1]);
      return next;
    });
  };

  const sidebarProps: SidebarProps = {
    workspaceId,
    selectedSlug,
    systemView,
    onSelectPage: selectPage,
    onOpenIndex: openIndex,
  };

  const readerProps: ReaderProps = {
    workspaceId,
    selectedSlug,
    systemView,
    navHistory,
    onNavigate: selectPage,
    onBack: goBack,
  };

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden border border-border rounded-lg bg-background shadow-sm">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[272px] shrink-0 border-r border-border bg-card/50 h-full min-h-0">
        <WikiSidebar {...sidebarProps} />
      </aside>

      {/* Mobile sidebar trigger */}
      <div className="md:hidden absolute bottom-4 left-4 z-40">
        <Sheet>
          <SheetTrigger asChild>
            <button className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg">
              <Menu className="w-5 h-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[288px] bg-card border-r border-border">
            <div className="h-full overflow-hidden flex flex-col">
              <WikiSidebar {...sidebarProps} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Reader */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <WikiReader {...readerProps} />
      </div>
    </div>
  );
}
