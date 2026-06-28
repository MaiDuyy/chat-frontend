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
  useUpdateDraftMutation,
  useGetDraftsByStatusQuery,
  useSubmitRevisionDraftMutation,
  useWithdrawDraftMutation,
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
  Clock,
  Sparkles,
  Command,
  Split,
  Maximize2,
  Pencil,
  Save,
  X,
  Wrench,
  FileText,
  RotateCcw,
  AlertCircle,
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

  const isSuperAdmin = useHasRole("SUPER_ADMIN");
  const isAdmin = useHasRole("ADMIN");
  const isWorkspaceManager = useHasRole("WORKSPACE_MANAGER");
  const canManageWiki = isSuperAdmin || isAdmin || isWorkspaceManager;

  const [selectedDraftId, setSelectedDraftId] = React.useState<number | null>(
    draftIdParam ? parseInt(draftIdParam) : null
  );
  const [diffMode, setDiffMode] = React.useState<"unified" | "split">("unified");
  const [reviewerNote, setReviewerNote] = React.useState("");
  const [isNoteExpanded, setIsNoteExpanded] = React.useState(false);
  const [message, setMessage] = React.useState<{ text: string; type: "success" | "error" } | null>(null);
  const [revisionContent, setRevisionContent] = React.useState("");
  const [revisionNote, setRevisionNote] = React.useState("");
  const [isRevisionEditing, setIsRevisionEditing] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [size] = React.useState(5);

  // PENDING drafts
  const { data: workspaceDrafts, isLoading: isWorkspaceDraftsLoading, refetch: refetchWorkspaceDrafts } =
    useGetDraftsByWorkspaceQuery(workspaceId, { skip: !canManageWiki || isSuperAdmin });
  const { data: allPendingDrafts, isLoading: isAllPendingDraftsLoading, refetch: refetchAllPendingDrafts } =
    useGetPendingDraftsQuery(undefined, { skip: !isSuperAdmin });

  // NEEDS_REVISION drafts
  const { data: needsRevisionData, isLoading: isRevisionLoading, refetch: refetchRevision } =
    useGetDraftsByStatusQuery({ status: "NEEDS_REVISION", limit: 200 }, { skip: !canManageWiki, pollingInterval: 15000 });

  const isDraftsLoading = isSuperAdmin ? isAllPendingDraftsLoading : isWorkspaceDraftsLoading;
  const refetchDrafts = React.useCallback(() => {
    if (isSuperAdmin) refetchAllPendingDrafts(); else refetchWorkspaceDrafts();
    refetchRevision();
  }, [isSuperAdmin, refetchAllPendingDrafts, refetchWorkspaceDrafts, refetchRevision]);

  const rawDrafts = React.useMemo(() => {
    const data = isSuperAdmin ? allPendingDrafts : workspaceDrafts;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return (data as any).content || [];
  }, [isSuperAdmin, allPendingDrafts, workspaceDrafts]);

  const pendingDrafts = React.useMemo(() => rawDrafts.filter((d: any) => d.status === "PENDING"), [rawDrafts]);
  const revisionDrafts = React.useMemo(() => {
    if (!needsRevisionData) return [];
    return Array.isArray(needsRevisionData) ? needsRevisionData : [];
  }, [needsRevisionData]);
  const allDrafts = React.useMemo(() => [...pendingDrafts, ...revisionDrafts], [pendingDrafts, revisionDrafts]);

  const totalPages = Math.ceil(pendingDrafts.length / size);
  const paginatedPendingDrafts = React.useMemo(
    () => pendingDrafts.slice(page * size, (page + 1) * size),
    [pendingDrafts, page, size]
  );

  React.useEffect(() => {
    if (pendingDrafts.length > 0 && page * size >= pendingDrafts.length) setPage(0);
  }, [pendingDrafts.length, page, size]);

  const activeDraft = React.useMemo(
    () => (selectedDraftId === null ? null : allDrafts.find((d) => d.id === selectedDraftId) || null),
    [allDrafts, selectedDraftId]
  );
  const isRevisionDraft = activeDraft?.status === "NEEDS_REVISION";

  const activeWorkspaceId = activeDraft ? activeDraft.workspaceId : workspaceId;
  const showAdminWiki = isSuperAdmin || isAdmin;
  const { data: userWikiMetadata } = useGetWikiPagesMetadataQuery({ workspaceId: activeWorkspaceId }, { skip: !canManageWiki || showAdminWiki });
  const { data: adminWikiMetadata } = useGetAdminWikiMetadataQuery(undefined, { skip: !canManageWiki || !showAdminWiki });
  const wikiPages = showAdminWiki ? adminWikiMetadata : userWikiMetadata;

  const [isEditMode, setIsEditMode] = React.useState(false);
  const [editContent, setEditContent] = React.useState("");
  const [editNote, setEditNote] = React.useState("");
  const [adminTab, setAdminTab] = React.useState<"review" | "fixer">("review");
  const [fixerIssueId, setFixerIssueId] = React.useState<number | undefined>(undefined);

  const [approveDraft, { isLoading: isApproving }] = useApproveDraftMutation();
  const [rejectDraft, { isLoading: isRejecting }] = useRejectDraftMutation();
  const [requestChanges, { isLoading: isRequesting }] = useRequestChangesOnDraftMutation();
  const [updateDraft, { isLoading: isSavingEdit }] = useUpdateDraftMutation();
  const [submitRevision, { isLoading: isSubmittingRevision }] = useSubmitRevisionDraftMutation();
  const [withdrawDraft, { isLoading: isWithdrawing }] = useWithdrawDraftMutation();

  const { data: activeBasePage } = useGetWikiPageByIdQuery(
    activeDraft?.wikiPageId as number, { skip: !activeDraft?.wikiPageId }
  );
  const oldText = activeBasePage?.content || "";
  const newText = isEditMode ? editContent : (isRevisionEditing ? revisionContent : (activeDraft?.content || ""));

  React.useEffect(() => {
    if (activeDraft) {
      setEditContent(activeDraft.content || "");
      setRevisionContent(activeDraft.content || "");
      setEditNote(""); setRevisionNote(""); setIsRevisionEditing(false);
    }
    setIsEditMode(false); setAdminTab("review"); setFixerIssueId(undefined);
  }, [activeDraft?.id]);

  // ── PENDING actions ──
  const handleApprove = async () => {
    if (!activeDraft) return; setMessage(null);
    try {
      await approveDraft(activeDraft.id).unwrap();
      setMessage({ text: `Đã phê duyệt "${activeDraft.title}" thành công.`, type: "success" });
      setReviewerNote(""); setSelectedDraftId(null); refetchDrafts();
    } catch (err) { setMessage({ text: (err as any)?.data?.message || "Lỗi khi phê duyệt.", type: "error" }); }
  };

  const handleReject = async () => {
    if (!activeDraft) return;
    if (!reviewerNote.trim()) { setIsNoteExpanded(true); setMessage({ text: "Vui lòng nhập lý do từ chối.", type: "error" }); return; }
    setMessage(null);
    try {
      await rejectDraft({ draftId: activeDraft.id, note: reviewerNote }).unwrap();
      setMessage({ text: `Đã từ chối "${activeDraft.title}".`, type: "success" });
      setReviewerNote(""); setSelectedDraftId(null); refetchDrafts();
    } catch (err) { setMessage({ text: (err as any)?.data?.message || "Lỗi khi từ chối.", type: "error" }); }
  };

  const handleRequestChanges = async () => {
    if (!activeDraft) return;
    if (!reviewerNote.trim()) { setIsNoteExpanded(true); setMessage({ text: "Vui lòng nhập lý do yêu cầu sửa đổi.", type: "error" }); return; }
    setMessage(null);
    try {
      await requestChanges({ draftId: activeDraft.id, note: reviewerNote }).unwrap();
      setMessage({ text: `Đã gửi yêu cầu sửa đổi cho "${activeDraft.title}".`, type: "success" });
      setReviewerNote(""); setSelectedDraftId(null); refetchDrafts();
    } catch (err) { setMessage({ text: (err as any)?.data?.message || "Lỗi khi yêu cầu sửa đổi.", type: "error" }); }
  };

  const handleSaveEdit = async () => {
    if (!activeDraft || !editContent.trim()) return; setMessage(null);
    try {
      await updateDraft({ draftId: activeDraft.id, content: editContent, ...(editNote.trim() ? { note: editNote } : {}) }).unwrap();
      setMessage({ text: `Đã lưu chỉnh sửa trực tiếp cho "${activeDraft.title}".`, type: "success" });
      setIsEditMode(false); refetchDrafts();
    } catch (err) { setMessage({ text: (err as any)?.data?.message || "Lỗi khi lưu.", type: "error" }); }
  };

  const handleSaveAndApprove = async () => {
    if (!activeDraft || !editContent.trim()) return; setMessage(null);
    try {
      await updateDraft({ draftId: activeDraft.id, content: editContent, ...(editNote.trim() ? { note: editNote } : {}) }).unwrap();
      await approveDraft(activeDraft.id).unwrap();
      setMessage({ text: `Đã lưu & phê duyệt "${activeDraft.title}".`, type: "success" });
      setIsEditMode(false); setSelectedDraftId(null); refetchDrafts();
    } catch (err) { setMessage({ text: (err as any)?.data?.message || "Lỗi khi lưu & duyệt.", type: "error" }); }
  };

  // ── NEEDS_REVISION actions ──
  const handleSubmitRevision = async () => {
    if (!activeDraft) return; setMessage(null);
    try {
      await submitRevision({
        draftId: activeDraft.id,
        content: isRevisionEditing && revisionContent !== activeDraft.content ? revisionContent : undefined,
        note: revisionNote.trim() || undefined,
      }).unwrap();
      setMessage({ text: `Đã gửi lại "${activeDraft.title}" để kiểm duyệt.`, type: "success" });
      setSelectedDraftId(null); setIsRevisionEditing(false); refetchDrafts();
    } catch (err) { setMessage({ text: (err as any)?.data?.message || "Lỗi khi gửi lại.", type: "error" }); }
  };

  const handleWithdraw = async () => {
    if (!activeDraft) return; setMessage(null);
    try {
      await withdrawDraft(activeDraft.id).unwrap();
      setMessage({ text: `Đã rút lại "${activeDraft.title}".`, type: "success" });
      setSelectedDraftId(null); refetchDrafts();
    } catch (err) { setMessage({ text: (err as any)?.data?.message || "Lỗi khi rút lại.", type: "error" }); }
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable) return;
      if (!activeDraft) { if (e.key === "Escape") router.push("/wiki"); return; }
      if (isRevisionDraft) { if (e.key === "Escape") { e.preventDefault(); setSelectedDraftId(null); } return; }
      switch (e.key.toLowerCase()) {
        case "a": if (!isEditMode && adminTab !== "fixer") { e.preventDefault(); handleApprove(); } break;
        case "r": if (!isEditMode && adminTab !== "fixer") { e.preventDefault(); handleReject(); } break;
        case "c": if (!isEditMode && adminTab !== "fixer") { e.preventDefault(); handleRequestChanges(); } break;
        case "e": if (!isEditMode && (isSuperAdmin || isAdmin)) { e.preventDefault(); setEditContent(activeDraft.content || ""); setIsEditMode(true); } break;
        case "escape":
          e.preventDefault();
          if (isEditMode) { setIsEditMode(false); setEditContent(activeDraft.content || ""); } else setSelectedDraftId(null);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeDraft, reviewerNote, isRevisionDraft, isEditMode, adminTab]);

  if (!canManageWiki) {
    return (
      <div className="font-sans max-w-xl mx-auto p-6 border border-border bg-card text-center rounded-lg shadow-md my-16 flex flex-col items-center gap-3">
        <h2 className="text-sm font-black uppercase text-rose-600">403 - KHÔNG CÓ QUYỀN TRUY CẬP</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">Tài khoản không có quyền kiểm duyệt bản thảo.</p>
        <Link href="/wiki" className="px-4 py-2 text-xs font-mono font-bold uppercase tracking-wide bg-primary hover:bg-primary/90 text-primary-foreground rounded-md cursor-pointer">
          Quay lại Wiki
        </Link>
      </div>
    );
  }

  return (
    <div className={`font-sans flex flex-col gap-3 w-full text-foreground h-full overflow-y-auto text-xs md:text-sm ${isEmbedded ? "p-0" : "p-2 md:p-3"}`}>

      {/* Header */}
      {!isEmbedded && (
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-2 gap-2 select-none">
          <div className="flex items-center gap-2">
            <Link href="/wiki" className="p-1.5 border border-border bg-secondary hover:bg-secondary/90 text-secondary-foreground transition-all rounded-md shadow-sm cursor-pointer">
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
            <div>
              <span className="font-mono text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Giao diện điều phối tri thức</span>
              <h1 className="text-base font-bold text-foreground leading-tight flex items-center gap-1.5 mt-0.5">
                <Command className="w-4 h-4 text-primary shrink-0 animate-pulse" />
                WIKI REVIEW CONSOLE
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground bg-muted p-1 border border-border rounded-md flex-wrap">
            <span>Phím tắt:</span>
            {["[A] Duyệt", "[C] Yêu cầu", "[R] Từ chối"].map((k) => (
              <span key={k} className="bg-background px-1.5 py-0.5 rounded border border-border text-foreground font-semibold">{k}</span>
            ))}
            {(isSuperAdmin || isAdmin) && <span className="bg-amber-500/10 border-amber-500 px-1.5 py-0.5 rounded border text-amber-700 dark:text-amber-400 font-semibold">[E] Sửa trực tiếp</span>}
            <span className="bg-background px-1.5 py-0.5 rounded border border-border text-foreground font-semibold">[Esc] Hủy</span>
          </div>
        </div>
      )}

      {message && (
        <div className={`border p-3 text-xs rounded-lg ${message.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-400" : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-400"}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">

        {/* Left Column — Draft list (3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-2.5 border border-border bg-card p-3 rounded-lg shadow-md">

          {/* PENDING section */}
          <div className="border-b pb-1.5 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-extrabold text-foreground tracking-wide">BẢN THẢO CHỜ DUYỆT</span>
            <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md text-amber-700 dark:text-amber-400 font-semibold">{pendingDrafts.length}</span>
          </div>

          {isDraftsLoading ? (
            <div className="py-6 text-center text-[10px] font-mono text-muted-foreground">Đang tải...</div>
          ) : pendingDrafts.length === 0 ? (
            <div className="py-4 text-center flex flex-col items-center gap-1 border border-dashed border-border rounded-lg bg-muted/5">
              <Clock className="w-4 h-4 text-muted-foreground/60" />
              <p className="text-[10px] font-bold text-foreground">Không có bản thảo chờ duyệt</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto pr-1">
                {paginatedPendingDrafts.map((d: any) => {
                  const docId = d.summary?.match(/Compiled from document ID: (\d+)/)?.[1] || null;
                  return (
                    <button key={d.id} onClick={() => { setSelectedDraftId(d.id); setMessage(null); }}
                      className={`w-full text-left p-2.5 border transition-all rounded-md flex flex-col gap-1.5 ${selectedDraftId === d.id ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-background hover:bg-muted/50"}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 border bg-amber-500/10 border-amber-500 text-amber-800 dark:text-amber-400 rounded-md leading-none">DRAFT #{d.id}</span>
                        {isSuperAdmin && <span className="text-[8px] font-mono text-primary truncate max-w-[90px] bg-primary/10 border border-primary/20 px-1 py-0.5 rounded">WS: {d.workspaceId}</span>}
                      </div>
                      <h3 className="text-[11px] font-extrabold text-foreground leading-snug line-clamp-2">{d.title}</h3>
                      <div className="flex items-center justify-between text-[8.5px] font-mono text-muted-foreground border-t border-dashed border-border pt-1">
                        <span>Tác giả: {d.authorId}</span>
                        <span>V.{d.baseVersion || 1}</span>
                      </div>
                      {docId && <div className="text-[8px] text-amber-600 dark:text-amber-400 font-mono font-semibold">Nguồn: Doc #{docId}</div>}
                    </button>
                  );
                })}
              </div>
              <WikiPagination page={page} size={size} totalPages={totalPages} totalElements={pendingDrafts.length} setPage={setPage} compact={true} />
            </>
          )}

          {/* NEEDS_REVISION section */}
          {(isRevisionLoading || revisionDrafts.length > 0) && (
            <>
              <div className="border-t border-border pt-2 mt-1 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase font-extrabold text-orange-600 dark:text-orange-400 tracking-wide">CẦN CHỈNH SỬA</span>
                <span className="text-[10px] bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-md text-orange-700 dark:text-orange-400 font-semibold">{revisionDrafts.length}</span>
              </div>
              {isRevisionLoading ? (
                <div className="py-3 text-center text-[10px] font-mono text-muted-foreground">Đang tải...</div>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {(revisionDrafts as any[]).map((d) => (
                    <button key={d.id} onClick={() => { setSelectedDraftId(d.id); setMessage(null); }}
                      className={`w-full text-left p-2.5 border transition-all rounded-md flex flex-col gap-1.5 ${selectedDraftId === d.id ? "border-orange-500 bg-orange-500/8 shadow-sm" : "border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10"}`}
                    >
                      <div className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-orange-500 shrink-0" />
                        <span className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 border bg-orange-500/15 border-orange-500/50 text-orange-800 dark:text-orange-400 rounded-md leading-none">#{d.id}</span>
                      </div>
                      <h3 className="text-[11px] font-extrabold text-foreground leading-snug line-clamp-2">{d.title}</h3>
                      {d.reviewerNote && (
                        <p className="text-[8.5px] text-orange-600 dark:text-orange-400 line-clamp-2 font-mono border-t border-orange-500/20 pt-1 italic">
                          &ldquo;{d.reviewerNote}&rdquo;
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right — Review/Revision Panel (9 cols) */}
        <div className="lg:col-span-9 flex flex-col gap-3">
          {activeDraft ? (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-start">

              {/* Content viewer / editor (8 cols) */}
              <div className="xl:col-span-8 flex flex-col gap-3 border border-border bg-card p-4 rounded-lg shadow-md">
                <div className="flex items-center justify-between border-b border-border pb-1.5 select-none">
                  <div>
                    <span className="font-mono text-[8px] uppercase font-bold text-muted-foreground">
                      {isRevisionDraft ? "BẢN THẢO CẦN CHỈNH SỬA" : isEditMode ? "ADMIN EDIT MODE" : "Diff View"}
                    </span>
                    <h2 className="text-xs font-bold text-foreground mt-0.5 line-clamp-1">{activeDraft.title}</h2>
                  </div>

                  {!isRevisionDraft ? (
                    <div className="flex items-center gap-1.5">
                      {!isEditMode && (
                        <div className="flex items-center border border-border bg-muted p-0.5 rounded-md font-mono text-[9px] font-semibold">
                          <button onClick={() => setDiffMode("unified")} className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 ${diffMode === "unified" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted-foreground/10 text-foreground"}`}>
                            <Maximize2 className="w-2.5 h-2.5" /> Unified
                          </button>
                          <button onClick={() => setDiffMode("split")} className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 ${diffMode === "split" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted-foreground/10 text-foreground"}`}>
                            <Split className="w-2.5 h-2.5" /> Split
                          </button>
                        </div>
                      )}
                      {(isSuperAdmin || isAdmin) && (
                        <button onClick={() => { if (isEditMode) { setIsEditMode(false); setEditContent(activeDraft.content || ""); } else { setEditContent(activeDraft.content || ""); setIsEditMode(true); } }}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[9px] font-mono font-bold transition-all cursor-pointer ${isEditMode ? "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400" : "bg-muted border-border text-foreground hover:bg-primary/5"}`}>
                          {isEditMode ? <X className="w-2.5 h-2.5" /> : <Pencil className="w-2.5 h-2.5" />}
                          {isEditMode ? "Hủy sửa" : "Sửa trực tiếp"}
                        </button>
                      )}
                    </div>
                  ) : (
                    <button onClick={() => { setIsRevisionEditing(!isRevisionEditing); if (!isRevisionEditing) setRevisionContent(activeDraft.content || ""); }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[9px] font-mono font-bold transition-all cursor-pointer ${isRevisionEditing ? "bg-orange-500/10 border-orange-500 text-orange-700 dark:text-orange-400" : "bg-muted border-border text-foreground hover:bg-orange-500/10"}`}>
                      {isRevisionEditing ? <X className="w-2.5 h-2.5" /> : <Pencil className="w-2.5 h-2.5" />}
                      {isRevisionEditing ? "Hủy sửa" : "Chỉnh sửa nội dung"}
                    </button>
                  )}
                </div>

                {/* Reviewer note banner for NEEDS_REVISION */}
                {isRevisionDraft && activeDraft.reviewerNote && (
                  <div className="flex gap-2.5 p-3 bg-orange-500/8 border border-orange-500/30 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-mono font-extrabold uppercase text-orange-600 dark:text-orange-400 mb-1">Nhận xét từ người kiểm duyệt:</p>
                      <p className="text-xs text-foreground/90 leading-relaxed">&ldquo;{activeDraft.reviewerNote}&rdquo;</p>
                    </div>
                  </div>
                )}

                {/* Content area */}
                {isRevisionDraft && isRevisionEditing ? (
                  <div className="flex flex-col gap-2">
                    <textarea value={revisionContent} onChange={(e) => setRevisionContent(e.target.value)}
                      className="w-full min-h-[380px] border border-border bg-background rounded-md p-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-orange-500 resize-y" placeholder="Nội dung đã chỉnh sửa (Markdown)..." spellCheck={false} />
                    <p className="text-[10px] font-mono text-orange-600 dark:text-orange-400">Chỉnh sửa theo yêu cầu của người kiểm duyệt. Sau đó nhấn &ldquo;Gửi lại để duyệt&rdquo;.</p>
                  </div>
                ) : isEditMode ? (
                  <div className="flex flex-col gap-2">
                    <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)}
                      className="w-full min-h-[420px] border border-border bg-background rounded-md p-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary resize-y" placeholder="Nội dung bản thảo (Markdown)..." spellCheck={false} />
                    <div className="flex items-center gap-2">
                      <input type="text" value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Ghi chú chỉnh sửa..." className="flex-1 border border-border bg-background rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                      <button onClick={handleSaveEdit} disabled={isSavingEdit || !editContent.trim()} className="px-3 py-1.5 text-xs font-mono font-bold bg-amber-500 hover:bg-amber-500/90 text-white rounded-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                        <Save className="w-3 h-3" /> {isSavingEdit ? "Đang lưu..." : "Lưu"}
                      </button>
                      <button onClick={handleSaveAndApprove} disabled={isSavingEdit || isApproving || !editContent.trim()} className="px-3 py-1.5 text-xs font-mono font-bold bg-emerald-600 hover:bg-emerald-600/90 text-white rounded-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                        <CheckCircle className="w-3 h-3" /> {isSavingEdit || isApproving ? "Xử lý..." : "Lưu & Duyệt"}
                      </button>
                    </div>
                    <p className="text-[10px] font-mono text-amber-600 dark:text-amber-400">Admin edit — nội dung ghi thẳng vào bản thảo, có thể duyệt ngay.</p>
                  </div>
                ) : (
                  <div className="max-h-[520px] overflow-y-auto p-2 bg-muted/10 border border-border rounded-md">
                    <WikiDraftDiff oldText={oldText} newText={activeDraft.content || ""} mode={diffMode} />
                  </div>
                )}

                {activeDraft.note && (
                  <div className="border border-border p-2.5 bg-muted/30 rounded-md text-[10.5px] text-foreground/90">
                    <span className="font-bold">Ghi chú tác giả:</span> &quot;{activeDraft.note}&quot;
                  </div>
                )}
              </div>

              {/* Actions (4 cols) */}
              <div className="xl:col-span-4 flex flex-col gap-3">

                {isRevisionDraft ? (
                  /* NEEDS_REVISION actions */
                  <div className="border border-orange-500/30 bg-card p-3 rounded-lg shadow-md flex flex-col gap-2.5">
                    <div className="border-b border-orange-500/20 pb-1.5">
                      <span className="font-mono text-[9px] uppercase font-extrabold text-orange-600 dark:text-orange-400">GỬI LẠI BẢN THẢO</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Xem nhận xét của người duyệt, chỉnh sửa nội dung nếu cần rồi gửi lại.
                    </p>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-mono font-bold uppercase text-foreground">Ghi chú sửa đổi (tuỳ chọn)</label>
                      <textarea value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)} placeholder="Mô tả những thay đổi bạn đã thực hiện..." rows={2}
                        className="w-full border border-border bg-background rounded-md p-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all" />
                    </div>
                    <div className="flex flex-col gap-1.5 font-mono text-[10.5px] font-bold">
                      <button onClick={handleSubmitRevision} disabled={isSubmittingRevision}
                        className="w-full py-2 bg-orange-500 hover:bg-orange-500/95 text-white transition-all rounded-md shadow-sm hover:-translate-y-[0.5px] active:scale-[0.98] disabled:opacity-50 uppercase font-semibold cursor-pointer flex items-center justify-center gap-2">
                        <RotateCcw className="w-3.5 h-3.5" />
                        {isSubmittingRevision ? "Đang gửi..." : "Gửi lại để duyệt"}
                      </button>
                      <button onClick={handleWithdraw} disabled={isWithdrawing}
                        className="w-full py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground border border-border transition-all rounded-md disabled:opacity-50 uppercase cursor-pointer">
                        {isWithdrawing ? "Đang rút..." : "Rút lại bản thảo"}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* PENDING review actions */
                  <>
                    {(isSuperAdmin || isAdmin) && (
                      <div className="flex items-center border border-border bg-muted rounded-lg p-0.5 gap-0.5 font-mono text-[9px] font-bold select-none">
                        <button onClick={() => setAdminTab("review")} className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md transition-all ${adminTab === "review" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                          <FileText className="w-2.5 h-2.5" /> KIỂM DUYỆT
                        </button>
                        <button onClick={() => setAdminTab("fixer")} className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md transition-all ${adminTab === "fixer" ? "bg-blue-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                          <Wrench className="w-2.5 h-2.5" /> WIKI FIXER
                        </button>
                      </div>
                    )}

                    {(adminTab === "review" || (!isSuperAdmin && !isAdmin)) && (
                      <>
                        <WikiAiCheckPanel content={newText} title={activeDraft.title} slug={activeDraft.slug} wikiPages={wikiPages} />
                        <div className="border border-border bg-card p-3 rounded-lg shadow-md flex flex-col gap-2.5">
                          <div className="border-b border-border pb-1.5">
                            <span className="font-mono text-[9px] uppercase font-extrabold text-foreground">ĐIỀU PHỐI ĐỀ XUẤT</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] font-mono font-bold uppercase text-foreground">Nhận xét</label>
                              <span className="text-[8px] font-mono text-rose-500">* Bắt buộc khi từ chối/yêu cầu sửa</span>
                            </div>
                            <textarea value={reviewerNote} onChange={(e) => setReviewerNote(e.target.value)} placeholder="Nhập ghi chú phản hồi..."
                              rows={isNoteExpanded ? 3 : 1} onFocus={() => setIsNoteExpanded(true)} onBlur={() => { if (!reviewerNote.trim()) setIsNoteExpanded(false); }}
                              className="w-full border border-border bg-background rounded-md p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all" />
                          </div>
                          <div className="flex flex-col gap-1.5 font-mono text-[10.5px] font-bold">
                            <button onClick={handleApprove} disabled={isApproving || isRejecting || isRequesting} className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-600/95 text-white transition-all rounded-md shadow-sm hover:-translate-y-[0.5px] active:scale-[0.98] disabled:opacity-50 uppercase cursor-pointer">
                              Duyệt & Xuất bản (A)
                            </button>
                            <button onClick={handleRequestChanges} disabled={isApproving || isRejecting || isRequesting} className="w-full py-1.5 bg-amber-500 hover:bg-amber-500/95 text-white transition-all rounded-md shadow-sm hover:-translate-y-[0.5px] active:scale-[0.98] disabled:opacity-50 uppercase cursor-pointer">
                              Yêu cầu sửa đổi (C)
                            </button>
                            <button onClick={handleReject} disabled={isApproving || isRejecting || isRequesting} className="w-full py-1.5 bg-rose-600 hover:bg-rose-600/95 text-white transition-all rounded-md shadow-sm hover:-translate-y-[0.5px] active:scale-[0.98] disabled:opacity-50 uppercase cursor-pointer">
                              Từ chối bản thảo (R)
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {adminTab === "fixer" && (isSuperAdmin || isAdmin) && (
                      <div className="flex flex-col gap-3">
                        <WikiIssuePanel slug={activeDraft.slug || ""} workspaceId={workspaceId} onOpenFixer={(id: number) => setFixerIssueId(id)} />
                        <div className="border border-blue-200/60 dark:border-blue-800/30 bg-card rounded-lg shadow-md overflow-hidden flex flex-col" style={{ minHeight: "360px" }}>
                          <WikiFixerChat inline slug={activeDraft.slug || (activeDraft.title ?? "").toLowerCase().replace(/\s+/g, "-")} issueId={fixerIssueId} workspaceId={workspaceId} />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

            </div>
          ) : (
            <div className="border border-dashed border-border p-8 rounded-lg text-center flex flex-col items-center justify-center min-h-[300px] bg-muted/5">
              <Sparkles className="w-8 h-8 text-primary/70 mb-2 shrink-0 animate-bounce" />
              <h2 className="text-xs font-semibold uppercase text-foreground">Chưa chọn bản thảo</h2>
              <p className="text-[10px] text-muted-foreground mt-1 max-w-sm leading-normal">
                Nhấp vào một bản thảo trong danh sách bên trái để mở Diff View và tiến hành kiểm duyệt.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
