"use client";

import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/src/redux/store";
import {
  useGetWikiPagesMetadataQuery,
  useGetWikiGraphQuery,
  useGetWikiGraphCommunitiesQuery,
  useGetWikiPageBySlugQuery,
} from "@/src/redux/feature/mrpApi";
import {
  useGetAdminWikiMetadataQuery,
  useGetAdminWikiGraphQuery,
} from "@/src/redux/feature/adminApi";
import { useHasRole } from "@/src/lib/rbac/usePermission";
import { WikiGraph } from "../components/WikiGraph";
import {
  wikiTypeColor,
  wikiTypeGroupLabel,
} from "../components/WikiTypeBadge";
import {
  ArrowLeft,
  X,
  Search,
  Network,
  Maximize2,
  RotateCcw,
  ChevronLeft,
  Eye,
  GitBranch,
  BookOpenCheck,
  ArrowRightLeft,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { WikiContent } from "../components/WikiContent";

const PAGE_TYPES = ["entity", "concept", "topic", "source"] as const;
type PageType = (typeof PAGE_TYPES)[number];

type GraphNode = { slug: string; title: string; page_type: string };
type GraphEdge = { from: string; to: string };
type GraphData = { nodes: GraphNode[]; edges: GraphEdge[] };

export default function WikiGraphPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentWorkspaceId = useSelector((state: RootState) => state.workspace.currentWorkspaceId);
  const workspaceId = searchParams.get("workspaceId") || currentWorkspaceId || "default-workspace";

  const isSuperAdmin = useHasRole("SUPER_ADMIN");
  const isAdmin = useHasRole("ADMIN");
  const isSystemAdmin = isSuperAdmin || isAdmin;

  const showAdminWiki = isSystemAdmin && workspaceId === "all";

  const { data: userWikiMetadata, isLoading: isMetadataLoadingUser } = useGetWikiPagesMetadataQuery(
    { workspaceId },
    { skip: showAdminWiki }
  );
  const { data: adminWikiMetadata, isLoading: isMetadataLoadingAdmin } = useGetAdminWikiMetadataQuery(
    undefined,
    { skip: !showAdminWiki }
  );

  const { data: userGraphData, isLoading: isGraphLoadingUser } = useGetWikiGraphQuery(
    { workspaceId },
    { skip: showAdminWiki }
  );
  const { data: adminGraphData, isLoading: isGraphLoadingAdmin } = useGetAdminWikiGraphQuery(
    undefined,
    { skip: !showAdminWiki }
  );

  const graphDataFromBackend = showAdminWiki ? adminGraphData : userGraphData;
  const isLoading = showAdminWiki
    ? (isMetadataLoadingAdmin || isGraphLoadingAdmin)
    : (isMetadataLoadingUser || isGraphLoadingUser);

  const [activeTypes, setActiveTypes] = React.useState<Set<PageType>>(
    new Set(PAGE_TYPES)
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [highlightSlug, setHighlightSlug] = React.useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // Upgrade state for Ego Mode & In-place Drawer
  const [selectedSlug, setSelectedSlug] = React.useState<string | null>(null);
  const [drawerHistory, setDrawerHistory] = React.useState<string[]>([]);
  const [egoCenterSlug, setEgoCenterSlug] = React.useState<string | null>(null);
  const [bloomDepth, setBloomDepth] = React.useState<number>(1);

  // Fetch communities for community detection coloring
  const { data: communitiesData } = useGetWikiGraphCommunitiesQuery({ workspaceId });
  const communityMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    if (!communitiesData?.communities) return map;
    communitiesData.communities.forEach((c) => {
      c.pageSlugs.forEach((slug) => {
        map[slug] = c.id;
      });
    });
    return map;
  }, [communitiesData]);

  // Query details for active drawer slug
  const { data: pageData, isLoading: isPageLoading } = useGetWikiPageBySlugQuery(
    { slug: selectedSlug ?? "", workspaceId },
    { skip: !selectedSlug }
  );

  const handleDrawerLinkClick = (nextSlug: string) => {
    setDrawerHistory((prev) => [...prev, nextSlug]);
    setSelectedSlug(nextSlug);
    setHighlightSlug(nextSlug);
  };

  const handleDrawerBack = () => {
    setDrawerHistory((prev) => {
      if (prev.length <= 1) {
        setSelectedSlug(null);
        return [];
      }
      const nextHistory = prev.slice(0, -1);
      const prevSlug = nextHistory[nextHistory.length - 1];
      setSelectedSlug(prevSlug);
      setHighlightSlug(prevSlug);
      return nextHistory;
    });
  };

  const graphData: GraphData = React.useMemo(() => {
    if (!graphDataFromBackend) return { nodes: [], edges: [] };
    return {
      nodes: graphDataFromBackend.nodes.map((n) => ({
        slug: n.slug,
        title: n.title,
        page_type: n.pageType || "concept",
      })),
      edges: graphDataFromBackend.edges,
    };
  }, [graphDataFromBackend]);

  const filteredData = React.useMemo(() => {
    if (!graphData.nodes.length) return null;
    
    // 1. Initial page type filtering
    let nodes = graphData.nodes.filter((n) =>
      activeTypes.has(n.page_type as PageType)
    );
    let slugSet = new Set(nodes.map((n) => n.slug));
    let edges = graphData.edges.filter(
      (e) => slugSet.has(e.from) && slugSet.has(e.to)
    );

    // 2. Client-side Ego Mode BFS filtering (1-hop or 2-hop)
    if (egoCenterSlug && slugSet.has(egoCenterSlug)) {
      const visited = new Set<string>([egoCenterSlug]);
      let currentQueue = [egoCenterSlug];

      for (let d = 0; d < bloomDepth; d++) {
        const nextQueue: string[] = [];
        for (const currentSlug of currentQueue) {
          for (const edge of edges) {
            if (edge.from === currentSlug && !visited.has(edge.to)) {
              visited.add(edge.to);
              nextQueue.push(edge.to);
            } else if (edge.to === currentSlug && !visited.has(edge.from)) {
              visited.add(edge.from);
              nextQueue.push(edge.from);
            }
          }
        }
        currentQueue = nextQueue;
      }

      nodes = nodes.filter((n) => visited.has(n.slug));
      const finalSlugSet = new Set(nodes.map((n) => n.slug));
      edges = edges.filter(
        (e) => finalSlugSet.has(e.from) && finalSlugSet.has(e.to)
      );
    }

    return { nodes, edges };
  }, [graphData, activeTypes, egoCenterSlug, bloomDepth]);

  // Compute backlinks client-side from overall graph
  const backlinkNodes = React.useMemo(() => {
    if (!selectedSlug) return [];
    const fromSlugs = graphData.edges
      .filter((e) => e.to === selectedSlug)
      .map((e) => e.from);
    return graphData.nodes.filter((n) => fromSlugs.includes(n.slug));
  }, [selectedSlug, graphData]);

  const searchMatches = React.useMemo(() => {
    if (!searchQuery || !graphData.nodes.length) return [];
    const q = searchQuery.toLowerCase();
    return graphData.nodes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.slug.includes(q)
    );
  }, [searchQuery, graphData]);

  const toggleType = (type: PageType) =>
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });

  const resetFilters = () => setActiveTypes(new Set(PAGE_TYPES));

  const typeStats = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of graphData.nodes) {
      counts[n.page_type] = (counts[n.page_type] || 0) + 1;
    }
    return counts;
  }, [graphData]);

  return (
    <div
      className={`flex flex-col bg-background w-full h-full overflow-hidden ${
        isFullscreen ? "fixed inset-0 z-50" : ""
      }`}
    >
      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/90 backdrop-blur-sm shrink-0 gap-3">
        {/* Left: back + title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/wiki"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-semibold text-foreground">
              Đồ thị tri thức
            </span>
          </div>
          {!isLoading && filteredData && (
            <div className="hidden sm:flex items-center gap-1.5 ml-1">
              <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono font-medium text-muted-foreground tabular-nums">
                {filteredData.nodes.length} trang
              </span>
              <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono font-medium text-muted-foreground tabular-nums">
                {filteredData.edges.length} liên kết
              </span>
            </div>
          )}
        </div>

        {/* Center: search */}
        <div className="flex-1 max-w-xs relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm kiếm trang..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              const match = graphData.nodes.find((n) =>
                n.title.toLowerCase().includes(e.target.value.toLowerCase())
              );
              setHighlightSlug(match?.slug ?? null);
            }}
            className="w-full h-8 bg-background border border-border rounded-md pl-8 pr-8 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setHighlightSlug(null);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {activeTypes.size < PAGE_TYPES.length && (
            <button
              onClick={resetFilters}
              title="Hiển thị tất cả loại trang"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đặt lại bộ lọc</span>
            </button>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border border-border cursor-pointer"
            title={isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>


      {/* Search results dropdown */}
      {searchQuery && searchMatches.length > 0 && (
        <div className="absolute top-[52px] left-1/2 -translate-x-1/2 z-30 bg-card border border-border rounded-lg shadow-xl py-1 max-h-56 overflow-y-auto w-72 mt-2">
          {searchMatches.slice(0, 8).map((n) => (
            <button
              key={n.slug}
              onClick={() => {
                setHighlightSlug(n.slug);
                setSelectedSlug(n.slug);
                setDrawerHistory([n.slug]);
                setSearchQuery("");
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs hover:bg-accent transition-colors cursor-pointer"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: wikiTypeColor(n.page_type) }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{n.title}</p>
                <p className="text-[10px] text-muted-foreground font-mono truncate">
                  /{n.slug}
                </p>
              </div>
              <span
                className="text-[9px] uppercase font-bold shrink-0"
                style={{ color: wikiTypeColor(n.page_type) }}
              >
                {wikiTypeGroupLabel(n.page_type)}
              </span>
            </button>
          ))}
          {searchMatches.length > 8 && (
            <p className="text-[10px] text-center text-muted-foreground py-2">
              +{searchMatches.length - 8} kết quả khác
            </p>
          )}
        </div>
      )}

      {/* ── Main Area ────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 relative">
        {isLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-background">
            <div className="relative">
              <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <Network className="absolute inset-0 m-auto w-5 h-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              Đang xây dựng đồ thị tri thức...
            </p>
          </div>
        ) : !filteredData || filteredData.nodes.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-background">
            <div className="w-16 h-16 rounded-xl bg-muted/50 flex items-center justify-center">
              <Network className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground mb-1">
                Chưa có dữ liệu
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Upload và biên soạn tài liệu để bắt đầu xây dựng đồ thị tri
                thức liên kết.
              </p>
            </div>
            {activeTypes.size < PAGE_TYPES.length && (
              <button
                onClick={resetFilters}
                className="text-xs font-medium text-primary hover:underline cursor-pointer"
              >
                Hiển thị tất cả loại trang
              </button>
            )}
          </div>
        ) : (
          <WikiGraph
            nodes={filteredData.nodes}
            edges={filteredData.edges}
            centerSlug={highlightSlug ?? egoCenterSlug ?? undefined}
            height={undefined}
            onNodeClick={(slug) => {
              setSelectedSlug(slug);
              setDrawerHistory([slug]);
              setHighlightSlug(slug);
            }}
            onNodeDoubleClick={(slug) => {
              setEgoCenterSlug(slug);
              setBloomDepth(1);
            }}
            communityMap={communityMap}
            allTypeCounts={typeStats}
            activeTypes={activeTypes}
            onTypeToggle={(type) => toggleType(type as PageType)}
          />
        )}

        {/* Ego mode banner overlay */}
        {egoCenterSlug && (
          <div className="absolute top-4 left-4 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl z-20 flex flex-col gap-2 max-w-xs animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-xs font-bold text-foreground">
                  Chế độ tập trung (Ego Mode)
                </span>
              </div>
              <button
                onClick={() => setEgoCenterSlug(null)}
                className="text-muted-foreground hover:text-foreground hover:bg-accent p-1 rounded-md transition-colors cursor-pointer"
                title="Thoát chế độ tập trung"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Đang hiển thị các trang liên kết với <span className="font-semibold text-foreground">"{graphData.nodes.find(n => n.slug === egoCenterSlug)?.title || egoCenterSlug}"</span> trong phạm vi {bloomDepth} liên kết.
            </p>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => setBloomDepth((prev) => (prev === 1 ? 2 : 1))}
                className="flex-1 py-1 px-2.5 rounded border border-border text-[10px] font-semibold bg-background hover:bg-accent text-foreground transition-all cursor-pointer text-center"
              >
                {bloomDepth === 1 ? "Mở rộng 2 liên kết" : "Thu hẹp 1 liên kết"}
              </button>
              <button
                onClick={() => setEgoCenterSlug(null)}
                className="flex-1 py-1 px-2.5 rounded border border-transparent text-[10px] font-semibold bg-primary text-primary-foreground hover:bg-primary/95 transition-all cursor-pointer text-center"
              >
                Trở lại tổng quan
              </button>
            </div>
          </div>
        )}


        {/* Hint */}
        {filteredData && filteredData.nodes.length > 0 && (
          <div className="absolute bottom-4 right-4 bg-card/90 backdrop-blur-sm border border-border rounded-md px-3 py-2 shadow text-[10px] text-muted-foreground">
            Click vào node để mở trang wiki
          </div>
        )}
      </div>

      {/* ── Page Details Sheet (Drawer) ────────────────────── */}
      <Sheet open={!!selectedSlug} onOpenChange={(open) => {
        if (!open) {
          setSelectedSlug(null);
          setDrawerHistory([]);
        }
      }}>
        <SheetContent className="w-full sm:w-[540px] md:w-[640px] max-w-[90vw] p-0 flex flex-col h-full bg-background border-l border-border shadow-2xl overflow-hidden z-50">
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {drawerHistory.length > 1 && (
                <button
                  onClick={handleDrawerBack}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                  title="Quay lại trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <SheetTitle className="text-sm font-bold text-foreground truncate max-w-[280px]">
                {pageData?.title || selectedSlug}
              </SheetTitle>
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0">
              {pageData?.pageType && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                  style={{
                    color: wikiTypeColor(pageData.pageType),
                    borderColor: `${wikiTypeColor(pageData.pageType)}30`,
                    backgroundColor: `${wikiTypeColor(pageData.pageType)}10`,
                  }}
                >
                  {wikiTypeGroupLabel(pageData.pageType)}
                </span>
              )}
              {pageData?.version && (
                <span className="text-[10px] font-mono font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                  v{pageData.version}
                </span>
              )}
              <Link
                href={`/wiki/${encodeURIComponent(selectedSlug ?? "")}${workspaceId && workspaceId !== 'default-workspace' ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ''}`}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent border border-border transition-colors cursor-pointer"
                title="Mở trang toàn màn hình"
              >
                <Eye className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => {
                  setSelectedSlug(null);
                  setDrawerHistory([]);
                }}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border border-border cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {isPageLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent animate-spin rounded-full" />
                <p className="text-xs font-medium text-muted-foreground">Đang tải nội dung wiki...</p>
              </div>
            ) : pageData ? (
              <>
                {/* Summary */}
                {pageData.summary && (
                  <div className="p-3 bg-muted/40 rounded-lg border border-border/80 text-xs text-muted-foreground leading-relaxed italic">
                    {pageData.summary}
                  </div>
                )}

                {/* Markdown content */}
                <div className="border-t border-border/60 pt-4">
                  <WikiContent
                    markdown={pageData.content}
                    onWikiLinkClick={handleDrawerLinkClick}
                    allPages={graphData.nodes}
                  />
                </div>

                {/* Source Document Reference */}
                {pageData.sourceDocumentId && (
                  <div className="border-t border-border/60 pt-4 border-dashed">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Tài liệu nguồn</p>
                    <Link
                      href={`/knowledge/${pageData.sourceDocumentId}`}
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium border border-primary/20 bg-primary/5 px-2.5 py-1.5 rounded-md transition-all cursor-pointer"
                    >
                      <BookOpenCheck className="w-3.5 h-3.5" />
                      <span>Xem tài liệu gốc (ID #{pageData.sourceDocumentId})</span>
                    </Link>
                  </div>
                )}

                {/* Backlinks */}
                <div className="border-t border-border/60 pt-4 border-dashed">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-primary" />
                    Liên kết trỏ đến đây (Backlinks) ({backlinkNodes.length})
                  </p>
                  {backlinkNodes.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {backlinkNodes.map((bn) => (
                        <button
                          key={bn.slug}
                          onClick={() => handleDrawerLinkClick(bn.slug)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground hover:text-primary bg-muted hover:bg-primary/5 border border-border hover:border-primary/20 px-2 py-1 rounded transition-all cursor-pointer"
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: wikiTypeColor(bn.page_type) }}
                          />
                          {bn.title}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">Không có trang nào liên kết đến trang này.</p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground text-xs">
                Không tìm thấy dữ liệu cho trang này.
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
