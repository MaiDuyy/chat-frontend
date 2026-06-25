'use client';

import React from 'react';
import type { Document } from '@/src/redux/feature/knowledgeApi';
import { Badge } from '@/components/ui/badge';
import {
    Upload,
    FileText,
    Cpu,
    Sparkles,
    Layers,
    Database,
    BookOpen,
    CheckCircle2,
    Loader2,
    Clock,
    AlertCircle,
    ChevronRight,
    MessageSquareQuote,
    GitBranch,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PipelineStage {
    key: string;
    label: string;
    icon: typeof FileText;
    description: string;
}

const PIPELINE_STAGES: PipelineStage[] = [
    { key: 'upload',    label: 'Tải lên',       icon: Upload,             description: 'Tệp gốc được tải lên hệ thống' },
    { key: 'parse',     label: 'Trích xuất',    icon: Cpu,                description: 'Parser chuyển đổi sang Markdown' },
    { key: 'chunk',     label: 'Phân đoạn',     icon: Layers,             description: 'Chia nhỏ thành các đoạn ngữ nghĩa' },
    { key: 'embed',     label: 'Vector hóa',    icon: Database,           description: 'Tạo embedding + keyword index' },
    { key: 'postproc',  label: 'Hậu xử lý',     icon: Sparkles,           description: 'Tóm tắt AI, Q&A, trích xuất tri thức' },
    { key: 'wiki',      label: 'Wiki',          icon: BookOpen,           description: 'Biên dịch trang Wiki từ nội dung' },
];

function getActiveStageIndex(doc: Document): number {
    switch (doc.status) {
        case 'PENDING': return 0;
        case 'PREVIEW': return 1;
        case 'PROCESSING': {
            if (doc.processingStage === 'FINALIZING') return 4;
            if (doc.chunkCount && doc.chunkCount > 0) return 3;
            return 2;
        }
        case 'COMPLETED': return 6;
        case 'FAILED': return -1;
        default: return 0;
    }
}

function getStageStatus(stageIdx: number, activeIdx: number, isFailed: boolean): 'completed' | 'active' | 'pending' | 'failed' {
    if (isFailed && stageIdx >= activeIdx) return 'failed';
    if (stageIdx < activeIdx) return 'completed';
    if (stageIdx === activeIdx) return 'active';
    return 'pending';
}

const statusStyles = {
    completed: {
        ring: 'ring-emerald-500/30 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800',
        icon: 'text-emerald-600 dark:text-emerald-400',
        label: 'text-emerald-700 dark:text-emerald-300',
        connector: 'bg-emerald-400',
    },
    active: {
        ring: 'ring-2 ring-blue-500/40 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800 shadow-sm',
        icon: 'text-blue-600 dark:text-blue-400 animate-pulse',
        label: 'text-blue-700 dark:text-blue-300 font-bold',
        connector: 'bg-blue-300 animate-pulse',
    },
    pending: {
        ring: 'bg-muted/50 border-border',
        icon: 'text-muted-foreground/40',
        label: 'text-muted-foreground/60',
        connector: 'bg-border',
    },
    failed: {
        ring: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800',
        icon: 'text-red-500',
        label: 'text-red-600',
        connector: 'bg-red-300',
    },
};

interface PipelineVisualizerProps {
    document: Document;
    compact?: boolean;
    vertical?: boolean;
    className?: string;
}

export function PipelineVisualizer({ document: doc, compact = false, vertical = false, className }: PipelineVisualizerProps) {
    const activeIdx = getActiveStageIndex(doc);
    const isFailed = doc.status === 'FAILED';

    if (compact) {
        return (
            <div className={cn("flex items-center gap-1", className)}>
                {PIPELINE_STAGES.map((stage, idx) => {
                    const status = getStageStatus(idx, activeIdx, isFailed);
                    const styles = statusStyles[status];
                    const Icon = status === 'completed' ? CheckCircle2 : status === 'failed' ? AlertCircle : stage.icon;
                    return (
                        <React.Fragment key={stage.key}>
                            <div className={cn("w-5 h-5 rounded-full flex items-center justify-center border", styles.ring)} title={stage.label}>
                                <Icon className={cn("w-2.5 h-2.5", styles.icon)} />
                            </div>
                            {idx < PIPELINE_STAGES.length - 1 && (
                                <div className={cn("w-3 h-0.5 rounded-full", styles.connector)} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        );
    }

    if (vertical) {
        return (
            <div className={cn("space-y-3", className)}>
                <div className="flex items-center gap-2">
                    <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Pipeline xử lý tài liệu
                    </h3>
                    {doc.processingStage === 'FINALIZING' && doc.pendingSubtasks != null && (
                        <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-600 border-amber-200 px-1.5 py-0 animate-pulse">
                            <Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" />
                            {doc.pendingSubtasks} tác vụ còn lại
                        </Badge>
                    )}
                </div>

                <div className="flex flex-col gap-0">
                    {PIPELINE_STAGES.map((stage, idx) => {
                        const status = getStageStatus(idx, activeIdx, isFailed);
                        const styles = statusStyles[status];
                        const Icon = status === 'completed' ? CheckCircle2
                            : status === 'active' ? Loader2
                            : status === 'failed' ? AlertCircle
                            : stage.icon;

                        const stageDetails: Record<string, string> = {};
                        if (status === 'completed' || status === 'active') {
                            if (stage.key === 'parse') stageDetails.info = `Parser: ${doc.parserMethod || 'gemini'}`;
                            if (stage.key === 'chunk' && doc.chunkCount) stageDetails.info = `${doc.chunkCount} đoạn được tạo`;
                            if (stage.key === 'embed' && doc.chunkCount) stageDetails.info = `Vector 768-dim + Keyword index`;
                            if (stage.key === 'postproc' && doc.pendingSubtasks != null) stageDetails.info = `${doc.pendingSubtasks} tác vụ đang chờ`;
                            if (stage.key === 'wiki') stageDetails.info = `MRP Pipeline (Map → Reduce → Refine)`;
                        }

                        return (
                            <div key={stage.key} className="flex items-stretch gap-3">
                                <div className="flex flex-col items-center">
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center border transition-all shrink-0",
                                        styles.ring
                                    )}>
                                        <Icon className={cn("w-4 h-4", styles.icon)} />
                                    </div>
                                    {idx < PIPELINE_STAGES.length - 1 && (
                                        <div className={cn("w-0.5 flex-1 min-h-[24px] transition-all", styles.connector)} />
                                    )}
                                </div>
                                <div className="pb-4 min-w-0">
                                    <p className={cn("text-xs font-semibold leading-tight", styles.label)}>
                                        {stage.label}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/60 leading-tight mt-0.5">
                                        {stage.description}
                                    </p>
                                    {stageDetails.info && (
                                        <p className={cn("text-[10px] font-medium mt-1 px-2 py-0.5 rounded-md border w-fit", styles.ring)}>
                                            {stageDetails.info}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {doc.status === 'COMPLETED' && doc.summary && (
                    <div className="bg-muted/30 rounded-lg p-3 border border-border">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                            <MessageSquareQuote className="w-3 h-3" /> Tóm tắt AI
                        </p>
                        <p className="text-[11px] text-foreground leading-relaxed">{doc.summary}</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={cn("space-y-3", className)}>
            <div className="flex items-center gap-2">
                <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Pipeline xử lý tài liệu
                </h3>
                {doc.processingStage === 'FINALIZING' && doc.pendingSubtasks != null && (
                    <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-600 border-amber-200 px-1.5 py-0 animate-pulse">
                        <Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" />
                        {doc.pendingSubtasks} tác vụ còn lại
                    </Badge>
                )}
            </div>

            <div className="flex items-start gap-0">
                {PIPELINE_STAGES.map((stage, idx) => {
                    const status = getStageStatus(idx, activeIdx, isFailed);
                    const styles = statusStyles[status];
                    const Icon = status === 'completed' ? CheckCircle2
                        : status === 'active' ? Loader2
                        : status === 'failed' ? AlertCircle
                        : stage.icon;

                    return (
                        <React.Fragment key={stage.key}>
                            <div className="flex flex-col items-center gap-1.5 min-w-[72px]">
                                <div className={cn(
                                    "w-9 h-9 rounded-lg flex items-center justify-center border transition-all",
                                    styles.ring
                                )}>
                                    <Icon className={cn("w-4 h-4", styles.icon)} />
                                </div>
                                <div className="text-center">
                                    <p className={cn("text-[10px] font-semibold leading-tight", styles.label)}>
                                        {stage.label}
                                    </p>
                                    <p className="text-[8px] text-muted-foreground/50 leading-tight mt-0.5 max-w-[70px]">
                                        {stage.description}
                                    </p>
                                </div>
                            </div>
                            {idx < PIPELINE_STAGES.length - 1 && (
                                <div className="flex items-center pt-4">
                                    <div className={cn("w-4 h-0.5 rounded-full transition-all", styles.connector)} />
                                    <ChevronRight className={cn("w-3 h-3 -mx-0.5", styles.icon)} />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Stats Row */}
            {doc.status === 'COMPLETED' && (
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1 border-t border-border">
                    <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" /> {doc.chunkCount} đoạn
                    </span>
                    {doc.summary && (
                        <span className="flex items-center gap-1 truncate max-w-[300px]" title={doc.summary}>
                            <MessageSquareQuote className="w-3 h-3 shrink-0" /> {doc.summary}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
