"use client";

import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/src/redux/store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Upload,
  ClipboardList,
  FileEdit,
  BookOpen,
  AlertCircle,
  Loader2,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import {
  useGetWikiStatsQuery,
  useGetCompilationPlansQuery,
  useGetDraftsByStatusQuery,
  PaginatedResponse,
  SourceCompilationPlan,
} from "@/src/redux/feature/mrpApi";
import { useHasRole } from "@/src/lib/rbac/usePermission";
import { DocumentManagement } from "@/src/features/admin/DocumentManagement";
import WikiReviewConsole from "@/app/wiki/review/page";
import CompilationPlansPage from "@/app/wiki/plans/page";

// ---------------------------------------------------------------------------
// Live stats header
// ---------------------------------------------------------------------------

function LiveStatsBar({ workspaceId }: { workspaceId: string }) {
  const [poll, setPoll] = React.useState(6000);
  const { data: stats } = useGetWikiStatsQuery({ workspaceId }, { pollingInterval: poll });

  React.useEffect(() => {
    if (stats) setPoll((stats.activeCompilations ?? 0) > 0 || stats.isIndexing ? 3000 : 8000);
  }, [stats]);

  const items = [
    {
      icon: <Loader2 className={`w-3.5 h-3.5 ${(stats?.activeCompilations ?? 0) > 0 ? "animate-spin" : ""}`} />,
      label: "Đang biên soạn",
      value: stats?.activeCompilations ?? 0,
      active: (stats?.activeCompilations ?? 0) > 0,
      cls: "text-sky-600 bg-sky-500/10 border-sky-500/30",
    },
    {
      icon: <FileEdit className="w-3.5 h-3.5" />,
      label: "Bản thảo chờ duyệt",
      value: stats?.pendingDrafts ?? 0,
      active: (stats?.pendingDrafts ?? 0) > 0,
      cls:
        (stats?.pendingDrafts ?? 0) > 0
          ? "text-amber-600 bg-amber-500/10 border-amber-500/30"
          : "text-muted-foreground bg-muted/10 border-border",
    },
    {
      icon: <BookOpen className="w-3.5 h-3.5" />,
      label: "Trang Wiki",
      value: stats?.totalPages ?? 0,
      active: false,
      cls: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30",
    },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {items.map((it) => (
        <div
          key={it.label}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${it.cls} ${it.active ? "animate-pulse" : ""}`}
        >
          {it.icon}
          <span className="font-bold tabular-nums">{it.value}</span>
          <span className="opacity-75">{it.label}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Attention banners
// ---------------------------------------------------------------------------

function AttentionBanners({
  pendingPlans,
  needsRevision,
  onGoTo,
}: {
  pendingPlans: number;
  needsRevision: number;
  onGoTo: (tab: string) => void;
}) {
  return (
    <>
      {pendingPlans > 0 && (
        <button
          onClick={() => onGoTo("plans")}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/8 border border-amber-500/25 rounded-lg hover:bg-amber-500/14 transition-colors text-left"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>
            <strong>{pendingPlans}</strong> kế hoạch biên soạn đang chờ phê duyệt.
          </span>
          <span className="ml-auto font-semibold underline underline-offset-2 shrink-0">
            Xem kế hoạch →
          </span>
        </button>
      )}
      {needsRevision > 0 && (
        <button
          onClick={() => onGoTo("drafts")}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-orange-700 dark:text-orange-400 bg-orange-500/8 border border-orange-500/25 rounded-lg hover:bg-orange-500/14 transition-colors text-left"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>
            <strong>{needsRevision}</strong> bản thảo đã được trả về để chỉnh sửa — cần gửi lại.
          </span>
          <span className="ml-auto font-semibold underline underline-offset-2 shrink-0">
            Xem bản thảo →
          </span>
        </button>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Wiki published summary (tab 4)
// ---------------------------------------------------------------------------

function WikiPublishedTab({ workspaceId }: { workspaceId: string }) {
  const { data: stats } = useGetWikiStatsQuery({ workspaceId }, { pollingInterval: 15000 });

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-16">
      <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
        <BookOpen className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="text-center">
        <p className="text-4xl font-bold text-foreground tabular-nums">{stats?.totalPages ?? "—"}</p>
        <p className="text-sm text-muted-foreground mt-1">trang Wiki đã được phê duyệt và xuất bản</p>
      </div>
      <div className="flex gap-3 flex-wrap justify-center">
        <a
          href="/wiki"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          Xem Wiki
        </a>
        <a
          href="/wiki/health"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border border-border hover:bg-muted transition-colors"
        >
          Kiểm tra sức khỏe
        </a>
        <a
          href="/wiki/graph"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border border-border hover:bg-muted transition-colors"
        >
          Đồ thị tri thức
        </a>
      </div>
      <p className="text-xs text-muted-foreground max-w-sm text-center leading-relaxed">
        Trang Wiki đã duyệt được lập chỉ mục vào VectorStore, khả dụng cho AI RAG, tìm kiếm ngữ nghĩa và đồ thị tri thức.
      </p>
      <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
        <CheckCircle className="w-4 h-4" />
        Pipeline hoạt động bình thường
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminMrpPage() {
  const isSuperAdmin = useHasRole("SUPER_ADMIN");
  const isAdmin = useHasRole("ADMIN");
  const isSystemAdmin = isSuperAdmin || isAdmin;
  const currentWorkspaceId = useSelector((state: RootState) => state.workspace.currentWorkspaceId);
  const workspaceId = isSystemAdmin ? "all" : (currentWorkspaceId || "default-workspace");

  const [activeTab, setActiveTab] = React.useState("upload");

  // Badge counts
  const { data: plansData, refetch: refetchPlans } = useGetCompilationPlansQuery(
    { workspaceId, page: 0, size: 200 },
    { pollingInterval: 10000 }
  );
  const { data: revisionData, refetch: refetchRevision } = useGetDraftsByStatusQuery(
    { status: "NEEDS_REVISION", limit: 200 },
    { pollingInterval: 10000 }
  );
  const { data: pendingData, refetch: refetchPending } = useGetDraftsByStatusQuery(
    { status: "PENDING", limit: 200 },
    { pollingInterval: 10000 }
  );

  const pendingPlansCount = React.useMemo(() => {
    if (!plansData) return 0;
    const list: SourceCompilationPlan[] = Array.isArray(plansData)
      ? plansData
      : (plansData as PaginatedResponse<SourceCompilationPlan>).content ?? [];
    return list.filter((p) => p.status === "PENDING_REVIEW").length;
  }, [plansData]);

  const needsRevisionCount = React.useMemo(
    () => (Array.isArray(revisionData) ? revisionData.length : 0),
    [revisionData]
  );

  const pendingDraftCount = React.useMemo(
    () => (Array.isArray(pendingData) ? pendingData.length : 0),
    [pendingData]
  );

  const totalDraftBadge = pendingDraftCount + needsRevisionCount;

  function Badge({ count, variant = "amber" }: { count: number; variant?: "amber" | "orange" | "sky" | "emerald" }) {
    if (count === 0) return null;
    const cls = {
      amber: "bg-amber-500 text-white",
      orange: "bg-orange-500 text-white",
      sky: "bg-sky-500 text-white animate-pulse",
      emerald: "bg-emerald-500 text-white",
    }[variant];
    return (
      <span className={`ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-none ${cls}`}>
        {count}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground tracking-tight">
            MRP Pipeline — Biên soạn tri thức
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tải tài liệu → Kế hoạch → Bản thảo → Wiki chính thức
          </p>
        </div>
        <LiveStatsBar workspaceId={workspaceId} />
      </div>

      {/* ── Attention banners ── */}
      <div className="flex flex-col gap-2">
        <AttentionBanners
          pendingPlans={pendingPlansCount}
          needsRevision={needsRevisionCount}
          onGoTo={setActiveTab}
        />
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList variant="line" className="w-full justify-start border-b border-border rounded-none pb-0 h-auto gap-0">
          {/* Tab 1 */}
          <TabsTrigger value="upload" className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground">
            <Upload className="w-4 h-4" />
            Tài liệu & Upload
          </TabsTrigger>

          {/* Tab 2 */}
          <TabsTrigger value="plans" className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground">
            <ClipboardList className="w-4 h-4" />
            Kế hoạch biên soạn
            <Badge count={pendingPlansCount} variant="amber" />
          </TabsTrigger>

          {/* Tab 3 */}
          <TabsTrigger value="drafts" className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground">
            <FileEdit className="w-4 h-4" />
            Bản thảo Wiki
            {totalDraftBadge > 0 && (
              <Badge count={totalDraftBadge} variant={needsRevisionCount > 0 ? "orange" : "amber"} />
            )}
          </TabsTrigger>

          {/* Tab 4 */}
          <TabsTrigger value="wiki" className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground">
            <BookOpen className="w-4 h-4" />
            Wiki đã xuất bản
          </TabsTrigger>
        </TabsList>

        {/* ── Tab contents ── */}
        <div className="flex-1 overflow-auto pt-4 min-h-0">
          <TabsContent value="upload">
            <DocumentManagement />
          </TabsContent>

          <TabsContent value="plans">
            <CompilationPlansPage isEmbedded={true} />
          </TabsContent>

          <TabsContent value="drafts">
            <WikiReviewConsole isEmbedded={true} />
          </TabsContent>

          <TabsContent value="wiki">
            <WikiPublishedTab workspaceId={workspaceId} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
