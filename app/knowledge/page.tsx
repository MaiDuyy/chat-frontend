'use client';

import { useState, useMemo } from 'react';
import { DocumentTable, DocumentUploadModal } from '@/src/features/knowledge';
import { PipelineVisualizer } from '@/src/features/knowledge/PipelineVisualizer';
import { RequirePermission } from '@/src/components/guards';
import { KNOWLEDGE_PERMISSIONS } from '@/src/lib/rbac/permissions';
import { useGetDocumentsQuery } from '@/src/redux/feature/knowledgeApi';
import type { Document } from '@/src/redux/feature/knowledgeApi';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/redux/store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MarkdownEditorModal } from '@/src/features/knowledge/MarkdownEditorModal';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
    Upload,
    FileText,
    Clock,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Database,
    LayoutGrid,
    List,
    Sparkles,
    Eye,
    Layers,
    FileType,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const pipelineStats = [
    { key: 'PENDING', label: 'Chờ xử lý', icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800' },
    { key: 'PROCESSING', label: 'Đang xử lý', icon: Loader2, color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800', animate: true },
    { key: 'COMPLETED', label: 'Hoàn thành', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800' },
    { key: 'FAILED', label: 'Thất bại', icon: AlertCircle, color: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800' },
];

const FILE_TYPE_ICONS: Record<string, { color: string }> = {
    pdf:  { color: 'text-red-500 bg-red-50 border-red-200' },
    docx: { color: 'text-blue-500 bg-blue-50 border-blue-200' },
    txt:  { color: 'text-gray-500 bg-gray-50 border-gray-200' },
    md:   { color: 'text-purple-500 bg-purple-50 border-purple-200' },
    xlsx: { color: 'text-green-500 bg-green-50 border-green-200' },
};

export default function KnowledgePage() {
    const router = useRouter();
    const [uploadOpen, setUploadOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [editorDoc, setEditorDoc] = useState<{ id: number; fileName: string; markdownContent: string } | null>(null);

    const currentWorkspaceId = useSelector((state: RootState) => state.workspace.currentWorkspaceId);
    const { data: docsData } = useGetDocumentsQuery(
        currentWorkspaceId ? { workspaceId: currentWorkspaceId } : undefined
    );

    const docs: Document[] = useMemo(() => {
        if (!docsData) return [];
        if (Array.isArray(docsData)) return docsData;
        if ('content' in docsData) return docsData.content;
        return [];
    }, [docsData]);

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0 };
        docs.forEach(d => {
            if (counts[d.status] !== undefined) counts[d.status]++;
        });
        return counts;
    }, [docs]);

    const recentDocs = useMemo(() => {
        return [...docs]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 6);
    }, [docs]);

    const handleUploadSuccess = (result: { documentId: number; fileName: string; markdownContent?: string }) => {
        if (result.markdownContent) {
            setEditorDoc({
                id: result.documentId,
                fileName: result.fileName,
                markdownContent: result.markdownContent,
            });
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const statusConfig: Record<string, { label: string; className: string }> = {
        PENDING: { label: 'Chờ xử lý', className: 'bg-amber-50 text-amber-700 border-amber-200' },
        PREVIEW: { label: 'Chờ duyệt', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        PROCESSING: { label: 'Đang xử lý', className: 'bg-blue-50 text-blue-700 border-blue-200' },
        COMPLETED: { label: 'Hoàn thành', className: 'bg-green-50 text-green-700 border-green-200' },
        FAILED: { label: 'Thất bại', className: 'bg-red-50 text-red-700 border-red-200' },
    };

    return (
        <RequirePermission permission={KNOWLEDGE_PERMISSIONS.READ}>
            <div className="w-full p-4 md:p-6 space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Database className="w-5 h-5 text-primary" />
                            Cơ sở dữ liệu tri thức
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Quản lý pipeline tài liệu — từ tải lên đến phân đoạn RAG và biên dịch Wiki
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* View Toggle */}
                        <div className="flex bg-muted p-0.5 rounded-md border border-border">
                            <button
                                onClick={() => setViewMode('table')}
                                className={cn(
                                    "p-1.5 rounded-md transition-all",
                                    viewMode === 'table' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <List className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setViewMode('cards')}
                                className={cn(
                                    "p-1.5 rounded-md transition-all",
                                    viewMode === 'cards' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-1.5 text-xs">
                            <Upload className="w-3.5 h-3.5" />
                            Tải lên tài liệu
                        </Button>
                    </div>
                </div>

                {/* Pipeline Status Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {pipelineStats.map(stat => {
                        const Icon = stat.icon;
                        const count = statusCounts[stat.key] || 0;
                        return (
                            <Card key={stat.key} className={cn("p-3 border shadow-none", stat.color)}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{stat.label}</p>
                                        <p className="text-2xl font-bold mt-0.5">{count}</p>
                                    </div>
                                    <Icon className={cn("w-8 h-8 opacity-30", 'animate' in stat && stat.animate && count > 0 && "animate-spin")} />
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {/* Content View */}
                {viewMode === 'table' ? (
                    <DocumentTable />
                ) : (
                    /* WeKnora-style Document Card Grid */
                    <div className="space-y-4">
                        {recentDocs.length > 0 && (
                            <>
                                <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Tài liệu gần đây ({docs.length} tổng cộng)
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {recentDocs.map(doc => {
                                        const ext = doc.documentType?.toLowerCase() || 'txt';
                                        const fileConfig = FILE_TYPE_ICONS[ext] || FILE_TYPE_ICONS.txt;
                                        const status = statusConfig[doc.status] || statusConfig.PENDING;

                                        return (
                                            <Card
                                                key={doc.id}
                                                className="p-4 border shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-primary/20"
                                                onClick={() => router.push(`/knowledge/${doc.id}`)}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={cn("p-2 rounded-lg border shrink-0", fileConfig.color)}>
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                                            {doc.fileName}
                                                        </h3>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Badge variant="outline" className={cn("text-[8px] px-1.5 py-0 border", status.className)}>
                                                                {status.label}
                                                            </Badge>
                                                            <span className="text-[9px] text-muted-foreground font-mono uppercase">{ext}</span>
                                                            <span className="text-[9px] text-muted-foreground">{formatSize(doc.fileSize)}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Summary */}
                                                {doc.summary && (
                                                    <p className="text-[10px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                                                        {doc.summary}
                                                    </p>
                                                )}

                                                {/* Pipeline compact */}
                                                <div className="mt-3">
                                                    <PipelineVisualizer document={doc} compact />
                                                </div>

                                                {/* Footer */}
                                                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border text-[9px] text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {format(new Date(doc.createdAt), 'dd/MM/yyyy HH:mm')}
                                                    </span>
                                                    {doc.chunkCount > 0 && (
                                                        <span className="flex items-center gap-1">
                                                            <Layers className="w-3 h-3" />
                                                            {doc.chunkCount} đoạn
                                                        </span>
                                                    )}
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Upload Modal */}
                <DocumentUploadModal
                    isOpen={uploadOpen}
                    onClose={() => setUploadOpen(false)}
                    onSuccess={handleUploadSuccess}
                    defaultWorkspaceId={currentWorkspaceId || undefined}
                />

                {/* Markdown Editor for preview mode */}
                {editorDoc && (
                    <MarkdownEditorModal
                        isOpen={!!editorDoc}
                        onClose={() => setEditorDoc(null)}
                        document={{
                            id: editorDoc.id,
                            fileName: editorDoc.fileName,
                            status: 'PREVIEW',
                            markdownContent: editorDoc.markdownContent,
                        } as Document}
                    />
                )}
            </div>
        </RequirePermission>
    );
}
