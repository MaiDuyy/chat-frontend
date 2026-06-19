"use client";

import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/src/redux/store";
import {
  useGetWikiPagesMetadataQuery,
  useGetWikiGraphQuery,
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
  SlidersHorizontal,
  Maximize2,
  RotateCcw,
} from "lucide-react";

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
  const [showFilters, setShowFilters] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

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
    const nodes = graphData.nodes.filter((n) =>
      activeTypes.has(n.page_type as PageType)
    );
    const slugSet = new Set(nodes.map((n) => n.slug));
    const edges = graphData.edges.filter(
      (e) => slugSet.has(e.from) && slugSet.has(e.to)
    );
    return { nodes, edges };
  }, [graphData, activeTypes]);

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
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
              showFilters
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bộ lọc</span>
            {activeTypes.size < PAGE_TYPES.length && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>

          {activeTypes.size < PAGE_TYPES.length && (
            <button
              onClick={resetFilters}
              title="Đặt lại bộ lọc"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border border-border cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
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

      {/* ── Filter Panel ─────────────────────────────────────── */}
      {showFilters && (
        <div className="shrink-0 px-4 py-3 border-b border-border bg-muted/20 flex flex-wrap items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Loại trang
          </span>
          <div className="flex flex-wrap gap-2">
            {PAGE_TYPES.map((type) => {
              const active = activeTypes.has(type);
              const color = wikiTypeColor(type);
              const count = typeStats[type] ?? 0;
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs border transition-all cursor-pointer"
                  style={{
                    background: active ? `${color}15` : "transparent",
                    color: active ? color : "var(--muted-foreground)",
                    borderColor: active ? `${color}40` : "var(--border)",
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: active ? color : "currentColor" }}
                  />
                  {wikiTypeGroupLabel(type)}
                  <span className="opacity-60 tabular-nums">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="ml-auto text-[10px] text-muted-foreground">
            Hiển thị {filteredData?.nodes.length ?? 0} /{" "}
            {graphData.nodes.length} trang
          </div>
        </div>
      )}

      {/* Search results dropdown */}
      {searchQuery && searchMatches.length > 0 && (
        <div className="absolute top-[52px] left-1/2 -translate-x-1/2 z-30 bg-card border border-border rounded-lg shadow-xl py-1 max-h-56 overflow-y-auto w-72 mt-2">
          {searchMatches.slice(0, 8).map((n) => (
            <button
              key={n.slug}
              onClick={() => {
                setHighlightSlug(n.slug);
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
            centerSlug={highlightSlug ?? undefined}
            height={undefined}
            onNodeClick={(slug) => {
              router.push(`/wiki/${slug}`);
            }}
          />
        )}

        {/* Legend overlay */}
        {filteredData && filteredData.nodes.length > 0 && (
          <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Chú thích
            </p>
            <div className="flex flex-col gap-1.5">
              {PAGE_TYPES.filter((t) => activeTypes.has(t)).map((type) => (
                <div key={type} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: wikiTypeColor(type) }}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {wikiTypeGroupLabel(type)}
                  </span>
                  <span className="text-[9px] text-muted-foreground/60 tabular-nums ml-auto">
                    {typeStats[type] ?? 0}
                  </span>
                </div>
              ))}
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
    </div>
  );
}
