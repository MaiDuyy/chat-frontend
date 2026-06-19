"use client";

import React from "react";
import Link from "next/link";
import {
  AlertTriangle, LinkIcon, Clock, Activity, RefreshCw, ArrowLeft,
  CheckCircle2, XCircle,
} from "lucide-react";
import {
  useGetWikiHealthQuery,
  useReindexWikiPagesMutation,
} from "@/src/redux/feature/mrpApi";

function ScoreColor({ score }: { score: number }) {
  if (score >= 0.8) return <span className="text-green-600 dark:text-green-400 font-bold">{(score * 100).toFixed(0)}%</span>;
  if (score >= 0.5) return <span className="text-amber-600 dark:text-amber-400 font-bold">{(score * 100).toFixed(0)}%</span>;
  return <span className="text-red-600 dark:text-red-400 font-bold">{(score * 100).toFixed(0)}%</span>;
}

export function WikiHealthDashboard({ workspaceId }: { workspaceId: string }) {
  const { data: health, isLoading, refetch } = useGetWikiHealthQuery({ workspaceId });
  const [reindex, { isLoading: reindexing, data: reindexResult }] = useReindexWikiPagesMutation();
  const [activeTab, setActiveTab] = React.useState<"orphan" | "broken" | "stale">("orphan");

  if (isLoading) {
    return (
      <div className="font-sans min-h-[400px] flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!health) {
    return (
      <div className="font-sans min-h-[400px] flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Không thể tải dữ liệu sức khỏe wiki.</p>
      </div>
    );
  }

  const { summary, orphanPages, brokenLinks, stalePages } = health;

  return (
    <div className="font-sans max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/wiki" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Wiki Health Dashboard</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Kiểm tra sức khỏe hệ thống wiki nội bộ</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-muted transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 inline mr-1" />
            Làm mới
          </button>
          <button
            onClick={() => reindex({ workspaceId })}
            disabled={reindexing}
            className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {reindexing ? (
              <><RefreshCw className="w-3.5 h-3.5 inline mr-1 animate-spin" />Đang reindex...</>
            ) : (
              "Bulk Reindex"
            )}
          </button>
        </div>
      </div>

      {reindexResult && (
        <div className="p-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 text-xs text-green-700 dark:text-green-400">
          <CheckCircle2 className="w-4 h-4 inline mr-1" />
          Reindex hoàn tất: {reindexResult.reindexed} trang, {reindexResult.errors} lỗi, {reindexResult.durationMs}ms
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="text-2xl font-bold text-foreground">{summary.totalPages}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Tổng trang</div>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <ScoreColor score={summary.healthScore} />
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Health Score</div>
        </div>
        <div className="p-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.orphanCount}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Trang mồ côi</div>
        </div>
        <div className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.brokenLinkCount}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Link hỏng</div>
        </div>
        <div className="p-4 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{summary.staleCount}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Trang cũ</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <div className="flex border-b border-border">
          {([
            { key: "orphan" as const, label: "Mồ côi", icon: AlertTriangle, count: orphanPages.length },
            { key: "broken" as const, label: "Link hỏng", icon: XCircle, count: brokenLinks.length },
            { key: "stale" as const, label: "Lâu không cập nhật", icon: Clock, count: stalePages.length },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === tab.key
                  ? "bg-muted text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-muted-foreground/10">{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="p-4 max-h-[400px] overflow-y-auto">
          {activeTab === "orphan" && (
            orphanPages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Không có trang mồ côi</p>
            ) : (
              <div className="space-y-1.5">
                {orphanPages.map(p => (
                  <Link key={p.slug} href={`/wiki/${p.slug}`} className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors group">
                    <div>
                      <span className="text-sm font-medium text-foreground group-hover:text-primary">{p.title}</span>
                      <span className="ml-2 text-[10px] text-muted-foreground">/{p.slug}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{p.pageType}</span>
                  </Link>
                ))}
              </div>
            )
          )}

          {activeTab === "broken" && (
            brokenLinks.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Không có link hỏng</p>
            ) : (
              <div className="space-y-1.5">
                {brokenLinks.map((bl, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded hover:bg-muted transition-colors text-sm">
                    <Link href={`/wiki/${bl.fromSlug}`} className="text-primary hover:underline">{bl.fromSlug}</Link>
                    <LinkIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-red-500 line-through">{bl.toSlug}</span>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === "stale" && (
            stalePages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Không có trang cũ</p>
            ) : (
              <div className="space-y-1.5">
                {stalePages.map(p => (
                  <Link key={p.slug} href={`/wiki/${p.slug}`} className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors group">
                    <div>
                      <span className="text-sm font-medium text-foreground group-hover:text-primary">{p.title}</span>
                      <span className="ml-2 text-[10px] text-muted-foreground">/{p.slug}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString("vi-VN") : "N/A"}
                    </span>
                  </Link>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
