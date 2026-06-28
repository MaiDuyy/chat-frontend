"use client";

import React from "react";
import {
  AlertTriangle, CheckCircle2, XCircle, Clock,
  Loader2, Wrench, Eye, EyeOff, ShieldAlert,
  RefreshCw, ChevronDown, ChevronUp, Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  WikiIssue,
  useGetWikiIssuesQuery,
  useUpdateWikiIssueMutation,
} from "@/src/redux/feature/mrpApi";

// ── Helpers ───────────────────────────────────────────────────────────────────

function issueTypeBadgeClass(type: WikiIssue["issueType"]): string {
  switch (type) {
    case "CONTRADICTORY_FACTS":
    case "HALLUCINATION":
      return "bg-red-500/10 text-red-600 border-red-400/30 dark:text-red-400";
    case "OUT_OF_DATE":
    case "MIXED_ENTITIES":
      return "bg-orange-500/10 text-orange-600 border-orange-400/30 dark:text-orange-400";
    case "MISSING_LINKS":
      return "bg-yellow-500/10 text-yellow-700 border-yellow-400/30 dark:text-yellow-400";
    case "POOR_QUALITY":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function issueTypeLabel(type: WikiIssue["issueType"]): string {
  const labels: Record<WikiIssue["issueType"], string> = {
    MIXED_ENTITIES: "Thực thể hỗn hợp",
    CONTRADICTORY_FACTS: "Thông tin mâu thuẫn",
    OUT_OF_DATE: "Lỗi thời",
    MISSING_LINKS: "Thiếu liên kết",
    POOR_QUALITY: "Chất lượng kém",
    HALLUCINATION: "Ảo giác AI",
  };
  return labels[type] ?? type;
}

function statusBadgeClass(status: WikiIssue["status"]): string {
  switch (status) {
    case "OPEN":
      return "bg-red-500/10 text-red-600 border-red-400/30 dark:text-red-400";
    case "IN_PROGRESS":
      return "bg-blue-500/10 text-blue-600 border-blue-400/30 dark:text-blue-400";
    case "FIXED":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-400/30 dark:text-emerald-400";
    case "IGNORED":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function statusLabel(status: WikiIssue["status"]): string {
  const labels: Record<WikiIssue["status"], string> = {
    OPEN: "Mở",
    IN_PROGRESS: "Đang sửa",
    FIXED: "Đã sửa",
    IGNORED: "Bỏ qua",
  };
  return labels[status] ?? status;
}

// ── IssueCard ─────────────────────────────────────────────────────────────────

interface IssueCardProps {
  issue: WikiIssue;
  onOpenFixer: (issueId: number, slug: string) => void;
}

function IssueCard({ issue, onOpenFixer }: IssueCardProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [updateIssue, { isLoading: isUpdating }] = useUpdateWikiIssueMutation();

  const handleMarkFixed = async () => {
    await updateIssue({ id: issue.id, status: "FIXED" });
  };

  const handleIgnore = async () => {
    await updateIssue({ id: issue.id, status: "IGNORED" });
  };

  const isResolved = issue.status === "FIXED" || issue.status === "IGNORED";

  return (
    <div
      className={cn(
        "border rounded-lg p-3 space-y-2 transition-colors",
        isResolved
          ? "border-border bg-muted/20 opacity-70"
          : "border-border bg-card hover:border-primary/20"
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={cn(
            "inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0",
            issueTypeBadgeClass(issue.issueType)
          )}
        >
          {issueTypeLabel(issue.issueType)}
        </span>
        <span
          className={cn(
            "inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ml-auto",
            statusBadgeClass(issue.status)
          )}
        >
          {statusLabel(issue.status)}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-foreground leading-relaxed">{issue.description}</p>

      {/* Evidence */}
      {issue.evidence && (
        <p className="text-[11px] text-muted-foreground italic leading-relaxed line-clamp-2">
          {issue.evidence}
        </p>
      )}

      {/* Suggested fix toggle */}
      {issue.suggestedFix && (
        <div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Xem đề xuất sửa
          </button>
          {expanded && (
            <div className="mt-1.5 p-2 bg-emerald-500/5 border border-emerald-500/20 rounded text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed whitespace-pre-wrap">
              {issue.suggestedFix}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      {!isResolved && (
        <div className="flex items-center gap-1.5 pt-1 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[10px] gap-1 border-blue-400/30 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:text-blue-400"
            onClick={() => onOpenFixer(issue.id, issue.wikiPageSlug)}
          >
            <Wand2 className="w-3 h-3" />
            Sửa với AI
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[10px] gap-1"
            onClick={handleIgnore}
            disabled={isUpdating}
          >
            {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <EyeOff className="w-3 h-3" />}
            Bỏ qua
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[10px] gap-1 border-emerald-400/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 dark:text-emerald-400"
            onClick={handleMarkFixed}
            disabled={isUpdating}
          >
            {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
            Đã sửa
          </Button>
        </div>
      )}

      {issue.resolvedNote && (
        <p className="text-[10px] text-muted-foreground italic">Ghi chú: {issue.resolvedNote}</p>
      )}
    </div>
  );
}

// ── WikiIssuePanel ────────────────────────────────────────────────────────────

export interface WikiIssuePanelProps {
  slug: string;
  workspaceId: string;
  onOpenFixer: (issueId: number, slug: string) => void;
}

export function WikiIssuePanel({ slug, workspaceId, onOpenFixer }: WikiIssuePanelProps) {
  const { data: issues, isLoading, refetch } = useGetWikiIssuesQuery(
    { slug, workspaceId },
    { skip: !slug }
  );

  const openIssues = issues?.filter((i : any ) => i.status === "OPEN") ?? [];
  const otherIssues = issues?.filter((i : any) => i.status !== "OPEN") ?? [];
  const allIssues = [...openIssues, ...otherIssues];

  return (
    <div className="border-t border-border bg-card/80 px-6 py-4 space-y-3">
      {/* Panel header */}
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
        <span className="text-xs font-bold text-foreground uppercase tracking-wide">
          Vấn đề chất lượng trang
        </span>
        {openIssues.length > 0 && (
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white">
            {openIssues.length}
          </span>
        )}
        <button
          onClick={() => refetch()}
          className="ml-auto p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          title="Làm mới"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-4 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">Đang tải vấn đề...</span>
        </div>
      ) : allIssues.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500/40" />
          <p className="text-xs text-muted-foreground">Không có vấn đề nào được ghi nhận cho trang này.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {allIssues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} onOpenFixer={onOpenFixer} />
          ))}
        </div>
      )}
    </div>
  );
}