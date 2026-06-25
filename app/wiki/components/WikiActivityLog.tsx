'use client';

import React from 'react';
import Link from 'next/link';
import { useGetWikiActivityQuery } from '@/src/redux/feature/mrpApi';
import type { WikiActivityEntry } from '@/src/redux/feature/mrpApi';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    FileText,
    FilePlus,
    FileEdit,
    FileCheck,
    FileX,
    MessageSquare,
    Clock,
    Activity,
    Loader2,
    HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const ACTION_CONFIG: Record<string, { icon: typeof FileText; label: string; color: string }> = {
    PAGE_CREATED:       { icon: FilePlus,   label: 'Trang mới',        color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    PAGE_UPDATED:       { icon: FileEdit,   label: 'Cập nhật',         color: 'text-blue-600 bg-blue-50 border-blue-200' },
    DRAFT_PENDING:      { icon: Clock,      label: 'Bản thảo mới',     color: 'text-amber-600 bg-amber-50 border-amber-200' },
    DRAFT_APPROVED:     { icon: FileCheck,  label: 'Đã duyệt',        color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    DRAFT_REJECTED:     { icon: FileX,      label: 'Từ chối',         color: 'text-red-600 bg-red-50 border-red-200' },
    DRAFT_NEEDS_REVISION: { icon: MessageSquare, label: 'Yêu cầu sửa', color: 'text-orange-600 bg-orange-50 border-orange-200' },
    DRAFT_WITHDRAWN:    { icon: FileX,      label: 'Rút lại',         color: 'text-gray-600 bg-gray-50 border-gray-200' },
};

interface WikiActivityLogProps {
    workspaceId: string;
    limit?: number;
    className?: string;
}

export function WikiActivityLog({ workspaceId, limit = 15, className }: WikiActivityLogProps) {
    const { data: activities, isLoading } = useGetWikiActivityQuery(
        { workspaceId, limit }
    );

    if (isLoading) {
        return (
            <div className={cn("border border-border bg-card rounded-lg p-3 shadow-md", className)}>
                <div className="flex items-center gap-2 border-b pb-2 mb-3">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground">Nhật ký hoạt động</span>
                </div>
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span className="text-xs">Đang tải...</span>
                </div>
            </div>
        );
    }

    if (!activities || activities.length === 0) {
        return (
            <div className={cn("border border-border bg-card rounded-lg p-3 shadow-md", className)}>
                <div className="flex items-center gap-2 border-b pb-2 mb-3">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground">Nhật ký hoạt động</span>
                </div>
                <div className="flex flex-col items-center justify-center py-6 text-center">
                    <HelpCircle className="w-6 h-6 text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground">Chưa có hoạt động nào</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("border border-border bg-card rounded-lg p-3 shadow-md", className)}>
            <div className="flex items-center gap-2 border-b pb-2 mb-2">
                <Activity className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground">
                    Nhật ký hoạt động
                </span>
                <span className="text-[9px] font-mono text-muted-foreground ml-auto bg-muted px-1.5 py-0.5 rounded border border-border">
                    {activities.length} mục
                </span>
            </div>

            <ScrollArea className="max-h-[360px]">
                <div className="flex flex-col gap-0.5">
                    {activities.map((entry, idx) => (
                        <ActivityItem key={`${entry.action}-${entry.timestamp}-${idx}`} entry={entry} />
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}

function ActivityItem({ entry }: { entry: WikiActivityEntry }) {
    const config = ACTION_CONFIG[entry.action] || ACTION_CONFIG.PAGE_UPDATED;
    const Icon = config.icon;

    const timeAgo = React.useMemo(() => {
        try {
            return formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true, locale: vi });
        } catch {
            return entry.timestamp;
        }
    }, [entry.timestamp]);

    const href = entry.slug ? `/wiki/${entry.slug}` : undefined;

    return (
        <div className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors group">
            <div className={cn("w-6 h-6 rounded-md flex items-center justify-center border shrink-0 mt-0.5", config.color)}>
                <Icon className="w-3 h-3" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className={cn("text-[8px] px-1 py-0 font-bold border", config.color)}>
                        {config.label}
                    </Badge>
                    {entry.version && (
                        <span className="text-[8px] font-mono text-muted-foreground">V.{entry.version}</span>
                    )}
                </div>
                <div className="mt-0.5">
                    {href ? (
                        <Link href={href} className="text-[11px] font-semibold text-foreground hover:text-primary transition-colors line-clamp-1">
                            {entry.title}
                        </Link>
                    ) : (
                        <span className="text-[11px] font-semibold text-foreground line-clamp-1">{entry.title}</span>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> {timeAgo}
                    </span>
                    {entry.authorId && (
                        <span className="text-[9px] text-muted-foreground truncate max-w-[100px]">
                            bởi {entry.authorId}
                        </span>
                    )}
                </div>
                {entry.reviewerNote && (
                    <p className="text-[9px] text-muted-foreground mt-0.5 italic line-clamp-1">
                        &ldquo;{entry.reviewerNote}&rdquo;
                    </p>
                )}
            </div>
        </div>
    );
}
