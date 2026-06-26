'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGetConversationsQuery, useCreateConversationMutation, useDeleteConversationMutation } from '@/src/redux/feature/aiApi';
import { AIChatWindow } from '@/src/features/ai';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare, Loader2, Trash2, Search, BookOpen, Cpu, Zap, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatTitle = (title: string) => {
    if (!title) return '';
    let clean = title;
    if (clean.startsWith('{')) {
        try {
            const parsed = JSON.parse(clean);
            clean = parsed.summary || clean;
        } catch { /* skip */ }
    }
    const lower = clean.toLowerCase();
    if (lower.includes('summary:')) {
        const start = lower.indexOf('summary:') + 8;
        let end = lower.indexOf('details:');
        if (end === -1) end = lower.indexOf(', details:');
        if (end === -1) end = clean.length;
        if (end > start) clean = clean.substring(start, end);
    }
    return clean.replace(/[{}"\\[\]]|summary:|details:|sources:/g, '').trim().replace(/,$/, '').trim();
};

function groupConversationsByDate(conversations: any[]) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - 6 * 86400000;

    const groups: { label: string; items: any[] }[] = [
        { label: 'Hôm nay', items: [] },
        { label: 'Hôm qua', items: [] },
        { label: 'Tuần này', items: [] },
        { label: 'Cũ hơn', items: [] },
    ];

    for (const conv of conversations) {
        const t = new Date(conv.createdAt).getTime();
        if (t >= todayStart) groups[0].items.push(conv);
        else if (t >= yesterdayStart) groups[1].items.push(conv);
        else if (t >= weekStart) groups[2].items.push(conv);
        else groups[3].items.push(conv);
    }

    return groups.filter(g => g.items.length > 0);
}

const CAPABILITIES = [
    {
        icon: BookOpen,
        title: 'Tìm kiếm tài liệu',
        desc: 'Tra cứu chính sách, quy trình và hướng dẫn nội bộ',
        example: 'Chính sách nghỉ phép năm 2025 là gì?',
        color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400',
    },
    {
        icon: Brain,
        title: 'Tóm tắt nội dung',
        desc: 'Tóm gọn tài liệu dài hoặc báo cáo phức tạp',
        example: 'Tóm tắt các điểm chính của dự án Q3',
        color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400',
    },
    {
        icon: Cpu,
        title: 'Hỗ trợ kỹ thuật',
        desc: 'Giải thích kiến trúc hệ thống và tài liệu kỹ thuật',
        example: 'Giải thích luồng xác thực JWT trong hệ thống',
        color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-400',
    },
    {
        icon: Zap,
        title: 'Agent thông minh',
        desc: 'Thực thi tác vụ phức tạp với Tool Calling',
        example: 'Tóm tắt các tin nhắn chưa đọc hôm nay',
        color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400',
    },
];

const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 340;
const SIDEBAR_DEFAULT = 256;

export default function AIPage() {
    const { data: conversations, isLoading } = useGetConversationsQuery();
    const [createConversation, { isLoading: isCreating }] = useCreateConversationMutation();
    const [deleteConversation] = useDeleteConversationMutation();

    const [activeConvId, setActiveConvId] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const filteredConversations = useMemo(() => {
        if (!conversations) return [];
        if (!search.trim()) return conversations;
        const q = search.toLowerCase();
        return conversations.filter((c: any) => formatTitle(c.title).toLowerCase().includes(q));
    }, [conversations, search]);

    const groups = useMemo(() => groupConversationsByDate(filteredConversations), [filteredConversations]);

    const handleCreate = async () => {
        try {
            const newConv = await createConversation({ title: 'Cuộc hội thoại mới', chatId: 'standalone' }).unwrap();
            setActiveConvId(newConv.id);
        } catch (error) {
            console.error('Failed to create conversation', error);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        try {
            await deleteConversation(id).unwrap();
            if (activeConvId === id) setActiveConvId(null);
        } catch (error) {
            console.error('Failed to delete conversation', error);
        }
    };

    const handleCapabilityClick = async (example: string) => {
        try {
            const newConv = await createConversation({ title: 'Cuộc hội thoại mới', chatId: 'standalone' }).unwrap();
            sessionStorage.setItem(`ai_prefill_${newConv.id}`, example);
            setActiveConvId(newConv.id);
        } catch (error) {
            console.error('Failed to create conversation', error);
        }
    };

    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => setIsResizing(false), []);

    const resize = useCallback((e: MouseEvent) => {
        if (isResizing && containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const newWidth = e.clientX - containerRect.left;
            if (newWidth >= SIDEBAR_MIN && newWidth <= SIDEBAR_MAX) {
                setSidebarWidth(newWidth);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
        } else {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        }
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing, resize, stopResizing]);

    return (
        <div
            ref={containerRef}
            className={cn(
                'h-[calc(100vh-4rem)] flex min-w-0 overflow-hidden bg-background relative',
                isResizing && 'select-none cursor-col-resize'
            )}
        >
            {/* Sidebar */}
            <aside
                className="border-r border-border bg-card flex flex-col min-w-0 shrink-0 relative"
                style={{ width: `${sidebarWidth}px` }}
            >
                <div className="px-3 pt-3 pb-2 border-b border-border shrink-0 space-y-2">
                    <Button
                        onClick={handleCreate}
                        disabled={isCreating}
                        size="sm"
                        className="w-full h-8 gap-1.5 text-xs font-semibold rounded-md bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                        {isCreating
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Plus className="w-3.5 h-3.5" />
                        }
                        Cuộc trò chuyện mới
                    </Button>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Tìm kiếm..."
                            className={cn(
                                'w-full h-7 pl-7 pr-2.5 text-[11px] rounded-md',
                                'bg-background border border-border',
                                'placeholder:text-muted-foreground text-foreground',
                                'focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/60',
                                'transition-colors duration-150'
                            )}
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1 min-h-0">
                    <div className="px-2 py-2 space-y-4">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-[11px]">Đang tải...</span>
                            </div>
                        ) : groups.length === 0 ? (
                            <div className="py-8 px-3 text-center">
                                <MessageSquare className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    {search ? 'Không tìm thấy kết quả.' : 'Chưa có cuộc trò chuyện nào.'}
                                </p>
                            </div>
                        ) : (
                            groups.map((group) => (
                                <div key={group.label}>
                                    <div className="px-2 pb-1 text-[9px] font-bold text-muted-foreground uppercase tracking-[0.15em] select-none">
                                        {group.label}
                                    </div>
                                    <ul className="space-y-px">
                                        {group.items.map((conv: any) => {
                                            const isActive = activeConvId === conv.id;
                                            const title = formatTitle(conv.title) || 'Cuộc trò chuyện';
                                            return (
                                                <li key={conv.id}>
                                                    <button
                                                        onClick={() => setActiveConvId(conv.id)}
                                                        title={title}
                                                        className={cn(
                                                            'w-full flex items-center justify-between pl-2 pr-1 py-1.5 rounded-md text-left',
                                                            'transition-colors duration-100 cursor-pointer group',
                                                            isActive
                                                                ? 'bg-primary/10 text-primary'
                                                                : 'text-foreground hover:bg-muted'
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                                                            <MessageSquare className={cn(
                                                                'w-3.5 h-3.5 shrink-0 transition-colors',
                                                                isActive ? 'text-primary' : 'text-muted-foreground'
                                                            )} />
                                                            <span className={cn(
                                                                'truncate text-[12px] font-medium leading-none',
                                                                isActive ? 'text-primary' : 'text-foreground'
                                                            )}>
                                                                {title}
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className={cn(
                                                                'h-5 w-5 flex items-center justify-center rounded shrink-0 ml-1',
                                                                'opacity-0 group-hover:opacity-100 transition-opacity duration-100',
                                                                'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                                                            )}
                                                            onClick={(e) => handleDelete(e, conv.id)}
                                                            aria-label="Xóa cuộc trò chuyện"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>

                <div
                    className={cn(
                        'absolute top-0 right-0 w-0.5 h-full z-30 cursor-col-resize',
                        'hover:bg-primary/40 transition-colors duration-150',
                        isResizing && 'bg-primary/60'
                    )}
                    onMouseDown={startResizing}
                />
            </aside>

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-background relative overflow-hidden">
                {activeConvId ? (
                    <AIChatWindow conversationId={activeConvId} />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 animate-in fade-in duration-500">
                        <div className="w-full max-w-2xl space-y-8">
                            {/* Hero */}
                            <div className="text-center space-y-3">
                                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-2">
                                    <Brain className="w-7 h-7 text-primary" />
                                </div>
                                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                                    Trợ lý AI Tri thức Nội bộ
                                </h1>
                                <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                                    Hỏi bất kỳ điều gì về tài liệu, quy trình và kiến thức của tổ chức.
                                    AI tìm kiếm và tổng hợp câu trả lời từ kho tri thức nội bộ với độ tin cậy được đánh giá tự động.
                                </p>
                            </div>

                            {/* Capability cards */}
                            <div className="grid grid-cols-2 gap-3">
                                {CAPABILITIES.map((cap) => {
                                    const Icon = cap.icon;
                                    return (
                                        <button
                                            key={cap.title}
                                            onClick={() => handleCapabilityClick(cap.example)}
                                            disabled={isCreating}
                                            className={cn(
                                                'group flex flex-col items-start gap-3 p-4 rounded-lg border border-border bg-card text-left',
                                                'hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm',
                                                'transition-all duration-200 cursor-pointer',
                                                'disabled:opacity-50 disabled:cursor-not-allowed'
                                            )}
                                        >
                                            <div className={cn('w-8 h-8 rounded-md flex items-center justify-center', cap.color)}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[13px] font-semibold text-foreground tracking-tight">
                                                    {cap.title}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                    {cap.desc}
                                                </p>
                                            </div>
                                            <div className={cn(
                                                'flex items-center gap-1.5 px-2 py-1 rounded-md w-full mt-auto',
                                                'bg-muted/60 text-muted-foreground',
                                                'group-hover:bg-primary/5 group-hover:text-foreground',
                                                'transition-colors duration-150'
                                            )}>
                                                <Search className="w-3 h-3 shrink-0" />
                                                <span className="truncate text-[10px] italic">&ldquo;{cap.example}&rdquo;</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="text-center">
                                <Button
                                    onClick={handleCreate}
                                    disabled={isCreating}
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-5 text-xs font-semibold rounded-md gap-1.5"
                                >
                                    {isCreating
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : <Plus className="w-3.5 h-3.5" />
                                    }
                                    Bắt đầu trò chuyện trống
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
