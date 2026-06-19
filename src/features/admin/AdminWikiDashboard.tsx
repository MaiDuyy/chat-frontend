"use client";

import React from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { RootState } from "@/src/redux/store";
import {
  Search,
  Plus,
  BookOpen,
  Activity,
  Clock,
  CheckCircle,
  HelpCircle,
  Compass,
  Layers,
  Menu,
  Globe,
} from "lucide-react";
import {
  useGetWikiPagesQuery,
  useGetWikiPagesMetadataQuery,
  useGetDraftsByWorkspaceQuery,
  useGetPendingDraftsQuery,
  useCompileDocumentMutation,
  useGetCompilationPlansQuery,
  WikiPage,
  PaginatedResponse,
  WikiPageDraft,
} from "@/src/redux/feature/mrpApi";
import { WikiPageTree } from "@/app/wiki/components/WikiPageTree";
import { WikiDocumentTree } from "@/app/wiki/components/WikiDocumentTree";
import { WikiSearchDialog } from "@/app/wiki/components/WikiSearchDialog";
import { getPageType } from "@/app/wiki/components/WikilinkAutocomplete";
import { useHasRole } from "@/src/lib/rbac/usePermission";
import { WikiPagination } from "@/app/wiki/components/WikiPagination";
import { DocumentManagement } from "@/src/features/admin/DocumentManagement";
import {
  WikiAIChatPanel,
  WikiAIChatButton,
} from "@/app/wiki/components/WikiAIChatPanel";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  useGetAdminWikiPagesQuery,
  useGetAdminWikiMetadataQuery,
} from "@/src/redux/feature/adminApi";
import { useGetUserWorkspacesQuery } from "@/src/redux/feature/workspaceApi";

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

export function AdminWikiDashboard() {
  const currentWorkspaceId = useSelector(
    (state: RootState) => state.workspace.currentWorkspaceId
  );

  const isSuperAdmin = useHasRole("SUPER_ADMIN");
  const isAdmin = useHasRole("ADMIN");
  const isSystemAdmin = isSuperAdmin || isAdmin;

  const [viewAllWiki, setViewAllWiki] = React.useState(isSystemAdmin);
  const workspaceId = viewAllWiki && isSystemAdmin ? "all" : (currentWorkspaceId || "default-workspace");

  const [showAIChat, setShowAIChat] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"knowledge" | "documents">(
    "knowledge"
  );
  const [page, setPage] = React.useState(0);
  const [size, setSize] = React.useState(10);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedType, setSelectedType] = React.useState<string>("all");
  const [docIdInput, setDocIdInput] = React.useState("");
  const [compileSuccess, setCompileSuccess] = React.useState(false);
  const [compileError, setCompileError] = React.useState("");
  const [searchOpen, setSearchOpen] = React.useState(false);

  React.useEffect(() => {
    setPage(0);
  }, [searchQuery, selectedType]);

  const showAdminWiki = isSystemAdmin && viewAllWiki;

  const { data: workspaces = [] } = useGetUserWorkspacesQuery();

  const { data: userWikiMetadata } = useGetWikiPagesMetadataQuery(
    { workspaceId },
    { skip: showAdminWiki }
  );
  const { data: adminWikiMetadata } = useGetAdminWikiMetadataQuery(
    undefined,
    { skip: !showAdminWiki }
  );
  const wikiPagesMetadata = showAdminWiki ? adminWikiMetadata : userWikiMetadata;

  const { data: userWikiPagesData, isLoading: isUserPagesLoading } = useGetWikiPagesQuery(
    { workspaceId, page, size },
    { skip: showAdminWiki }
  );
  const { data: adminWikiPagesData, isLoading: isAdminPagesLoading } = useGetAdminWikiPagesQuery(
    { page, size },
    { skip: !showAdminWiki }
  );
  const wikiPagesData = showAdminWiki ? adminWikiPagesData : userWikiPagesData;
  const isPagesLoading = showAdminWiki ? isAdminPagesLoading : isUserPagesLoading;

  const getWorkspaceLabel = React.useCallback((wsId?: string) => {
    if (!wsId || wsId === 'default-workspace' || wsId === 'GLOBAL' || wsId === 'ALL') {
      return 'Hệ thống';
    }
    const ws = workspaces.find((w: any) => w.id === wsId);
    return ws ? ws.name : wsId;
  }, [workspaces]);

  const { data: workspaceDrafts, refetch: refetchWorkspaceDrafts } =
    useGetDraftsByWorkspaceQuery(workspaceId, { skip: isSuperAdmin });
  const { data: allPendingDrafts, refetch: refetchPendingDrafts } =
    useGetPendingDraftsQuery(undefined, { skip: !isSuperAdmin });
  const { data: plans } = useGetCompilationPlansQuery({ workspaceId });
  const [compileDocument, { isLoading: isCompiling }] =
    useCompileDocumentMutation();

  const refetchDrafts = React.useCallback(() => {
    if (isSuperAdmin) {
      refetchPendingDrafts();
    } else {
      refetchWorkspaceDrafts();
    }
  }, [isSuperAdmin, refetchPendingDrafts, refetchWorkspaceDrafts]);

  const wikiPages = React.useMemo(
    () => wikiPagesMetadata || [],
    [wikiPagesMetadata]
  );

  const rawDrafts = React.useMemo(() => {
    const data = isSuperAdmin ? allPendingDrafts : workspaceDrafts;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.content || [];
  }, [isSuperAdmin, allPendingDrafts, workspaceDrafts]);

  const pendingCount = React.useMemo(() => {
    return rawDrafts.filter((d: WikiPageDraft) => d.status === "PENDING")
      .length;
  }, [rawDrafts]);

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

  const stats = React.useMemo(() => {
    if (!wikiPages)
      return { total: 0, concepts: 0, entities: 0, topics: 0, sources: 0 };
    return {
      total: wikiPages.length,
      concepts: wikiPages.filter((p) => getPageType(p) === "concept").length,
      entities: wikiPages.filter((p) => getPageType(p) === "entity").length,
      topics: wikiPages.filter((p) => getPageType(p) === "topic").length,
      sources: wikiPages.filter((p) => getPageType(p) === "source").length,
    };
  }, [wikiPages]);

  const filteredPages = React.useMemo(() => {
    const pages = Array.isArray(wikiPagesData)
      ? wikiPagesData
      : wikiPagesData && Array.isArray(wikiPagesData.content)
        ? wikiPagesData.content
        : [];

    return pages.filter((p: WikiPage) => {
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

  const pendingPlansCount = React.useMemo(() => {
    return Array.isArray(plans)
      ? plans.filter((p) => p.status === "PENDING_REVIEW").length
      : 0;
  }, [plans]);

  const handleCompile = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(docIdInput);
    if (isNaN(id)) {
      setCompileError("Please enter a valid document ID");
      return;
    }
    setCompileError("");
    setCompileSuccess(false);
    try {
      await compileDocument({
        documentId: id,
        workspaceId,
        autoApprove: false,
      }).unwrap();
      setCompileSuccess(true);
      setDocIdInput("");
      refetchDrafts();
      setTimeout(() => setCompileSuccess(false), 4000);
    } catch (err) {
      const error = err as { data?: { message?: string } };
      setCompileError(
        error?.data?.message || "Failed to trigger MRP compilation."
      );
    }
  };

  return (
    <div className="font-sans flex gap-4 w-full text-foreground mx-auto p-2 md:p-4 h-full overflow-y-auto relative">
      {/* Left sidebar */}
      <div className="hidden md:block">
        {activeTab === "documents" ? <WikiDocumentTree /> : <WikiPageTree workspaceId={workspaceId} />}
      </div>

      {/* Mobile sidebar */}
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
            <div className="h-full p-3 overflow-y-auto select-none">
              {activeTab === "documents" ? (
                <WikiDocumentTree />
              ) : (
                <WikiPageTree workspaceId={workspaceId} />
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main body */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Header bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-3 gap-3 select-none">
          <div>
            <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground tracking-widest">
              Bảng điều khiển quản trị
            </span>
            <h1 className="text-lg font-display font-semibold text-foreground leading-tight flex items-center gap-2 mt-0.5">
              <BookOpen className="w-5 h-5 text-primary shrink-0" />
              Quản lý Wiki
            </h1>
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
              href={`/wiki/graph${viewAllWiki && isSystemAdmin ? "?workspaceId=all" : ""}`}
              className="px-2.5 py-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all rounded-md shadow-sm active:translate-y-[0.5px] flex items-center gap-1.5 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              Đồ thị
            </Link>
            <Link
              href="/wiki/plans"
              className={`px-2.5 py-1.5 text-xs font-semibold border transition-all rounded-md shadow-sm active:translate-y-[0.5px] flex items-center gap-1.5 cursor-pointer ${
                pendingPlansCount > 0
                  ? "border-primary bg-primary hover:bg-primary/90 text-primary-foreground"
                  : "border-border bg-card hover:bg-muted/50 text-foreground"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Kế hoạch{pendingPlansCount > 0 ? ` (${pendingPlansCount})` : ""}
            </Link>
            {pendingCount > 0 && (
              <Link
                href="/wiki/review"
                className="px-2.5 py-1.5 text-xs font-semibold border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 transition-all rounded-md shadow-sm active:translate-y-[0.5px] flex items-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                Duyệt bản thảo ({pendingCount})
              </Link>
            )}
            <Link
              href="/wiki/new"
              className="px-2.5 py-1.5 text-xs font-semibold border border-border bg-card hover:bg-muted/50 text-foreground transition-all rounded-md shadow-sm active:translate-y-[0.5px] flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Tạo trang mới
            </Link>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-border select-none gap-1">
          <button
            onClick={() => setActiveTab("knowledge")}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "knowledge"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Cơ sở tri thức
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "documents"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Tài nguyên & Tài liệu gốc
          </button>
        </div>

        {/* Tab content */}
        {activeTab === "documents" ? (
          <div className="mt-1">
            <DocumentManagement />
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                {
                  label: "Tổng số trang",
                  val: stats.total,
                  color: "text-primary",
                },
                {
                  label: "Khái niệm",
                  val: stats.concepts,
                  color: "text-emerald-600 dark:text-emerald-400",
                },
                {
                  label: "Thực thể",
                  val: stats.entities,
                  color: "text-sky-600 dark:text-sky-400",
                },
                {
                  label: "Chủ đề",
                  val: stats.topics,
                  color: "text-amber-600 dark:text-amber-400",
                },
                {
                  label: "Bản thảo chờ duyệt",
                  val: pendingCount,
                  color: "text-rose-600 dark:text-rose-400",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="border border-border bg-card p-3 rounded-lg shadow-sm flex flex-col gap-1 hover:shadow-md transition-shadow duration-200"
                >
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wide">
                    {item.label}
                  </span>
                  <span className={`text-xl font-display font-semibold ${item.color}`}>
                    {item.val}
                  </span>
                </div>
              ))}
            </div>

            {/* Main grid: articles + MRP tool */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Articles list */}
              <div className="lg:col-span-8 flex flex-col gap-3">
                {/* Filter bar */}
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
                  <div className="flex flex-wrap items-center gap-2">
                    {isSystemAdmin && (
                      <button
                        onClick={() => setViewAllWiki((v) => !v)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-[10px] font-bold transition-all cursor-pointer select-none active:scale-[0.97] whitespace-nowrap h-7 ${
                          viewAllWiki
                            ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                            : "border-border bg-background text-muted-foreground hover:bg-accent font-bold"
                        }`}
                        title={viewAllWiki ? "Đang hiển thị wiki từ tất cả Workspace" : "Chỉ hiển thị wiki của Workspace hiện tại"}
                      >
                        <Globe className="w-3 h-3 text-emerald-500 shrink-0" />
                        {viewAllWiki ? "Tất cả Workspace" : "Không gian hiện tại"}
                      </button>
                    )}
                    <div className="flex flex-wrap items-center gap-1 bg-muted p-1 rounded-md text-[10px] font-semibold h-7">
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
                          className={`px-2 py-0.5 transition-all rounded-md cursor-pointer leading-tight ${
                            selectedType === tab.id
                              ? "bg-primary text-primary-foreground shadow-sm font-bold"
                              : "hover:bg-muted-foreground/10 text-foreground"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Article grid */}
                {isPagesLoading ? (
                  <div className="border border-dashed border-border p-4 rounded-lg text-center flex flex-col items-center justify-center min-h-[200px]">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent animate-spin rounded-full mb-1.5" />
                    <p className="text-xs text-muted-foreground">
                      Đang tải cơ sở tri thức...
                    </p>
                  </div>
                ) : filteredPages.length === 0 ? (
                  <div className="border border-dashed border-border p-4 rounded-lg text-center flex flex-col items-center justify-center min-h-[200px] bg-muted/5">
                    <HelpCircle className="w-6 h-6 text-muted-foreground/60 mb-1.5" />
                    <p className="text-sm font-semibold text-foreground">
                      Không tìm thấy bài viết nào
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Hãy nhập từ khóa khác hoặc tạo trang Wiki mới.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredPages.map((article: WikiPage) => {
                        const type = getPageType(article);
                        const config =
                          typeConfigs[type] || typeConfigs.concept;

                        return (
                          <Link
                            key={article.id}
                            href={`/wiki/${article.slug}`}
                            className="group border border-border bg-card hover:border-primary/20 p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[110px]"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span
                                    className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 border rounded-md shrink-0 ${config.className}`}
                                  >
                                    {config.label}
                                  </span>
                                  {viewAllWiki && (
                                    <span className="text-[9px] font-semibold bg-muted border border-border text-muted-foreground px-1.5 py-0.5 rounded-md truncate max-w-[100px]" title={getWorkspaceLabel(article.workspaceId)}>
                                      {getWorkspaceLabel(article.workspaceId)}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[9px] font-mono text-muted-foreground select-none shrink-0">
                                  V.{article.version}
                                </span>
                              </div>
                              <h2 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-1">
                                {article.title}
                              </h2>
                              <p className="text-[10px] text-muted-foreground leading-normal mt-1 line-clamp-2">
                                {article.content
                                  .replace(/#+\s+/g, "")
                                  .replace(/\[\[|\]\]/g, "")}
                              </p>
                            </div>
                            <div className="flex items-center justify-between border-t border-border pt-1.5 mt-2 text-[9px] text-muted-foreground select-none">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(
                                  article.updatedAt
                                ).toLocaleDateString("vi-VN")}
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

              {/* Right panel: MRP + quick guide */}
              <div className="lg:col-span-4 flex flex-col gap-3">
                {/* MRP Compilation tool */}
                <div className="border border-border bg-card p-4 rounded-lg shadow-sm flex flex-col gap-3">
                  <div className="border-b border-border pb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      Trình biên soạn MRP Pipeline
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Nhập ID tài liệu thô để kích hoạt quy trình Map-Reduce và tự động đề xuất bản thảo.
                  </p>

                  <form
                    onSubmit={handleCompile}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold uppercase text-foreground tracking-wide">
                        ID Tài liệu thô
                      </label>
                      <input
                        type="text"
                        value={docIdInput}
                        onChange={(e) => setDocIdInput(e.target.value)}
                        placeholder="Ví dụ: 1, 2, 45..."
                        required
                        className="px-3 py-2 text-sm border border-border bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono transition-all"
                      />
                    </div>

                    {compileError && (
                      <div className="text-xs p-2 border border-rose-500/20 bg-rose-500/5 text-rose-600 rounded-md">
                        {compileError}
                      </div>
                    )}
                    {compileSuccess && (
                      <div className="text-xs p-2 border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 rounded-md flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Kích hoạt quy trình biên soạn MRP thành công!
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isCompiling || !docIdInput}
                      className="w-full px-3 py-2 text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all rounded-md shadow-sm active:translate-y-[0.5px] disabled:opacity-50 cursor-pointer"
                    >
                      {isCompiling ? "Đang xử lý..." : "Khởi chạy biên soạn"}
                    </button>
                  </form>
                </div>

                {/* Wiki syntax guide */}
                <div className="border border-border bg-card p-4 rounded-lg shadow-sm flex flex-col gap-2">
                  <div className="border-b border-border pb-2 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      Hướng dẫn cú pháp Wiki
                    </span>
                  </div>
                  <ul className="space-y-2 text-xs text-foreground/80 leading-normal">
                    <li className="flex gap-2 items-start">
                      <span className="text-primary font-semibold shrink-0">
                        1.
                      </span>
                      <span>
                        Sử dụng <code className="bg-muted px-1 rounded text-[11px]">[[Tên-Trang]]</code> để liên kết giữa các trang.
                      </span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="text-primary font-semibold shrink-0">
                        2.
                      </span>
                      <span>
                        Sử dụng <code className="bg-muted px-1 rounded text-[11px]">#</code>,{" "}
                        <code className="bg-muted px-1 rounded text-[11px]">##</code> cho các tiêu đề.
                      </span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="text-primary font-semibold shrink-0">
                        3.
                      </span>
                      <span>
                        Mọi bản sửa đổi được gửi dưới dạng bản thảo và chờ quản trị viên duyệt.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
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
