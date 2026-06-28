"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  useGetDraftsByWorkspaceQuery,
  useGetWikiPagesMetadataQuery,
  useGetWikiPageByIdQuery,
  useApproveDraftMutation,
  useRejectDraftMutation,
  useRequestChangesOnDraftMutation,
  useGetPendingDraftsQuery,
  useUpdateDraftMutation
} from "@/src/redux/feature/mrpApi";
import { useGetAdminWikiMetadataQuery } from "@/src/redux/feature/adminApi";
import { WikiDraftDiff } from "../components/WikiDraftDiff";
import { WikiAiCheckPanel } from "../components/WikiAiCheckPanel";
import { WikiIssuePanel } from "../components/WikiIssuePanel";
import { WikiFixerChat } from "../components/WikiFixerChat";
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
  Sparkles,
  Command,
  HelpCircle,
  Split,
  Maximize2,
  Pencil,
  Save,
  X,
  Wrench,
  FileText
} from "lucide-react";
import { useHasRole } from "@/src/lib/rbac/usePermission";
import { useSelector } from "react-redux";

import { WikiPagination } from "../components/WikiPagination";

export default function WikiReviewConsole({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftIdParam = searchParams.get("draftId");
  const currentWorkspaceId = useSelector((state: any) => state.workspace.currentWorkspaceId);
  const workspaceId = currentWorkspaceId || "default-workspace";

  // RBAC checks
  const isSuperAdmin = useHasRole("SUPER_ADMIN");
  const isAdmin = useHasRole("ADMIN");
  const isWorkspaceManager = useHasRole("WORKSPACE_MANAGER");
  const canManageWiki = isSuperAdmin || isAdmin || isWorkspaceManager;

  // State
  const [selectedDraftId, setSelectedDraftId] = React.useState<number | null>(
    draftIdParam ? parseInt(draftIdParam) : null
  );
  const [diffMode, setDiffMode] = React.useState<"unified" | "split">("unified");
  const [reviewerNote, setReviewerNote] = React.useState("");
  const [isNoteExpanded, setIsNoteExpanded] = React.useState(false);
  const [message, setMessage] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  // Pagination State
  const [page, setPage] = React.useState(0);
  const [size, setSize] = React.useState(5);

  // RTK Query calls
  const { data: workspaceDrafts, isLoading: isWorkspaceDraftsLoading, refetch: refetchWorkspaceDrafts } = useGetDraftsByWorkspaceQuery(workspaceId, { skip: !canManageWiki || isSuperAdmin });
  const { data: allPendingDrafts, isLoading: isAllPendingDraftsLoading, refetch: refetchAllPendingDrafts } = useGetPendingDraftsQuery(undefined, { skip: !isSuperAdmin });

  const isDraftsLoading = isSuperAdmin ? isAllPendingDraftsLoading : isWorkspaceDraftsLoading;
  const refetchDrafts = () => {
    if (isSuperAdmin) refetchAllPendingDrafts();
    else refetchWorkspaceDrafts();
  };

  const rawDrafts = React.useMemo(() => {
    const data = isSuperAdmin ? allPendingDrafts : workspaceDrafts;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.content || [];
  }, [isSuperAdmin, allPendingDrafts, workspaceDrafts]);

  // Extract drafts list - FILTER only status PENDING to prevent approved/rejected leaks
  const drafts = React.useMemo(() => {
    return rawDrafts.filter((d: any) => d.status === "PENDING");
  }, [rawDrafts]);

  const totalElements = React.useMemo(() => {
    return drafts.length;
  }, [drafts]);

  const totalPages = React.useMemo(() => {
    return Math.ceil(drafts.length / size);
  }, [drafts, size]);

  const activeDraft = React.useMemo(() => {
    if (!drafts || selectedDraftId === null) return null;
    return drafts.find((d) => d.id === selectedDraftId) || null;
  }, [drafts, selectedDraftId]);

  // Query metadata for AI checks scoped dynamic by activeDraft's workspaceId
  const activeWorkspaceId = activeDraft ? activeDraft.workspaceId : workspaceId;
  const showAdminWiki = isSuperAdmin || isAdmin;

  const { data: userWikiMetadata } = useGetWikiPagesMetadataQuery(
    { workspaceId: activeWorkspaceId },
    { skip: !canManageWiki || showAdminWiki }
  );

  const { data: adminWikiMetadata } = useGetAdminWikiMetadataQuery(
    undefined,
    { skip: !canManageWiki || !showAdminWiki }
  );

  const wikiPages = showAdminWiki ? adminWikiMetadata : userWikiMetadata;

  // Reset page if totalElements changes and page is out of bounds
  React.useEffect(() => {
    if (totalElements > 0 && page * size >= totalElements) {
      setPage(0);
    }
  }, [totalElements, page, size]);

  const paginatedDrafts = React.useMemo(() => {
    return drafts.slice(page * size, (page + 1) * size);
  }, [drafts, page, size]);

  // Edit mode state
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [editContent, setEditContent] = React.useState("");
  const [editNote, setEditNote] = React.useState("");

  // Admin tab: "review" | "fixer"
  const [adminTab, setAdminTab] = React.useState<"review" | "fixer">("review");
  const [fixerIssueId, setFixerIssueId] = React.useState<number | undefined>(undefined);

  // Mutations
  const [approveDraft, { isLoading: isApproving }] = useApproveDraftMutation();
  const [rejectDraft, { isLoading: isRejecting }] = useRejectDraftMutation();
  const [requestChanges, { isLoading: isRequesting }] = useRequestChangesOnDraftMutation();
  const [updateDraft, { isLoading: isSavingEdit }] = useUpdateDraftMutation();

  // Dynamically load the base wiki page content only when activeDraft changes and a wikiPageId exists
  const { data: activeBasePage } = useGetWikiPageByIdQuery(
    activeDraft?.wikiPageId as number,
    { skip: !activeDraft?.wikiPageId }
  );

  // Find base version wiki page content to perform Diff
  const baseWikiPage = activeBasePage || null;

  const oldText = baseWikiPage?.content || "";
  const newText = isEditMode ? editContent : (activeDraft?.content || "");

  // Sync edit content when switching draft
  React.useEffect(() => {
    if (activeDraft) {
      setEditContent(activeDraft.content || "");
      setEditNote("");
    }
    setIsEditMode(false);
    setAdminTab("review");
    setFixerIssueId(undefined);
  }, [activeDraft?.id]);

  // Review Actions
  const handleApprove = async () => {
    if (!activeDraft) return;
    setMessage(null);
    try {
      await approveDraft(activeDraft.id).unwrap();
      setMessage({ text: `Đã phê duyệt và trộn bản thảo "${activeDraft.title}" thành công.`, type: "success" });
      setReviewerNote("");
      setSelectedDraftId(null);
      refetchDrafts();
    } catch (err) {
      const error = err as { data?: { message?: string } } | undefined;
      setMessage({ text: error?.data?.message || "Lỗi khi phê duyệt bản thảo.", type: "error" });
    }
  };

  const handleReject = async () => {
    if (!activeDraft) return;
    if (!reviewerNote.trim()) {
      setIsNoteExpanded(true);
      setMessage({ text: "Vui lòng nhập lý do từ chối bản thảo vào ô Nhận xét.", type: "error" });
      return;
    }
    setMessage(null);
    try {
      await rejectDraft({ draftId: activeDraft.id, note: reviewerNote }).unwrap();
      setMessage({ text: `Đã từ chối bản thảo "${activeDraft.title}" kèm nhận xét lý do.`, type: "success" });
      setReviewerNote("");
      setSelectedDraftId(null);
      refetchDrafts();
    } catch (err) {
      const error = err as { data?: { message?: string } } | undefined;
      setMessage({ text: error?.data?.message || "Lỗi khi từ chối bản thảo.", type: "error" });
    }
  };

  const handleRequestChanges = async () => {
    if (!activeDraft) return;
    if (!reviewerNote.trim()) {
      setIsNoteExpanded(true);
      setMessage({ text: "Vui lòng nhập lý do yêu cầu chỉnh sửa vào ô Nhận xét.", type: "error" });
      return;
    }
    setMessage(null);
    try {
      await requestChanges({ draftId: activeDraft.id, note: reviewerNote }).unwrap();
      setMessage({ text: `Đã gửi yêu cầu sửa đổi cho bản thảo "${activeDraft.title}".`, type: "success" });
      setReviewerNote("");
      setSelectedDraftId(null);
      refetchDrafts();
    } catch (err) {
      const error = err as { data?: { message?: string } } | undefined;
      setMessage({ text: error?.data?.message || "Lỗi khi yêu cầu sửa đổi.", type: "error" });
    }
  };

  const handleSaveEdit = async () => {
    if (!activeDraft || !editContent.trim()) return;
    setMessage(null);
    try {
      await updateDraft({
        draftId: activeDraft.id,
        content: editContent,
        ...(editNote.trim() ? { note: editNote } : {}),
      }).unwrap();
      setMessage({ text: `Đã lưu chỉnh sửa trực tiếp cho bản thảo "${activeDraft.title}". Bạn có thể phê duyệt ngay.`, type: "success" });
      setIsEditMode(false);
      refetchDrafts();
    } catch (err) {
      const error = err as { data?: { message?: string } } | undefined;
      setMessage({ text: error?.data?.message || "Lỗi khi lưu chỉnh sửa.", type: "error" });
    }
  };

  const handleSaveAndApprove = async () => {
    if (!activeDraft || !editContent.trim()) return;
    setMessage(null);
    try {
      await updateDraft({ draftId: activeDraft.id, content: editContent, ...(editNote.trim() ? { note: editNote } : {}) }).unwrap();
      await approveDraft(activeDraft.id).unwrap();
      setMessage({ text: `Đã lưu chỉnh sửa và phê duyệt bản thảo "${activeDraft.title}".`, type: "success" });
      setIsEditMode(false);
      setSelectedDraftId(null);
      refetchDrafts();
    } catch (err) {
      const error = err as { data?: { message?: string } } | undefined;
      setMessage({ text: error?.data?.message || "Lỗi khi lưu & duyệt.", type: "error" });
    }
  };

  // Keyboard shortcuts listeners
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input/textarea
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === "input" || targetTag === "textarea" || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      if (!activeDraft) {
        if (e.key === "Escape") {
          router.push("/wiki");
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case "a": // Approve
          if (isEditMode || adminTab === "fixer") break;
          e.preventDefault();
          handleApprove();
          break;
        case "r": // Reject
          if (isEditMode || adminTab === "fixer") break;
          e.preventDefault();
          handleReject();
          break;
        case "c": // Request changes
          if (isEditMode || adminTab === "fixer") break;
          e.preventDefault();
          handleRequestChanges();
          break;
        case "e": // Toggle edit mode (Admin)
          if (isEditMode) break;
          if (isSuperAdmin || isAdmin) {
            e.preventDefault();
            setEditContent(activeDraft.content || "");
            setIsEditMode(true);
          }
          break;
        case "escape": // Cancel selection / exit edit
          e.preventDefault();
          if (isEditMode) {
            setIsEditMode(false);
            setEditContent(activeDraft.content || "");
          } else {
            setSelectedDraftId(null);
          }
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDraft, reviewerNote]);

  if (!canManageWiki) {
    return (
      <div className="font-sans max-w-xl mx-auto p-6 border border-border bg-card text-center rounded-lg shadow-md my-16 flex flex-col items-center gap-3">
        <h2 className="text-sm font-black uppercase text-rose-600">403 - KHÔNG CÓ QUYỀN TRUY CẬP</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Tài khoản của bạn không có quyền kiểm duyệt hay duyệt bản thảo. Giao diện này chỉ dành riêng cho Quản trị viên và Quản lý Workspace.
        </p>
        <Link
          href="/wiki"
          className="px-4 py-2 text-xs font-mono font-bold uppercase tracking-wide border border-transparent bg-primary hover:bg-primary/90 text-primary-foreground transition-all rounded-md shadow-sm active:translate-y-[0.5px] cursor-pointer font-semibold"
        >
          Quay lại Dashboard Wiki
        </Link>
      </div>
    );
  }

  return (
    <div className={`font-sans flex flex-col gap-3 w-full text-foreground w-full h-full mx-auto h-full overflow-y-auto text-xs md:text-sm ${isEmbedded ? "p-0" : "p-2 md:p-3"}`}>
      
      {/* Review Console Header */}
      {!isEmbedded && (
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-2 gap-2 select-none">
          <div className="flex items-center gap-2">
            <Link
              href="/wiki"
              className="p-1.5 border border-border bg-secondary hover:bg-secondary/90 text-secondary-foreground transition-all duration-200 rounded-md shadow-sm hover:shadow-md hover:-translate-y-[0.5px] active:scale-[0.98] select-none cursor-pointer"
              title="Quay lại"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
            <div>
              <span className="font-mono text-[9px] uppercase font-bold text-muted-foreground tracking-widest">
                Giao diện điều phối tri thức
              </span>
              <h1 className="text-base font-bold text-foreground leading-tight flex items-center gap-1.5 mt-0.5">
                <Command className="w-4 h-4 text-primary shrink-0 animate-pulse" />
                WIKI REVIEW CONSOLE
              </h1>
            </div>
          </div>

          {/* Global info */}
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground bg-muted p-1 border border-border rounded-md flex-wrap">
            <span>Phím tắt:</span>
            <span className="bg-background px-1.5 py-0.5 rounded border border-border text-foreground font-semibold">[A] Duyệt</span>
            <span className="bg-background px-1.5 py-0.5 rounded border border-border text-foreground font-semibold">[C] Yêu cầu</span>
            <span className="bg-background px-1.5 py-0.5 rounded border border-border text-foreground font-semibold">[R] Từ chối</span>
            {(isSuperAdmin || isAdmin) && (
              <span className="bg-amber-500/10 border-amber-500 px-1.5 py-0.5 rounded border text-amber-700 dark:text-amber-400 font-semibold">[E] Sửa trực tiếp</span>
            )}
            <span className="bg-background px-1.5 py-0.5 rounded border border-border text-foreground font-semibold">[Esc] Hủy</span>
          </div>
        </div>
      )}

      {message && (
        <div
          className={`border p-3 text-xs rounded-lg shadow-md ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        
        {/* Left Column: Draft Picker list (3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-2.5 border border-border bg-card p-3 rounded-lg shadow-md">
          <div className="border-b pb-1.5 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-extrabold text-foreground tracking-wide">
              BẢN THẢO CHỜ DUYỆT
            </span>
            <span className="text-[10px] bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md text-primary font-semibold">
              {drafts?.length || 0}
            </span>
          </div>

          {isDraftsLoading ? (
            <div className="py-8 text-center text-[10px] font-mono text-muted-foreground">Đang tải bản thảo...</div>
          ) : !drafts || drafts.length === 0 ? (
            <div className="py-6 text-center flex flex-col items-center justify-center gap-1 border border-dashed border-border rounded-lg bg-muted/5">
              <Clock className="w-4 h-4 text-muted-foreground/60" />
              <p className="text-[10px] font-bold text-foreground">Sạch bóng bản thảo</p>
              <p className="text-[8.5px] text-muted-foreground">Tất cả tài liệu đã được duyệt.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5 max-h-[480px] overflow-y-auto pr-1">
                {paginatedDrafts.map((d) => {
                  const docIdMatch = d.summary?.match(/Compiled from document ID: (\d+)/);
                  const docId = docIdMatch ? docIdMatch[1] : null;

                  return (
                    <button
                      key={d.id}
                      onClick={() => {
                        setSelectedDraftId(d.id);
                        setMessage(null);
                      }}
                      className={`w-full text-left p-2.5 border transition-all rounded-md flex flex-col gap-1.5 ${
                        selectedDraftId === d.id
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-background hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 border bg-amber-500/10 border-amber-500 text-amber-800 dark:text-amber-400 rounded-md self-start leading-none">
                          DRAFT #{d.id}
                        </span>
                        {isSuperAdmin && (
                          <span className="text-[8px] font-mono text-primary font-semibold truncate max-w-[120px] bg-primary/10 border border-primary/20 px-1 py-0.5 rounded">
                            WS: {d.workspaceId}
                          </span>
                        )}
                      </div>

                      <h3 className="text-[11px] font-extrabold text-foreground leading-snug line-clamp-2">
                        {d.title}
                      </h3>

                      <div className="flex flex-col gap-1 border-t border-dashed border-border pt-1.5 mt-0.5 select-none text-[8.5px] font-mono text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <span>Tác giả: {d.authorId}</span>
                          <span>V.{d.baseVersion || 1}</span>
                        </div>
                        {docId && (
                          <div className="text-[8px] text-amber-600 dark:text-amber-400 font-semibold">
                            Nguồn: Document #{docId}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <WikiPagination
                page={page}
                size={size}
                totalPages={totalPages}
                totalElements={totalElements}
                setPage={setPage}
                compact={true}
              />
            </>
          )}
        </div>

        {/* Middle/Right: Review Panel (9 cols) */}
        <div className="lg:col-span-9 flex flex-col gap-3">
          {activeDraft ? (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-start">
              
              {/* Diff / Edit Viewer Workspace (8 cols) */}
              <div className="xl:col-span-8 flex flex-col gap-3 border border-border bg-card p-4 rounded-lg shadow-md">
                <div className="flex items-center justify-between border-b border-border pb-1.5 select-none">
                  <div>
                    <span className="font-mono text-[8px] uppercase font-bold text-muted-foreground">
                      {isEditMode ? "CHẾ ĐỘ CHỈNH SỬA TRỰC TIẾP (ADMIN EDIT)" : "Khung so sánh phiên bản (Diff View)"}
                    </span>
                    <h2 className="text-xs font-bold text-foreground mt-0.5 line-clamp-1">
                      {activeDraft.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isEditMode && (
                      <div className="flex items-center border border-border bg-muted p-0.5 rounded-md font-mono text-[9px] font-semibold">
                        <button
                          onClick={() => setDiffMode("unified")}
                          className={`px-2 py-0.75 rounded-md transition-all flex items-center gap-1 ${
                            diffMode === "unified" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted-foreground/10 text-foreground"
                          }`}
                        >
                          <Maximize2 className="w-2.5 h-2.5" />
                          Unified
                        </button>
                        <button
                          onClick={() => setDiffMode("split")}
                          className={`px-2 py-0.75 rounded-md transition-all flex items-center gap-1 ${
                            diffMode === "split" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted-foreground/10 text-foreground"
                          }`}
                        >
                          <Split className="w-2.5 h-2.5" />
                          Split Side
                        </button>
                      </div>
                    )}

                    {(isSuperAdmin || isAdmin) && (
                      <button
                        onClick={() => {
                          if (isEditMode) {
                            setIsEditMode(false);
                            setEditContent(activeDraft.content || "");
                          } else {
                            setEditContent(activeDraft.content || "");
                            setIsEditMode(true);
                          }
                        }}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[9px] font-mono font-bold transition-all cursor-pointer ${
                          isEditMode
                            ? "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400"
                            : "bg-muted border-border text-foreground hover:bg-primary/5 hover:border-primary/30"
                        }`}
                        title={isEditMode ? "Quay về xem Diff" : "Chỉnh sửa trực tiếp nội dung bản thảo"}
                      >
                        {isEditMode ? <X className="w-2.5 h-2.5" /> : <Pencil className="w-2.5 h-2.5" />}
                        {isEditMode ? "Hủy sửa" : "Sửa trực tiếp"}
                      </button>
                    )}
                  </div>
                </div>

                {isEditMode ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full min-h-[420px] border border-border bg-background rounded-md p-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                      placeholder="Nội dung bản thảo (Markdown)..."
                      spellCheck={false}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        placeholder="Ghi chú chỉnh sửa (tuỳ chọn)..."
                        className="flex-1 border border-border bg-background rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        onClick={handleSaveEdit}
                        disabled={isSavingEdit || !editContent.trim()}
                        className="px-3 py-1.5 text-xs font-mono font-bold bg-amber-500 hover:bg-amber-500/90 text-white rounded-md transition-all disabled:opacity-50 flex items-center gap-1.5 select-none cursor-pointer whitespace-nowrap"
                      >
                        <Save className="w-3 h-3" />
                        {isSavingEdit ? "Đang lưu..." : "Lưu chỉnh sửa"}
                      </button>
                      <button
                        onClick={handleSaveAndApprove}
                        disabled={isSavingEdit || isApproving || !editContent.trim()}
                        className="px-3 py-1.5 text-xs font-mono font-bold bg-emerald-600 hover:bg-emerald-600/90 text-white rounded-md transition-all disabled:opacity-50 flex items-center gap-1.5 select-none cursor-pointer whitespace-nowrap"
                      >
                        <CheckCircle className="w-3 h-3" />
                        {isSavingEdit || isApproving ? "Đang xử lý..." : "Lưu & Duyệt"}
                      </button>
                    </div>
                    <p className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                      Chỉnh sửa trực tiếp (Admin privilege) — nội dung sẽ được ghi vào bản thảo và có thể duyệt ngay.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[520px] overflow-y-auto p-2 bg-muted/10 border border-border rounded-md">
                    <WikiDraftDiff oldText={oldText} newText={activeDraft.content || ""} mode={diffMode} />
                  </div>
                )}

                {activeDraft.note && (
                  <div className="border border-border p-2.5 bg-muted/30 rounded-md text-[10.5px] font-sans text-foreground/90">
                    <span className="font-bold text-foreground">Ghi chú của Tác giả:</span> &quot;{activeDraft.note}&quot;
                  </div>
                )}
              </div>

              {/* Action Box & AI Checks / Wiki Fixer (4 cols) */}
              <div className="xl:col-span-4 flex flex-col gap-3">

                {/* Admin Tab bar (SUPER_ADMIN / ADMIN only) */}
                {(isSuperAdmin || isAdmin) && (
                  <div className="flex items-center border border-border bg-muted rounded-lg p-0.5 gap-0.5 font-mono text-[9px] font-bold select-none">
                    <button
                      onClick={() => setAdminTab("review")}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md transition-all ${
                        adminTab === "review"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <FileText className="w-2.5 h-2.5" />
                      KIỂM DUYỆT
                    </button>
                    <button
                      onClick={() => setAdminTab("fixer")}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md transition-all ${
                        adminTab === "fixer"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Wrench className="w-2.5 h-2.5" />
                      WIKI FIXER
                    </button>
                  </div>
                )}

                {/* ── KIỂM DUYỆT tab (also default for non-admins) ── */}
                {(adminTab === "review" || (!isSuperAdmin && !isAdmin)) && (
                  <>
                    {/* AI Auditing */}
                    <WikiAiCheckPanel
                      content={newText}
                      title={activeDraft.title}
                      slug={activeDraft.slug}
                      wikiPages={wikiPages}
                    />

                    {/* Reviewer Note & Buttons */}
                    <div className="border border-border bg-card p-3 rounded-lg shadow-md flex flex-col gap-2.5">
                      <div className="border-b border-border pb-1.5">
                        <span className="font-mono text-[9px] uppercase font-extrabold text-foreground">
                          ĐIỀU PHỐI ĐỀ XUẤT (ACTIONS)
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-mono font-bold uppercase text-foreground">Nhận xét (Reviewer Note)</label>
                          <span className="text-[8px] font-mono text-rose-500">* Bắt buộc</span>
                        </div>
                        <textarea
                          value={reviewerNote}
                          onChange={(e) => setReviewerNote(e.target.value)}
                          placeholder="Nhập ghi chú phản hồi..."
                          rows={isNoteExpanded ? 3 : 1.5}
                          onFocus={() => setIsNoteExpanded(true)}
                          onBlur={() => {
                            if (!reviewerNote.trim()) setIsNoteExpanded(false);
                          }}
                          className="w-full border border-border bg-background rounded-md p-2 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all duration-150"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 pt-1 font-mono text-[10.5px] font-bold">
                        <button
                          onClick={handleApprove}
                          disabled={isApproving || isRejecting || isRequesting}
                          className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-600/95 text-white transition-all duration-200 rounded-md shadow-sm hover:shadow-md hover:-translate-y-[0.5px] active:scale-[0.98] disabled:opacity-50 disabled:translate-y-0 disabled:shadow-sm uppercase font-semibold select-none cursor-pointer"
                        >
                          Duyệt & Xuất bản (A)
                        </button>
                        <button
                          onClick={handleRequestChanges}
                          disabled={isApproving || isRejecting || isRequesting}
                          className="w-full py-1.5 bg-amber-500 hover:bg-amber-500/95 text-white transition-all duration-200 rounded-md shadow-sm hover:shadow-md hover:-translate-y-[0.5px] active:scale-[0.98] disabled:opacity-50 disabled:translate-y-0 disabled:shadow-sm uppercase font-semibold select-none cursor-pointer"
                        >
                          Yêu cầu sửa đổi (C)
                        </button>
                        <button
                          onClick={handleReject}
                          disabled={isApproving || isRejecting || isRequesting}
                          className="w-full py-1.5 bg-rose-600 hover:bg-rose-600/95 text-white transition-all duration-200 rounded-md shadow-sm hover:shadow-md hover:-translate-y-[0.5px] active:scale-[0.98] disabled:opacity-50 disabled:translate-y-0 disabled:shadow-sm uppercase font-semibold select-none cursor-pointer"
                        >
                          Từ chối bản thảo (R)
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* ── WIKI FIXER tab (admin only) ── */}
                {adminTab === "fixer" && (isSuperAdmin || isAdmin) && (
                  <div className="flex flex-col gap-3">
                    {/* Issue tracker panel for the wiki page being reviewed */}
                    <WikiIssuePanel
                      slug={activeDraft.slug || ""}
                      workspaceId={workspaceId}
                      onOpenFixer={(issueId: number) => setFixerIssueId(issueId)}
                    />

                    {/* Inline fixer chat */}
                    <div
                      className="border border-blue-200/60 dark:border-blue-800/30 bg-card rounded-lg shadow-md overflow-hidden flex flex-col"
                      style={{ minHeight: "360px" }}
                    >
                      <WikiFixerChat
                        inline
                        slug={
                          activeDraft.slug ||
                          (activeDraft.title ?? "unknown").toLowerCase().replace(/\s+/g, "-")
                        }
                        issueId={fixerIssueId}
                        workspaceId={workspaceId}
                      />
                    </div>
                  </div>
                )}

              </div>

            </div>
          ) : (
            <div className="border border-dashed border-border p-8 rounded-lg text-center flex flex-col items-center justify-center min-h-[300px] bg-muted/5">
              <Sparkles className="w-8 h-8 text-primary/70 mb-2 shrink-0 animate-bounce" />
              <h2 className="text-xs font-semibold uppercase text-foreground">Không có bản thảo nào đang được chọn</h2>
              <p className="text-[10px] text-muted-foreground mt-1 max-w-sm leading-normal">
                Vui lòng nhấp vào một bản thảo nháp trong danh sách bên trái để mở Khung so sánh phiên bản (Diff View) và tiến hành điều phối tri thức.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
