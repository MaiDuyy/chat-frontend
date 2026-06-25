"use client";

import React from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { RootState } from "@/src/redux/store";
import {
  Search,
  BookOpen,
  FileText,
  Clock,
  Compass,
  HelpCircle,
  Plus,
} from "lucide-react";
import {
  useGetWikiPagesQuery,
  useGetWikiPagesMetadataQuery,
  WikiPage,
  PaginatedResponse,
} from "@/src/redux/feature/mrpApi";
import { WikiCompilationStatus } from "@/app/wiki/components/WikiCompilationStatus";
import { WikiPageTree } from "@/app/wiki/components/WikiPageTree";
import { WikiSearchDialog } from "@/app/wiki/components/WikiSearchDialog";
import { getPageType } from "@/app/wiki/components/WikilinkAutocomplete";
import { WikiPagination } from "@/app/wiki/components/WikiPagination";
import {
  WikiAIChatPanel,
  WikiAIChatButton,
} from "@/app/wiki/components/WikiAIChatPanel";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

const typeConfigs: Record<string, { label: string; className: string }> = {
  concept: {
    label: "Khái niệm",
    className:
      "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
  },
  entity: {
    label: "Thực thể",
    className:
      "bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-400",
  },
  topic: {
    label: "Chủ đề",
    className:
      "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400",
  },
  source: {
    label: "Nguồn tin",
    className:
      "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400",
  },
};

export function EmployeeWikiView() {
  const currentWorkspaceId = useSelector(
    (state: RootState) => state.workspace.currentWorkspaceId
  );
  const workspaceId = currentWorkspaceId || "default-workspace";

  const [showAIChat, setShowAIChat] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [size, setSize] = React.useState(12);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedType, setSelectedType] = React.useState<string>("all");
  const [searchOpen, setSearchOpen] = React.useState(false);

  React.useEffect(() => {
    setPage(0);
  }, [searchQuery, selectedType]);

  const { data: wikiPagesData, isLoading: isPagesLoading } =
    useGetWikiPagesQuery({ workspaceId, page, size });

  const { data: wikiMetadata } = useGetWikiPagesMetadataQuery({ workspaceId });

  const stats = React.useMemo(() => {
    if (!wikiMetadata) return { total: 0, concepts: 0, entities: 0, topics: 0, sources: 0 };
    return {
      total: wikiMetadata.length,
      concepts: wikiMetadata.filter((p) => getPageType(p) === "concept").length,
      entities: wikiMetadata.filter((p) => getPageType(p) === "entity").length,
      topics: wikiMetadata.filter((p) => getPageType(p) === "topic").length,
      sources: wikiMetadata.filter((p) => getPageType(p) === "source").length,
    };
  }, [wikiMetadata]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredPages = React.useMemo(() => {
    const pages = Array.isArray(wikiPagesData)
      ? wikiPagesData
      : wikiPagesData && Array.isArray(wikiPagesData.content)
        ? wikiPagesData.content
        : [];

    return pages.filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.tags && p.tags.toLowerCase().includes(searchQuery.toLowerCase()));
      if (selectedType === "all") return matchesSearch;
      return matchesSearch && getPageType(p) === selectedType;
    });
  }, [wikiPagesData, searchQuery, selectedType]);

  const totalPages = React.useMemo(() => {
    if (
      wikiPagesData &&
      typeof wikiPagesData === "object" &&
      "totalPages" in wikiPagesData
    ) {
      return (wikiPagesData as PaginatedResponse<WikiPage>).totalPages;
    }
    return 1;
  }, [wikiPagesData]);

  const totalElements = React.useMemo(() => {
    if (
      wikiPagesData &&
      typeof wikiPagesData === "object" &&
      "totalElements" in wikiPagesData
    ) {
      return (wikiPagesData as PaginatedResponse<WikiPage>).totalElements;
    }
    return Array.isArray(wikiPagesData) ? wikiPagesData.length : 0;
  }, [wikiPagesData]);

  return (
    <div className="font-sans flex gap-4 w-full text-foreground mx-auto p-2 md:p-4 h-full overflow-y-auto relative">
      {/* Left sidebar — WikiPageTree */}
      <div className="hidden md:block">
        <WikiPageTree />
      </div>

      {/* Mobile sidebar toggle */}
      <div className="md:hidden fixed bottom-20 left-4 z-40">
        <Sheet>
          <SheetTrigger asChild>
            <button
              className="w-10 h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full flex items-center justify-center shadow-lg cursor-pointer active:scale-95 transition-transform"
              aria-label="Wiki navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="p-0 w-72 bg-card border-r border-border"
          >
            <div className="h-full p-3 overflow-y-auto">
              <WikiPageTree />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-3 gap-3 select-none">
          <div>
            <h1 className="text-lg font-display font-semibold text-foreground leading-tight flex items-center gap-2 mt-0.5">
              <BookOpen className="w-5 h-5 text-primary shrink-0" />
              Cơ sở tri thức Wiki
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-lg">
              Khám phá cơ sở tri thức nội bộ. Đọc bài viết, tìm kiếm khái
              niệm, và đóng góp nội dung.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <WikiAIChatButton
              onClick={() => setShowAIChat((v) => !v)}
              hasMessages={false}
            />
            <button
              onClick={() => setSearchOpen(true)}
              className="px-2.5 py-1.5 text-xs font-semibold border border-border bg-card hover:bg-muted/50 text-foreground transition-all rounded-md shadow-sm active:translate-y-[0.5px] flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              Tìm nhanh (Ctrl+K)
            </button>
            <Link
              href="/wiki/graph"
              className="px-2.5 py-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all rounded-md shadow-sm active:translate-y-[0.5px] flex items-center gap-1.5 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              Đồ thị tri thức
            </Link>
            <Link
              href="/wiki/queue"
              className="px-2.5 py-1.5 text-xs font-semibold border border-border bg-card hover:bg-muted/50 text-foreground transition-all rounded-md shadow-sm active:translate-y-[0.5px] flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              Đóng góp
            </Link>
            <Link
              href="/wiki/new"
              className="px-2.5 py-1.5 text-xs font-semibold border border-border bg-card hover:bg-muted/50 text-foreground transition-all rounded-md shadow-sm active:translate-y-[0.5px] flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Bản thảo
            </Link>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {([
            { label: 'Tổng trang', val: stats.total, color: 'text-primary' },
            { label: 'Khái niệm', val: stats.concepts, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Thực thể', val: stats.entities, color: 'text-sky-600 dark:text-sky-400' },
            { label: 'Chủ đề', val: stats.topics, color: 'text-amber-600 dark:text-amber-400' },
            { label: 'Nguồn tin', val: stats.sources, color: 'text-rose-600 dark:text-rose-400' },
          ]).map((item, idx) => (
            <div key={idx} className="border border-border bg-card p-2.5 rounded-lg shadow-sm flex flex-col gap-0.5">
              <span className="text-[9px] font-semibold uppercase text-muted-foreground tracking-wide">{item.label}</span>
              <span className={`text-lg font-display font-semibold ${item.color}`}>{item.val}</span>
            </div>
          ))}
        </div>

        {/* Compilation Status */}
        <WikiCompilationStatus workspaceId={workspaceId} compact />

        {/* Search & filter bar */}
        <div className="border border-border bg-card p-3 rounded-lg shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm tiêu đề, thẻ..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-border bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-sans transition-all"
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          </div>

          <div className="flex flex-wrap items-center gap-1 bg-muted p-1 rounded-md text-[10px] font-semibold">
            {[
              { id: "all", label: "TẤT CẢ" },
              { id: "concept", label: "KHÁI NIỆM" },
              { id: "entity", label: "THỰC THỂ" },
              { id: "topic", label: "CHỦ ĐỀ" },
              { id: "source", label: "NGUỒN TIN" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id)}
                className={`px-2.5 py-1 transition-all rounded-md cursor-pointer ${
                  selectedType === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-muted-foreground/10 text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Article grid */}
        {isPagesLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin rounded-full" />
            <p className="text-sm text-muted-foreground">Đang tải bài viết...</p>
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 border border-dashed border-border rounded-lg bg-muted/5">
            <HelpCircle className="w-8 h-8 text-muted-foreground/40" />
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                Không tìm thấy bài viết nào
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Hãy nhập từ khóa khác hoặc tạo bản thảo Wiki mới.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredPages.map((article) => {
                const type = getPageType(article);
                const config = typeConfigs[type] || typeConfigs.concept;
                const summary = article.summary || article.content
                  .replace(/#+\s+/g, "")
                  .replace(/\[\[|\]\]/g, "")
                  .substring(0, 120);

                return (
                  <Link
                    key={article.id}
                    href={`/wiki/${article.slug}`}
                    className="group border border-border bg-card hover:border-primary/20 p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[130px]"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span
                          className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 border rounded-md ${config.className}`}
                        >
                          {config.label}
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground select-none">
                          V.{article.version}
                        </span>
                      </div>
                      <h2 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                        {article.title}
                      </h2>
                      <p className="text-[11px] text-muted-foreground leading-relaxed mt-1.5 line-clamp-3">
                        {summary}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-border pt-2 mt-3 text-[9px] text-muted-foreground select-none">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(article.updatedAt).toLocaleDateString("vi-VN")}
                      </span>
                      {article.tags && (
                        <span className="truncate max-w-[120px] bg-muted px-1.5 py-0.5 rounded-md border border-border text-[9.5px]">
                          {article.tags}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            <WikiPagination
              page={page}
              size={size}
              totalPages={totalPages}
              totalElements={totalElements}
              setPage={setPage}
              setSize={setSize}
            />
          </>
        )}
      </div>

      {/* Search dialog */}
      <WikiSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Floating AI Chat */}
      {showAIChat && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <WikiAIChatPanel onClose={() => setShowAIChat(false)} />
        </div>
      )}
    </div>
  );
}
