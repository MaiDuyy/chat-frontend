"use client";

/**
 * MrpPipelinePage — Trang quản lý toàn bộ quy trình MRP trên một màn hình.
 *
 * Pipeline: Tài liệu gốc → MRP Compile → Kế hoạch biên soạn → Bản thảo Wiki → Wiki chính thức
 *
 * Bốn bước được hiển thị dưới dạng tab với badge count realtime,
 * admin click để chuyển bước mà không cần rời trang.
 */

import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/src/redux/store";
import {
  Upload,
  ClipboardList,
  FileEdit,
  BookOpen,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  useGetWikiStatsQuery,
  useGetCompilationPlansQuery,
  useGetDraftsByStatusQuery,
  WikiStatsDto,
} from "@/src/redux/feature/mrpApi";
import { useHasRole } from "@/src/lib/rbac/usePermission";
import { DocumentManagement } from "@/src/features/admin/DocumentManagement";
import { MrpDraftReviewPanel } from "@/src/features/admin/MrpDraftReviewPanel";
import CompilationPlansPage from "@/app/wiki/plans/page";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PipelineStep = "upload" | "plans" | "drafts" | "wiki";

interface StepMeta {
  id: PipelineStep;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  badge?: number;
  badgeVariant?: "default" | "warn" | "danger" | "pulse";
}

// ---------------------------------------------------------------------------
// Status bar — live metric chips
// ---------------------------------------------------------------------------

function StatusBar({ stats, isFetching }: { stats?: WikiStatsDto; isFetching?: boolean }) {
  const chips = [
    {
      label: "Đang biên soạn",
      value: stats?.activeCompilations ?? 0,
      pulse: (stats?.activeCompilations ?? 0) > 0,
      color: "text-sky-600 bg-sky-500/10 border-sky-500/30",
      icon: <Loader2 className={`w-3 h-3 ${(stats?.activeCompilations ?? 0) > 0 ? "animate-spin" : ""}`} />,
    },
    {
      label: "Bản thảo chờ duyệt",
      value: stats?.pendingDrafts ?? 0,
      warn: (stats?.pendingDrafts ?? 0) > 0,
      color: (stats?.pendingDrafts ?? 0) > 0
        ? "text-amber-600 bg-amber-500/10 border-amber-500/30"
        : "text-muted-foreground bg-muted/20 border-border",
      icon: <FileEdit className="w-3 h-3" />,
    },
    {
      label: "Tổng trang Wiki",
      value: stats?.totalPages ?? 0,
      color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30",
      icon: <BookOpen className="w-3 h-3" />,
    },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {isFetching && (
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
      )}
      {chips.map((c) => (
        <div
          key={c.label}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${c.color} ${c.pulse ? "animate-pulse" : ""}`}
        >
          {c.icon}
          <span className="font-bold">{c.value}</span>
          <span className="font-normal opacity-80">{c.label}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step tab button
// ---------------------------------------------------------------------------

function StepTab({
  step,
  active,
  onClick,
  isLast,
}: {
  step: StepMeta;
  active: boolean;
  onClick: () => void;
  isLast: boolean;
}) {
  const hasBadge = step.badge !== undefined && step.badge > 0;
  const badgeColor =
    step.badgeVariant === "danger"
      ? "bg-rose-500 text-white"
      : step.badgeVariant === "warn"
      ? "bg-amber-500 text-white"
      : step.badgeVariant === "pulse"
      ? "bg-sky-500 text-white animate-pulse"
      : "bg-primary text-primary-foreground";

  return (
    <div className="flex items-center">
      <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-3 text-left transition-all rounded-lg border ${
          active
            ? "border-primary bg-primary/8 shadow-sm"
            : "border-transparent hover:border-border hover:bg-muted/40"
        }`}
      >
        <div
          className={`p-1.5 rounded-md transition-colors ${
            active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          {step.icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-semibold ${active ? "text-foreground" : "text-muted-foreground"}`}>
              {step.label}
            </span>
            {hasBadge && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${badgeColor}`}>
                {step.badge}
              </span>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">{step.sublabel}</span>
        </div>
      </button>
      {!isLast && (
        <ChevronRight className="w-4 h-4 text-muted-foreground/40 mx-1 shrink-0" />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function MrpPipelinePage() {
  const isSuperAdmin = useHasRole("SUPER_ADMIN");
  const isAdmin = useHasRole("ADMIN");
  const isSystemAdmin = isSuperAdmin || isAdmin;
  const currentWorkspaceId = useSelector(
    (state: RootState) => state.workspace.currentWorkspaceId
  );
  const workspaceId =
    isSystemAdmin ? "all" : (currentWorkspaceId || "default-workspace");

  const [activeStep, setActiveStep] = React.useState<PipelineStep>("upload");

  // Dynamic stats polling interval: 15s by default, 5s during activity, 30s when idle
  const [statsPollMs, setStatsPollMs] = React.useState(15000);
  const { data: stats, isFetching: isStatsFetching } = useGetWikiStatsQuery(
    { workspaceId },
    { pollingInterval: statsPollMs }
  );

  React.useEffect(() => {
    if (stats) {
      const isIndexingOrCompiling = stats.isIndexing || (stats.activeCompilations ?? 0) > 0 || (stats.finalizingDocs ?? 0) > 0;
      setStatsPollMs(isIndexingOrCompiling ? 5000 : 30000);
    }
  }, [stats]);

  const isIndexingOrCompiling = stats?.isIndexing || (stats?.activeCompilations ?? 0) > 0 || (stats?.finalizingDocs ?? 0) > 0;
  const badgePollInterval = isIndexingOrCompiling ? 5000 : 30000;

  const { data: plansData } = useGetCompilationPlansQuery(
    { workspaceId, page: 0, size: 200 },
    { pollingInterval: badgePollInterval }
  );

  const { data: revisionData } = useGetDraftsByStatusQuery(
    { status: "NEEDS_REVISION", limit: 200 },
    { pollingInterval: badgePollInterval }
  );

  // Count pending plans (PENDING_REVIEW)
  const pendingPlansCount = React.useMemo(() => {
    if (!plansData) return 0;
    const list = Array.isArray(plansData)
      ? plansData
      : "content" in plansData
      ? (plansData as any).content
      : [];
    return list.filter((p: any) => p.status === "PENDING_REVIEW").length;
  }, [plansData]);

  const needsRevisionCount = React.useMemo(() => {
    if (!revisionData || !Array.isArray(revisionData)) return 0;
    return revisionData.length;
  }, [revisionData]);

  const steps: StepMeta[] = [
    {
      id: "upload",
      label: "Tài liệu gốc",
      sublabel: "Upload & kích hoạt MRP",
      icon: <Upload className="w-4 h-4" />,
      badge: stats?.activeCompilations ? stats.activeCompilations : undefined,
      badgeVariant: "pulse",
    },
    {
      id: "plans",
      label: "Kế hoạch biên soạn",
      sublabel: "Phê duyệt / từ chối plan",
      icon: <ClipboardList className="w-4 h-4" />,
      badge: pendingPlansCount || undefined,
      badgeVariant: "warn",
    },
    {
      id: "drafts",
      label: "Bản thảo Wiki",
      sublabel: "Duyệt / yêu cầu sửa / từ chối",
      icon: <FileEdit className="w-4 h-4" />,
      badge:
        (stats?.pendingDrafts ?? 0) + needsRevisionCount || undefined,
      badgeVariant:
        needsRevisionCount > 0
          ? "danger"
          : (stats?.pendingDrafts ?? 0) > 0
          ? "warn"
          : "default",
    },
    {
      id: "wiki",
      label: "Wiki chính thức",
      sublabel: "Trang đã được phê duyệt",
      icon: <BookOpen className="w-4 h-4" />,
      badge: stats?.totalPages || undefined,
      badgeVariant: "default",
    },
  ];

  // Auto-highlight step with work pending
  React.useEffect(() => {
    if (pendingPlansCount > 0 && activeStep === "upload") {
      // Only auto-switch if user hasn't manually selected a step
    }
  }, [pendingPlansCount, activeStep]);

  return (
    <div className="flex flex-col gap-0 min-h-0">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3 pb-4 border-b border-border">
        <div>
          <h2 className="text-base font-bold text-foreground tracking-tight">
            MRP Pipeline — Biên soạn tri thức
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quy trình từ tài liệu gốc đến trang Wiki chính thức
          </p>
        </div>
        <StatusBar stats={stats} isFetching={isStatsFetching} />
      </div>

      {/* ── Pipeline step navigator ── */}
      <div className="flex items-center flex-wrap gap-1 py-3 border-b border-border overflow-x-auto">
        {steps.map((step, i) => (
          <StepTab
            key={step.id}
            step={step}
            active={activeStep === step.id}
            onClick={() => setActiveStep(step.id)}
            isLast={i === steps.length - 1}
          />
        ))}
      </div>

      {/* ── Attention banners ── */}
      {pendingPlansCount > 0 && activeStep !== "plans" && (
        <div
          className="flex items-center gap-2 px-4 py-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/8 border-b border-amber-500/20 cursor-pointer hover:bg-amber-500/12 transition-colors"
          onClick={() => setActiveStep("plans")}
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>
            Có <strong>{pendingPlansCount}</strong> kế hoạch biên soạn đang chờ phê duyệt.
          </span>
          <span className="ml-auto underline">Xem kế hoạch →</span>
        </div>
      )}
      {needsRevisionCount > 0 && activeStep !== "drafts" && (
        <div
          className="flex items-center gap-2 px-4 py-2 text-xs text-orange-700 dark:text-orange-400 bg-orange-500/8 border-b border-orange-500/20 cursor-pointer hover:bg-orange-500/12 transition-colors"
          onClick={() => setActiveStep("drafts")}
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>
            <strong>{needsRevisionCount}</strong> bản thảo đã được trả về để chỉnh sửa và cần được gửi lại.
          </span>
          <span className="ml-auto underline">Xem bản thảo →</span>
        </div>
      )}

      {/* ── Step content ── */}
      <div className="flex-1 min-h-0 pt-4">
        {activeStep === "upload" && (
          <DocumentManagement />
        )}

        {activeStep === "plans" && (
          <CompilationPlansPage isEmbedded={true} />
        )}

        {activeStep === "drafts" && (
          <MrpDraftReviewPanel workspaceId={workspaceId} />
        )}

        {activeStep === "wiki" && (
          <WikiPublishedSummary workspaceId={workspaceId} totalPages={stats?.totalPages ?? 0} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wiki published summary (step 4 — quick overview, links to full wiki)
// ---------------------------------------------------------------------------

function WikiPublishedSummary({
  workspaceId: _ws,
  totalPages,
}: {
  workspaceId: string;
  totalPages: number;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
        <BookOpen className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{totalPages}</p>
        <p className="text-sm text-muted-foreground mt-1">trang Wiki đã được phê duyệt và xuất bản</p>
      </div>
      <div className="flex gap-3">
        <a
          href="/wiki"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          Xem Wiki
        </a>
        <a
          href="/wiki/health"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium border border-border hover:bg-muted transition-colors"
        >
          Kiểm tra sức khỏe Wiki
        </a>
      </div>
      <p className="text-xs text-muted-foreground max-w-sm">
        Các trang Wiki đã duyệt sẽ được lập chỉ mục vào VectorStore và khả dụng cho AI RAG, tìm kiếm ngữ nghĩa, và đồ thị tri thức.
      </p>
    </div>
  );
}
