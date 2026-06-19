"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  useGetWikiPageBySlugQuery,
  useGetDraftsByWorkspaceQuery,
  useGetWikiPagesMetadataQuery,
  useApproveDraftMutation,
  useRejectDraftMutation,
  useRequestChangesOnDraftMutation
} from "@/src/redux/feature/mrpApi";
import { useGetAdminWikiPageBySlugQuery, useGetAdminWikiMetadataQuery } from "@/src/redux/feature/adminApi";
import { WikiContent } from "../components/WikiContent";
import { WikiDraftBanner } from "../components/WikiDraftBanner";
import { WikiBacklinks } from "../components/WikiBacklinks";
import { WikiPageTree } from "../components/WikiPageTree";
import { WikiGraphMini } from "../components/WikiGraph/WikiGraphMini";
import { WikiSearchDialog } from "../components/WikiSearchDialog";
import { getPageType } from "../components/WikilinkAutocomplete";
import { useHasRole } from "@/src/lib/rbac/usePermission";
import { useSelector } from "react-redux";
import { WikiAIChatPanel, WikiAIChatButton } from "../components/WikiAIChatPanel";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Calendar,
  Layers,
  ArrowLeft,
  Settings,
  Shield,
  Clock,
  Compass,
  FileEdit,
  Tag,
  Search,
  Menu,
  Globe
} from "lucide-react";
import { WikiSecurityBadge } from "../components/WikiSecurityBadge";

export default function WikiPageDetail() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const currentWorkspaceId = useSelector((state: any) => state.workspace.currentWorkspaceId);

  // RBAC checks
  const isSuperAdmin = useHasRole("SUPER_ADMIN");
  const isAdmin = useHasRole("ADMIN");
  const isWorkspaceManager = useHasRole("WORKSPACE_MANAGER");
  const canManageWiki = isSuperAdmin || isAdmin || isWorkspaceManager;
  const isSystemAdmin = isSuperAdmin || isAdmin;

  // Admin users always use the global slug query so workspace scoping never blocks them.
  // urlWorkspaceId (if present) is used as a preference hint to resolve slug conflicts.
  const urlWorkspaceId = searchParams.get("workspaceId");
  const isAdminGlobalView = isSystemAdmin; // Admins can always view any page globally

  // For scoped query: use URL param > Redux workspace > fallback
  const workspaceId = (urlWorkspaceId && urlWorkspaceId !== 'all' && urlWorkspaceId !== 'GLOBAL')
    ? urlWorkspaceId
    : (currentWorkspaceId || "default-workspace");

  // Preferred workspace for conflict resolution (undefined means "pick most recent globally")
  const preferredWorkspaceId = (urlWorkspaceId && urlWorkspaceId !== 'all' && urlWorkspaceId !== 'GLOBAL')
    ? urlWorkspaceId
    : (currentWorkspaceId ?? undefined);

  // Admin global slug query — always active for ADMIN/SUPER_ADMIN
  const { data: adminPage, isLoading: isAdminPageLoading, error: adminPageError } =
    useGetAdminWikiPageBySlugQuery(
      { slug, workspaceId: preferredWorkspaceId },
      { skip: !isAdminGlobalView }
    );

  // Standard scoped slug query — only for non-admin users
  const { data: scopedPage, isLoading: isScopedPageLoading, error: scopedPageError } =
    useGetWikiPageBySlugQuery(
      { slug, workspaceId },
      { skip: isAdminGlobalView }
    );

  const page = isAdminGlobalView ? adminPage : scopedPage;
  const isPageLoading = isAdminGlobalView ? isAdminPageLoading : isScopedPageLoading;
  const pageError = isAdminGlobalView ? adminPageError : scopedPageError;


  // Metadata for backlinks & mini-graph:
  // Admins use global metadata so backlinks from ALL workspaces are resolved correctly.
  const metadataWorkspaceId = page?.workspaceId || workspaceId;
  const { data: adminAllPages } = useGetAdminWikiMetadataQuery(undefined, { skip: !isAdminGlobalView });
  const { data: scopedAllPages } = useGetWikiPagesMetadataQuery(
    { workspaceId: metadataWorkspaceId },
    { skip: isAdminGlobalView }
  );
  const allPages = isAdminGlobalView ? adminAllPages : scopedAllPages;

  // Drafts: scope to page's actual workspace
  const { data: drafts, refetch: refetchDrafts } = useGetDraftsByWorkspaceQuery(
    metadataWorkspaceId,
    { skip: !canManageWiki }
  );

  // Review mutations
  const [approveDraft, { isLoading: isApproving }] = useApproveDraftMutation();
  const [rejectDraft, { isLoading: isRejecting }] = useRejectDraftMutation();
  const [requestChanges, { isLoading: isRequesting }] = useRequestChangesOnDraftMutation();

  const activeDraft = React.useMemo(() => {
    if (!drafts) return null;
    return drafts.find((d) => d.slug === slug && d.status === "PENDING");
  }, [drafts, slug]);

  const handleApprove = async () => {
    if (!activeDraft || !canManageWiki) return;
    try {
      await approveDraft(activeDraft.id).unwrap();
      refetchDrafts();
      router.refresh();
    } catch (err) {
      console.error("Lỗi phê duyệt bản thảo:", err);
    }
  };

  const handleReject = async (note: string) => {
    if (!activeDraft || !canManageWiki) return;
    try {
      await rejectDraft({ draftId: activeDraft.id, note }).unwrap();
      refetchDrafts();
    } catch (err) {
      console.error("Lỗi từ chối bản thảo:", err);
    }
  };

  const handleRequestChanges = async (note: string) => {
    if (!activeDraft || !canManageWiki) return;
    try {
      await requestChanges({ draftId: activeDraft.id, note }).unwrap();
      refetchDrafts();
    } catch (err) {
      console.error("Lỗi yêu cầu sửa đổi:", err);
    }
  };

  const [searchOpen, setSearchOpen] = React.useState(false);
  const [showAIChat, setShowAIChat] = React.useState(false);
  const [rightPanelMode, setRightPanelMode] = React.useState<"meta" | "ai">("meta");

  // Key bindings for Ctrl+K
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

  // Compute backlinks graph nodes & edges
  const localGraphData = React.useMemo(() => {
    if (!allPages || !page) return { nodes: [], edges: [] };

    const currentSlug = page.slug;
    const WIKILINK_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

    const directLinks = new Set<string>();
    const edges: { from: string; to: string }[] = [];
    const seenEdges = new Set<string>();

    const titleToSlug = new Map<string, string>();
    const slugToSlug = new Map<string, string>();
    for (const p of allPages) {
      titleToSlug.set(p.title.toLowerCase(), p.slug);
      slugToSlug.set(p.slug.toLowerCase(), p.slug);
    }

    const getResolvedSlug = (target: string) => {
      const norm = target.trim().toLowerCase();
      if (slugToSlug.has(norm)) return slugToSlug.get(norm);
      if (titleToSlug.has(norm)) return titleToSlug.get(norm);
      if (slugToSlug.has(`source/${norm}`)) return slugToSlug.get(`source/${norm}`);

      const slugified = norm.replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
      if (slugToSlug.has(slugified)) return slugToSlug.get(slugified);
      if (slugToSlug.has(`source/${slugified}`)) return slugToSlug.get(`source/${slugified}`);
      return null;
    };

    for (const p of allPages) {
      const pageLinks = p.links || [];
      for (const targetRaw of pageLinks) {
        const resolvedSlug = getResolvedSlug(targetRaw);
        if (resolvedSlug && resolvedSlug !== p.slug) {
          if (p.slug === currentSlug || resolvedSlug === currentSlug) {
            const key = [p.slug, resolvedSlug].sort().join("->");
            if (!seenEdges.has(key)) {
              seenEdges.add(key);
              edges.push({ from: p.slug, to: resolvedSlug });
            }
            directLinks.add(p.slug);
            directLinks.add(resolvedSlug);
          }
        }
      }
    }

    directLinks.add(currentSlug);

    const nodes = allPages
      .filter((p) => directLinks.has(p.slug))
      .map((p) => ({
        slug: p.slug,
        title: p.title,
        page_type: getPageType(p),
      }));

    return { nodes, edges };
  }, [allPages, page]);

  if (isPageLoading) {
    return (
      <div className="font-sans min-h-[400px] flex flex-col items-center justify-center text-center p-6">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin rounded-full mb-3" />
        <p className="text-xs font-mono uppercase text-muted-foreground">Đang tải tài liệu Wiki...</p>
      </div>
    );
  }

  if (pageError || !page) {
    return (
      <div className="font-sans max-w-2xl mx-auto p-4 border border-rose-500/30 bg-rose-500/5 text-center rounded-lg shadow-md my-6">
        <h2 className="text-sm font-semibold uppercase text-rose-600 mb-1.5">Trang không tồn tại hoặc đã bị xóa</h2>
        <p className="text-[11px] text-muted-foreground leading-relaxed mb-4">
          Tài liệu với đường dẫn <code className="bg-muted px-1 py-0.5 rounded font-mono border">/wiki/{slug}</code> không được tìm thấy trong cơ sở tri thức hiện tại.
        </p>
        <Link
          href="/wiki"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors rounded-md shadow-sm active:scale-[0.98]"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Quay lại Dashboard
        </Link>
      </div>
    );
  }

  // Tags processing
  const tagsList = page.tags ? page.tags.split(/,\s*/) : [];

  return (
    <div className="font-sans flex gap-3 w-full text-foreground mx-auto p-2 md:p-3 h-full overflow-y-auto text-xs md:text-sm relative">
      {/* Collapsible Left Sidebar */}
      <div className="hidden md:block">
        <WikiPageTree activeSlug={slug} />
      </div>

      {/* Mobile Floating Wiki Tree Toggle */}
      <div className="md:hidden fixed bottom-20 left-4 z-40">
        <Sheet>
          <SheetTrigger asChild>
            <button 
              className="w-10 h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full flex items-center justify-center shadow-lg border border-primary/20 cursor-pointer active:scale-95 transition-transform"
              aria-label="Mục lục Wiki"
            >
              <Menu className="w-5 h-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-card border-r border-border">
            <div className="h-full p-3 overflow-y-auto select-none">
              <WikiPageTree activeSlug={slug} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        
        {/* Detail Page Navigation Header */}
        <div className="flex items-center justify-between border-b border-border pb-2 select-none">
          <div className="flex items-center gap-1.5">
            <Link
              href="/wiki"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border border-border bg-secondary hover:bg-secondary/90 text-secondary-foreground transition-all duration-200 rounded-md shadow-sm hover:shadow-md hover:-translate-y-[0.5px] active:scale-[0.98] select-none cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              Quay lại bảng
            </Link>

            <button
              onClick={() => setSearchOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border border-border bg-secondary hover:bg-secondary/90 text-secondary-foreground transition-all duration-200 rounded-md shadow-sm hover:shadow-md hover:-translate-y-[0.5px] active:scale-[0.98] select-none cursor-pointer"
            >
              <Search className="w-3 h-3" />
              Tìm nhanh (Ctrl+K)
            </button>

            {/* Suggest Edit Button */}
            <Link
              href={`/wiki/new?suggestEdit=true&slug=${slug}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border border-transparent bg-primary hover:bg-primary/95 text-primary-foreground transition-all duration-200 rounded-md shadow-sm hover:shadow-md hover:-translate-y-[0.5px] active:scale-[0.98] select-none cursor-pointer"
            >
              <FileEdit className="w-3 h-3" />
              Đề xuất chỉnh sửa
            </Link>

            {/* AI chat button — context-aware for current page */}
            <WikiAIChatButton
              onClick={() => setRightPanelMode((m) => m === "ai" ? "meta" : "ai")}
              hasMessages={rightPanelMode === "ai"}
            />
          </div>

          <div className="flex items-center gap-1.5">
            {isAdminGlobalView && (
              <span className="flex items-center gap-1 text-[9px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md">
                <Globe className="w-3 h-3" /> ADMIN · GLOBAL
              </span>
            )}
            <span className="text-[9px] font-mono font-bold bg-muted px-1.5 py-0.5 rounded-md border border-border text-muted-foreground">
              Workspace: {page.workspaceId}
            </span>
            <span className="text-[9px] font-mono font-bold bg-muted px-1.5 py-0.5 rounded-md border border-border text-muted-foreground">
              Phiên bản: V.{page.version}
            </span>
          </div>
        </div>

        {/* Main Grid: Content (8 cols) & Sidebar (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
          
          {/* Left main content pane */}
          <div className="lg:col-span-8 flex flex-col gap-3">
            
            {/* Active Draft Alert Banner */}
            {activeDraft && canManageWiki && (
              <WikiDraftBanner
                draft={activeDraft}
                onApprove={handleApprove}
                onReject={handleReject}
                onRequestChanges={handleRequestChanges}
                isActionsLoading={isApproving || isRejecting || isRequesting}
              />
            )}

            {/* Wiki Content Render Box - Constrained to 65ch max-width for premium readability */}
            <div className="border border-border bg-card p-3 md:p-4.5 rounded-lg shadow-md max-w-[72ch] lg:max-w-[65ch] mx-auto w-full">
              {/* Title block */}
              <div className="flex flex-col gap-1.5 border-b pb-2 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg md:text-xl font-bold text-foreground leading-snug">
                    {page.title}
                  </h1>
                  {page.securityClassification && (
                    <WikiSecurityBadge
                      classification={page.securityClassification}
                      departmentId={page.departmentId}
                      allowedRoles={page.allowedRoles}
                    />
                  )}
                </div>
                
                {/* Tags & quick info */}
                {tagsList.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 mt-0.5">
                    <Tag className="w-3 h-3 text-muted-foreground mr-1" />
                    {tagsList.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 bg-muted text-muted-foreground border border-border rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Markdown Content Render */}
              <WikiContent markdown={page.content} allPages={allPages} />
            </div>

          </div>

          {/* Right sidebar pane - swaps between metadata and inline AI Chat */}
          <div className="lg:col-span-4 flex flex-col gap-3 h-full">
            {rightPanelMode === "ai" ? (
              <div className="h-[600px] border border-border rounded-lg overflow-hidden bg-card animate-fade-in-up">
                <WikiAIChatPanel
                  currentPageSlug={slug}
                  currentPageTitle={page?.title}
                  onClose={() => setRightPanelMode("meta")}
                  inline={true}
                />
              </div>
            ) : (
              <>
                {/* Metadata information card */}
                <div className="border border-border bg-card p-3 rounded-lg shadow-md flex flex-col gap-2.5">
                  <div className="border-b pb-1 flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="font-mono text-[9px] uppercase font-extrabold text-foreground">
                      THÔNG TIN CHI TIẾT
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 font-sans text-[11px]">
                    <div className="flex items-center justify-between border-b border-dashed border-border pb-1.5">
                      <span className="text-muted-foreground flex items-center gap-1"><Layers className="w-3 h-3" /> ID trang</span>
                      <span className="font-mono font-bold">{page.id}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-dashed border-border pb-1.5">
                      <span className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Ngày tạo</span>
                      <span className="font-mono font-bold">{new Date(page.createdAt).toLocaleDateString("vi-VN")}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-dashed border-border pb-1.5">
                      <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Cập nhật</span>
                      <span className="font-mono font-bold">{new Date(page.updatedAt).toLocaleDateString("vi-VN")}</span>
                    </div>
                    {page.sourceDocumentId && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1"><Shield className="w-3 h-3" /> ID Nguồn thô</span>
                        <span className="font-mono font-bold text-primary">{page.sourceDocumentId}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dynamic internal backlinks cross-linking */}
                <WikiBacklinks
                  currentPageTitle={page.title}
                  currentPageSlug={page.slug}
                  allWikiPages={allPages}
                />

                {/* Mini sub-graph visual */}
                {localGraphData.nodes.length > 1 && (
                  <div className="border border-border bg-card p-3 rounded-lg shadow-md flex flex-col gap-2.5">
                    <div className="border-b pb-1.5 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="font-mono text-[9px] uppercase font-extrabold text-foreground">
                        BẢN ĐỒ LIÊN KẾT
                      </span>
                    </div>
                    <div className="w-full h-[180px] overflow-hidden rounded-md border border-border bg-muted/30">
                      <WikiGraphMini slug={slug} nodes={localGraphData.nodes} edges={localGraphData.edges} />
                    </div>
                  </div>
                )}

                {/* Quick Wiki Navigation Sidebar Actions */}
                <div className="border border-border bg-card p-3 rounded-lg shadow-md flex flex-col gap-2">
                  <div className="border-b pb-1.5 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="font-mono text-[9px] uppercase font-extrabold text-foreground">
                      ĐIỀU HƯỚNG WIKI
                    </span>
                  </div>

                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Bạn có thể xem các trang khác trong hệ thống để tìm kiếm thông tin liên quan hoặc trích xuất tri thức.
                  </p>

                  <Link
                    href="/wiki"
                    className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-primary hover:bg-primary/95 text-primary-foreground transition-all duration-200 rounded-md shadow-sm hover:shadow-md hover:-translate-y-[0.5px] active:scale-[0.98] select-none cursor-pointer"
                  >
                    Mở Wiki Explorer Dashboard
                  </Link>
                </div>
              </>
            )}
          </div>

        </div>

      </div>

      {/* Global Wiki Search palette */}
      <WikiSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Floating context-aware AI Chat Panel */}
      {showAIChat && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <WikiAIChatPanel
            currentPageSlug={slug}
            currentPageTitle={page?.title}
            onClose={() => setShowAIChat(false)}
          />
        </div>
      )}
    </div>
  );
}
