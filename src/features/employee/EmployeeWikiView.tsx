"use client";

import React from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { RootState } from "@/src/redux/store";
import { Search, BookOpen, Compass, FileText, Plus, Network } from "lucide-react";
import { useGetWikiPagesMetadataQuery } from "@/src/redux/feature/mrpApi";
import { WikiCompilationStatus } from "@/app/wiki/components/WikiCompilationStatus";
import { WikiSearchDialog } from "@/app/wiki/components/WikiSearchDialog";
import { WikiBrowser } from "@/app/wiki/components/WikiBrowser";
import { WikiAIChatPanel, WikiAIChatButton } from "@/app/wiki/components/WikiAIChatPanel";
import { getPageType } from "@/app/wiki/components/WikilinkAutocomplete";

export function EmployeeWikiView() {
  const currentWorkspaceId = useSelector(
    (state: RootState) => state.workspace.currentWorkspaceId
  );
  const workspaceId = currentWorkspaceId || "default-workspace";

  const [showAIChat, setShowAIChat] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);

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

  return (
    <div className="font-sans flex flex-col w-full h-full overflow-hidden text-foreground">
      {/* Top header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border px-4 py-3 gap-3 shrink-0 bg-card/50 backdrop-blur-sm">
        <div>
          <h1 className="text-base font-display font-semibold text-foreground leading-tight flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary shrink-0" />
            Cơ sở tri thức Wiki
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Khám phá, đọc và đóng góp tri thức nội bộ.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <WikiAIChatButton onClick={() => setShowAIChat((v) => !v)} hasMessages={false} />
          <button
            onClick={() => setSearchOpen(true)}
            className="px-2.5 py-1.5 text-xs font-semibold border border-border bg-card hover:bg-muted/50 text-foreground transition-all rounded-md shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            Tìm nhanh (Ctrl+K)
          </button>
          <Link
            href="/wiki/graph"
            className="px-2.5 py-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all rounded-md shadow-sm flex items-center gap-1.5"
          >
            <Network className="w-3.5 h-3.5" />
            Đồ thị
          </Link>
          <Link
            href="/wiki/new"
            className="px-2.5 py-1.5 text-xs font-semibold border border-border bg-card hover:bg-muted/50 text-foreground transition-all rounded-md shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Bản thảo
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/20 shrink-0 overflow-x-auto">
        {([
          { label: "Tổng", val: stats.total, color: "text-foreground" },
          { label: "Khái niệm", val: stats.concepts, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Thực thể", val: stats.entities, color: "text-sky-600 dark:text-sky-400" },
          { label: "Chủ đề", val: stats.topics, color: "text-amber-600 dark:text-amber-400" },
          { label: "Nguồn tin", val: stats.sources, color: "text-rose-600 dark:text-rose-400" },
        ]).map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5 shrink-0 select-none">
            {idx > 0 && <span className="text-border text-sm">·</span>}
            <span className="text-[10px] text-muted-foreground">{item.label}</span>
            <span className={`text-xs font-bold font-mono ${item.color}`}>{item.val}</span>
          </div>
        ))}
        <div className="ml-auto shrink-0">
          <WikiCompilationStatus workspaceId={workspaceId} compact />
        </div>
      </div>

      {/* Wiki Browser — two-panel layout */}
      <div className="flex-1 min-h-0 p-3">
        <WikiBrowser workspaceId={workspaceId} />
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
