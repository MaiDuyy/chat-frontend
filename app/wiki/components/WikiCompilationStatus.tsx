'use client';

import React from 'react';
import { useGetWikiStatsQuery } from '@/src/redux/feature/mrpApi';
import type { WikiStatsDto } from '@/src/redux/feature/mrpApi';
import { Badge } from '@/components/ui/badge';
import {
    BookOpen,
    FileEdit,
    Cpu,
    GitBranch,
    Loader2,
    CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WikiCompilationStatusProps {
    workspaceId: string;
    compact?: boolean;
}

export function WikiCompilationStatus({ workspaceId, compact = false }: WikiCompilationStatusProps) {
    const [pollingInterval, setPollingInterval] = React.useState(0);
    const { data: stats, isLoading } = useGetWikiStatsQuery(
        { workspaceId },
        { pollingInterval }
    );

    React.useEffect(() => {
        if (stats) {
            const shouldPoll = stats.isIndexing || stats.activeCompilations > 0 || stats.finalizingDocs > 0;
            setPollingInterval(shouldPoll ? 5000 : 0);
        }
    }, [stats]);

    if (isLoading || !stats) {
        return compact ? null : (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Đang tải trạng thái...</span>
            </div>
        );
    }

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                {stats.isIndexing && (
                    <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-600 border-blue-200 px-1.5 py-0 animate-pulse gap-1">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        Đang biên soạn
                    </Badge>
                )}
                {stats.pendingDrafts > 0 && (
                    <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-600 border-amber-200 px-1.5 py-0 gap-1">
                        <FileEdit className="w-2.5 h-2.5" />
                        {stats.pendingDrafts} bản thảo
                    </Badge>
                )}
                {!stats.isIndexing && stats.pendingDrafts === 0 && (
                    <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-600 border-emerald-200 px-1.5 py-0 gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Sẵn sàng
                    </Badge>
                )}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatCard
                icon={BookOpen}
                label="Tổng trang Wiki"
                value={stats.totalPages}
                color="text-primary bg-primary/5 border-primary/20"
            />
            <StatCard
                icon={FileEdit}
                label="Bản thảo chờ duyệt"
                value={stats.pendingDrafts}
                color="text-amber-600 bg-amber-50 border-amber-200"
                highlight={stats.pendingDrafts > 0}
            />
            <StatCard
                icon={Cpu}
                label="Đang biên soạn"
                value={stats.activeCompilations}
                color="text-blue-600 bg-blue-50 border-blue-200"
                animate={stats.activeCompilations > 0}
            />
            <StatCard
                icon={GitBranch}
                label="Hậu xử lý"
                value={stats.finalizingDocs}
                color="text-purple-600 bg-purple-50 border-purple-200"
                animate={stats.finalizingDocs > 0}
            />
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color, animate, highlight }: {
    icon: typeof BookOpen;
    label: string;
    value: number;
    color: string;
    animate?: boolean;
    highlight?: boolean;
}) {
    return (
        <div className={cn("flex items-center gap-2.5 p-2.5 rounded-lg border", color)}>
            <Icon className={cn("w-5 h-5 opacity-60 shrink-0", animate && value > 0 && "animate-spin")} />
            <div>
                <p className={cn("text-xl font-bold leading-none", highlight && "text-amber-700")}>{value}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider opacity-60 mt-0.5">{label}</p>
            </div>
        </div>
    );
}
