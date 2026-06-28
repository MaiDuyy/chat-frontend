"use client";

import React from "react";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Send,
  Pencil,
  Archive,
  RefreshCw,
  MessageSquare,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  useGetDraftsByStatusQuery,
  useApproveDraftMutation,
  useRejectDraftMutation,
  useRequestChangesOnDraftMutation,
  useSubmitRevisionDraftMutation,
  useWithdrawDraftMutation,
  useUpdateDraftMutation,
  WikiPageDraft,
} from "@/src/redux/feature/mrpApi";
import { useHasRole } from "@/src/lib/rbac/usePermission";
import { useSelector } from "react-redux";
import { RootState } from "@/src/redux/store";

// ---------------------------------------------------------------------------
// DraftCard — single card shared by PENDING and NEEDS_REVISION sections
// ---------------------------------------------------------------------------

interface DraftCardProps {
  draft: WikiPageDraft;
  mode: "review" | "revision";
  isAdmin: boolean;
  onAction: () => void;
}

function DraftCard({ draft, mode, isAdmin, onAction }: DraftCardProps) {
  const [expanded, setExpanded] = React.useState(mode === "revision");
  const [showContent, setShowContent] = React.useState(false);
  const [reviewNote, setReviewNote] = React.useState("");
  const [editContent, setEditContent] = React.useState(draft.content || "");
  const [editMode, setEditMode] = React.useState(false);
  const [revisionNote, setRevisionNote] = React.useState("");
  const [error, setError] = React.useState("");

  const [approveDraft, { isLoading: approving }] = useApproveDraftMutation();
  const [rejectDraft, { isLoading: rejecting }] = useRejectDraftMutation();
  const [requestChanges, { isLoading: requesting }] = useRequestChangesOnDraftMutation();
  const [submitRevision, { isLoading: submitting }] = useSubmitRevisionDraftMutation();
  const [withdrawDraft, { isLoading: withdrawing }] = useWithdrawDraftMutation();
  const [updateDraft, { isLoading: updating }] = useUpdateDraftMutation();

  const busy = approving || rejecting || requesting || submitting || withdrawing || updating;

  async function run(fn: () => Promise<unknown>) {
    setError("");
    try {
      await fn();
      onAction();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Thao tác thất bại");
    }
  }

  function handleApprove() {
    run(() => approveDraft(draft.id).unwrap());
  }

  function handleReject() {
    if (!reviewNote.trim()) { setError("Nhập lý do từ chối"); return; }
    run(() => rejectDraft({ draftId: draft.id, note: reviewNote }).unwrap());
    setReviewNote("");
  }

  function handleRequestChanges() {
    if (!reviewNote.trim()) { setError("Nhập phản hồi cần sửa cho tác giả"); return; }
    run(() => requestChanges({ draftId: draft.id, note: reviewNote }).unwrap());
    setReviewNote("");
  }

  function handleSaveEdit() {
    run(() => updateDraft({ draftId: draft.id, content: editContent }).unwrap());
    setEditMode(false);
  }

  function handleSubmitRevision() {
    run(() => submitRevision({
      draftId: draft.id,
      content: editMode ? editContent : undefined,
      note: revisionNote || undefined,
    }).unwrap());
    setEditMode(false);
    setRevisionNote("");
  }

  function handleWithdraw() {
    if (!confirm(`Rút lại bản thảo "${draft.title}"?`)) return;
    run(() => withdrawDraft(draft.id).unwrap());
  }

  const isReview = mode === "review";
  const isRevision = mode === "revision";

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${
      isRevision
        ? "border-orange-500/40 bg-orange-500/5"
        : "border-border bg-card"
    }`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors"
      >
        <span className="mt-0.5 shrink-0">
          {expanded
            ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground truncate max-w-xs">
              {draft.title}
            </span>
            {draft.revisionRound > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 font-medium border border-amber-500/25">
                Lần sửa #{draft.revisionRound}
              </span>
            )}
            {draft.pageType && (
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                {draft.pageType}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground font-mono mt-0.5">{draft.slug}</div>
          {isRevision && draft.reviewerNote && (
            <div className="mt-1 text-xs text-orange-600 dark:text-orange-400 font-medium line-clamp-1">
              ↩ {draft.reviewerNote}
            </div>
          )}
        </div>
        {isRevision
          ? <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
          : <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-border">
          {/* Reviewer return note (for NEEDS_REVISION) */}
          {isRevision && draft.reviewerNote && (
            <div className="mt-3 p-3 rounded-lg border border-orange-500/30 bg-orange-500/8">
              <div className="flex items-center gap-1.5 mb-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                  Phản hồi từ Reviewer
                </span>
              </div>
              <p className="text-sm text-orange-700 dark:text-orange-300 leading-relaxed whitespace-pre-wrap">
                {draft.reviewerNote}
              </p>
            </div>
          )}

          {/* Summary */}
          {draft.summary && (
            <p className="text-xs text-muted-foreground leading-relaxed mt-2">{draft.summary}</p>
          )}

          {/* Content */}
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setShowContent(!showContent)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors self-start"
            >
              {showContent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showContent ? "Ẩn nội dung" : "Xem nội dung"}
            </button>
            {showContent && (
              editMode ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={16}
                  className="w-full text-xs font-mono border border-primary/40 rounded-md bg-background p-3 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
                />
              ) : (
                <div className="max-h-64 overflow-y-auto p-3 rounded-md bg-muted/20 border border-border text-xs font-mono whitespace-pre-wrap text-muted-foreground leading-relaxed">
                  {draft.content
                    ? (draft.content.length > 1200
                        ? draft.content.slice(0, 1200) + "\n…(còn nữa)"
                        : draft.content)
                    : "(Không có nội dung)"}
                </div>
              )
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-rose-600 bg-rose-500/5 border border-rose-500/20 rounded-md p-2">
              {error}
            </p>
          )}

          {/* ===== REVIEW MODE (PENDING) ===== */}
          {isReview && isAdmin && (
            <div className="flex flex-col gap-2 pt-1">
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={2}
                placeholder="Phản hồi cho tác giả (bắt buộc khi Yêu cầu sửa hoặc Từ chối)..."
                className="w-full text-xs border border-border rounded-md bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
              <div className="flex flex-wrap gap-2">
                {/* Admin can edit content before approving */}
                <button
                  onClick={() => { setEditMode(!editMode); setEditContent(draft.content || ""); setShowContent(true); }}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {editMode ? "Hủy chỉnh sửa" : "Chỉnh sửa nội dung"}
                </button>
                {editMode && (
                  <button
                    onClick={handleSaveEdit}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-600 text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" /> Lưu chỉnh sửa
                  </button>
                )}
                <div className="flex-1" />
                <button
                  onClick={handleRequestChanges}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
                >
                  <AlertCircle className="w-3.5 h-3.5" /> Yêu cầu sửa
                </button>
                <button
                  onClick={handleReject}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" /> Từ chối
                </button>
                <button
                  onClick={handleApprove}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Duyệt
                </button>
              </div>
            </div>
          )}

          {/* ===== REVISION MODE (NEEDS_REVISION) ===== */}
          {isRevision && (
            <div className="flex flex-col gap-2 pt-1 border-t border-border/60 mt-1">
              <p className="text-xs text-muted-foreground">
                Chỉnh sửa nội dung (tuỳ chọn) rồi gửi lại để reviewer xem xét lần nữa.
              </p>
              <button
                onClick={() => { setEditMode(!editMode); setEditContent(draft.content || ""); setShowContent(true); }}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50 self-start"
              >
                <Pencil className="w-3.5 h-3.5" />
                {editMode ? "Hủy chỉnh sửa" : "Chỉnh sửa nội dung"}
              </button>
              <input
                type="text"
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                placeholder="Ghi chú về thay đổi đã thực hiện (tuỳ chọn)..."
                className="w-full text-xs border border-border rounded-md bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleWithdraw}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <Archive className="w-3.5 h-3.5" /> Rút lại
                </button>
                <div className="flex-1" />
                <button
                  onClick={handleSubmitRevision}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Gửi lại để duyệt
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section header with count badge
// ---------------------------------------------------------------------------

function SectionHeader({
  icon,
  title,
  count,
  color,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  color: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 p-1.5 rounded-lg ${color}`}>{icon}</div>
      <div>
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${color}`}>
            {count}
          </span>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

interface MrpDraftReviewPanelProps {
  workspaceId?: string;
}

export function MrpDraftReviewPanel({ workspaceId: _workspaceId }: MrpDraftReviewPanelProps) {
  const isSuperAdmin = useHasRole("SUPER_ADMIN");
  const isAdmin = useHasRole("ADMIN");
  const isSystemAdmin = isSuperAdmin || isAdmin;
  const currentWorkspaceId = useSelector((state: RootState) => state.workspace.currentWorkspaceId);
  const wsId = _workspaceId || currentWorkspaceId || "default-workspace";

  const [searchQuery, setSearchQuery] = React.useState("");

  // Fetch PENDING and NEEDS_REVISION separately
  const {
    data: pendingData,
    refetch: refetchPending,
    isFetching: fetchingPending,
  } = useGetDraftsByStatusQuery({ status: "PENDING", limit: 200 });

  const {
    data: revisionData,
    refetch: refetchRevision,
    isFetching: fetchingRevision,
  } = useGetDraftsByStatusQuery({ status: "NEEDS_REVISION", limit: 200 });

  const pendingDrafts: WikiPageDraft[] = React.useMemo(() => {
    if (!pendingData) return [];
    const all = Array.isArray(pendingData) ? pendingData : [];
    if (!isSystemAdmin) return all.filter((d) => d.workspaceId === wsId || d.workspaceId === "all" || d.workspaceId === "ALL");
    return all;
  }, [pendingData, isSystemAdmin, wsId]);

  const revisionDrafts: WikiPageDraft[] = React.useMemo(() => {
    if (!revisionData) return [];
    const all = Array.isArray(revisionData) ? revisionData : [];
    if (!isSystemAdmin) return all.filter((d) => d.workspaceId === wsId || d.workspaceId === "all" || d.workspaceId === "ALL");
    return all;
  }, [revisionData, isSystemAdmin, wsId]);

  function filter(list: WikiPageDraft[]) {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (d) =>
        d.title?.toLowerCase().includes(q) ||
        d.slug?.toLowerCase().includes(q) ||
        d.summary?.toLowerCase().includes(q)
    );
  }

  const filteredPending = filter(pendingDrafts);
  const filteredRevision = filter(revisionDrafts);
  const isFetching = fetchingPending || fetchingRevision;

  function refetchAll() {
    refetchPending();
    refetchRevision();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Duyệt bản thảo Wiki</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quản lý vòng đời bản thảo MRP — phê duyệt, yêu cầu chỉnh sửa, hoặc từ chối
          </p>
        </div>
        <button
          onClick={refetchAll}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-border hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </div>

      {/* Pipeline flow */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { label: "Tài liệu gốc", sub: "Upload", icon: "📄" },
          "→",
          { label: "MRP Compile", sub: "Map-Reduce", icon: "⚙️" },
          "→",
          { label: "Chờ duyệt", sub: `${pendingDrafts.length} bản thảo`, icon: "📋", active: true },
          "→",
          { label: "Reviewer duyệt", sub: "Approve / Changes / Reject", icon: "👀" },
          "→",
          { label: "Cần chỉnh sửa", sub: `${revisionDrafts.length} đang chờ`, icon: "✏️", warn: revisionDrafts.length > 0 },
          "→",
          { label: "Wiki chính thức", sub: "APPROVED", icon: "✅" },
        ].map((step, i) =>
          step === "→" ? (
            <ChevronRight key={i} className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <div
              key={i}
              className={`shrink-0 px-2.5 py-1.5 rounded-lg border text-center ${
                (step as { active?: boolean; warn?: boolean }).active
                  ? "border-primary bg-primary/10"
                  : (step as { warn?: boolean }).warn
                  ? "border-orange-500/40 bg-orange-500/8"
                  : "border-border bg-muted/20"
              }`}
            >
              <div className="text-base leading-none">{(step as { icon: string }).icon}</div>
              <div className={`text-[11px] font-semibold mt-0.5 ${(step as { active?: boolean }).active ? "text-primary" : (step as { warn?: boolean }).warn ? "text-orange-600 dark:text-orange-400" : "text-foreground"}`}>
                {(step as { label: string }).label}
              </div>
              <div className="text-[10px] text-muted-foreground">{(step as { sub: string }).sub}</div>
            </div>
          )
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm bản thảo theo tiêu đề, slug, tóm tắt..."
          className="w-full pl-9 pr-3 py-2 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {isFetching && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang tải...
        </div>
      )}

      {/* ===== SECTION 1: PENDING ===== */}
      <section className="flex flex-col gap-3">
        <SectionHeader
          icon={<Clock className="w-4 h-4" />}
          title="Chờ duyệt"
          count={filteredPending.length}
          color="text-amber-600 bg-amber-500/10 border-amber-500/30"
          description="Các bản thảo mới từ MRP pipeline, chờ reviewer phê duyệt hoặc phản hồi"
        />
        {filteredPending.length === 0 && !isFetching ? (
          <div className="flex items-center justify-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-lg gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            Không có bản thảo nào đang chờ duyệt
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredPending.map((draft) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                mode="review"
                isAdmin={isSystemAdmin}
                onAction={refetchAll}
              />
            ))}
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* ===== SECTION 2: NEEDS_REVISION ===== */}
      <section className="flex flex-col gap-3">
        <SectionHeader
          icon={<AlertCircle className="w-4 h-4" />}
          title="Cần chỉnh sửa"
          count={filteredRevision.length}
          color="text-orange-600 bg-orange-500/10 border-orange-500/30"
          description={
            filteredRevision.length > 0
              ? "Reviewer đã yêu cầu chỉnh sửa — chỉnh nội dung và gửi lại để duyệt lần nữa"
              : "Không có bản thảo nào đang cần chỉnh sửa"
          }
        />
        {filteredRevision.length === 0 && !isFetching ? (
          <div className="flex items-center justify-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-lg gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            Không có bản thảo nào đang cần chỉnh sửa
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredRevision.map((draft) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                mode="revision"
                isAdmin={isSystemAdmin}
                onAction={refetchAll}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
