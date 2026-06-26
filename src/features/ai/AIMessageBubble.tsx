'use client';

import { cn } from '@/lib/utils';
import { Bot, User, Bookmark, Copy, Check, AlertCircle, Zap, ShieldCheck, ShieldAlert, Shield, MessageSquarePlus, Wrench } from 'lucide-react';
import { CitationList } from './CitationList';
import { Button } from '@/components/ui/button';
import type { Citation } from '@/src/redux/feature/aiApi';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AIMessageBubbleProps {
    role: 'user' | 'assistant';
    content: string;
    citations?: Citation[];
    isStreaming?: boolean;
    timestamp?: string;
    onCitationClick?: (citation: Citation) => void;
    onFollowUpClick?: (question: string) => void;
    onSave?: () => void;
    className?: string;
    mode?: 'agent' | 'rag';
    error?: boolean;
}

function renderWikiLinks(text: string) {
    const parts = text.split(/\[\[([^\]]+)\]\]/g);
    return parts.map((part, i) => {
        if (i % 2 === 1) {
            const [, display] = part.split('|');
            return (
                <span key={i} className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-medium">
                    {display ?? part}
                </span>
            );
        }
        return <span key={i}>{part}</span>;
    });
}

function parseAIResponse(content: string) {
    try {
        const jsonStart = content.indexOf('{');
        if (jsonStart === -1) return null;
        const jsonEnd = content.lastIndexOf('}') + 1;
        if (jsonEnd <= jsonStart) return null;
        return JSON.parse(content.slice(jsonStart, jsonEnd));
    } catch {
        return null;
    }
}

const TOOL_LABELS: Record<string, string> = {
    searchKnowledge: 'RAG Search',
    search_wiki: 'Wiki Search',
    read_wiki_page: 'Wiki Read',
    list_wiki_pages: 'Wiki List',
    create_wiki_page: 'Wiki Create',
    edit_wiki_page: 'Wiki Edit',
    summarizeChat: 'Summarize',
    getChatInfo: 'Chat Info',
    searchMessages: 'Msg Search',
    getPinnedMessages: 'Pinned Msgs',
    togglePinMessage: 'Pin Toggle',
    createTask: 'Create Task',
    listTasks: 'List Tasks',
    updateTaskStatus: 'Task Update',
    createPoll: 'Create Poll',
};

function ToolBadges({ tools }: { tools: string[] }) {
    if (!tools?.length) return null;
    return (
        <div className="flex flex-wrap gap-1 items-center">
            <Wrench className="w-3 h-3 text-muted-foreground shrink-0" />
            {tools.map((tool) => (
                <span
                    key={tool}
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted border border-border text-muted-foreground"
                >
                    {TOOL_LABELS[tool] ?? tool}
                </span>
            ))}
        </div>
    );
}

function ConfidenceBadge({ level, score }: { level: string; score?: number }) {
    if (!level || level === 'NONE') return null;
    const cfg = {
        HIGH:   { icon: ShieldCheck,  cls: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40', label: 'Độ tin cậy cao' },
        MEDIUM: { icon: Shield,       cls: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40',     label: 'Độ tin cậy trung bình' },
        LOW:    { icon: ShieldAlert,  cls: 'text-rose-500 bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40',           label: 'Độ tin cậy thấp' },
    }[level as 'HIGH' | 'MEDIUM' | 'LOW'];
    if (!cfg) return null;
    const Icon = cfg.icon;
    return (
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold', cfg.cls)}>
            <Icon className="w-3 h-3" />
            {cfg.label}
            {score !== undefined && <span className="opacity-60 ml-0.5">({Math.round(score * 100)}%)</span>}
        </span>
    );
}

export function AIMessageBubble({
    role,
    content,
    citations = [],
    isStreaming = false,
    timestamp,
    onCitationClick,
    onFollowUpClick,
    onSave,
    className,
    mode,
    error,
}: AIMessageBubbleProps) {
    const [copied, setCopied] = useState(false);
    const isAssistant = role === 'assistant';
    const parsed = isAssistant ? parseAIResponse(content) : null;

    const handleCopy = async () => {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const hasInsufficientSources =
        content.toLowerCase().includes('insufficient') ||
        (isAssistant && citations.length === 0 && !isStreaming && content.length > 0);

    return (
        <div
            className={cn(
                'group flex gap-3 w-full py-3 transition-colors duration-200',
                isAssistant ? 'flex-row' : 'flex-row-reverse',
                isAssistant ? 'hover:bg-muted/30 rounded-lg px-2' : 'px-2',
                className
            )}
        >
            {/* Avatar */}
            <div className="flex-shrink-0 flex flex-col items-center">
                <div
                    className={cn(
                        'w-8 h-8 rounded-md flex items-center justify-center shadow-sm',
                        'transition-colors duration-150',
                        isAssistant
                            ? mode === 'agent'
                                ? 'bg-amber-500 text-white'
                                : 'bg-primary text-primary-foreground'
                            : 'bg-card border border-border text-muted-foreground'
                    )}
                >
                    {isAssistant ? (
                        mode === 'agent' ? <Zap className="w-4 h-4 fill-current" /> : <Bot className="w-4 h-4" />
                    ) : (
                        <User className="w-4 h-4" />
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div
                className={cn(
                    'flex-1 flex flex-col min-w-0 max-w-[90%]',
                    isAssistant ? 'items-start' : 'items-end'
                )}
            >
                {/* Name + timestamp row */}
                <div className="flex items-center gap-2 mb-1.5 px-1">
                    {isAssistant ? (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground tracking-tight">
                                {mode === 'agent' ? 'AI Agent' : 'Trợ lý NEXUS'}
                            </span>
                            {mode && (
                                <span
                                    className={cn(
                                        'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                                        mode === 'agent'
                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                            : 'bg-primary/10 text-primary'
                                    )}
                                >
                                    {mode}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-xs font-semibold text-foreground tracking-tight">Bạn</span>
                    )}
                    {timestamp && (
                        <span className="text-[10px] text-muted-foreground font-medium">{timestamp}</span>
                    )}
                </div>

                {/* Message Body */}
                <div
                    className={cn(
                        'relative transition-all duration-200 w-full',
                        isAssistant
                            ? error
                                ? 'text-destructive bg-destructive/5 p-4 rounded-lg border border-destructive/20'
                                : 'text-foreground leading-relaxed'
                            : 'bg-primary text-primary-foreground px-4 py-2.5 rounded-lg shadow-sm rounded-tr-none w-fit'
                    )}
                >
                    <div
                        className={cn(
                            'prose prose-sm max-w-none',
                            'prose-p:leading-relaxed',
                            'prose-pre:bg-muted prose-pre:text-foreground prose-pre:border prose-pre:border-border',
                            'prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded',
                            isAssistant && 'text-foreground prose-headings:text-foreground',
                            !isAssistant && 'prose-p:text-primary-foreground prose-strong:text-primary-foreground prose-headings:text-primary-foreground prose-code:text-primary-foreground prose-code:bg-primary-foreground/10'
                        )}
                    >
                        {parsed ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {/* Confidence badge + tools used */}
                                {!isStreaming && (parsed.confidence || parsed.toolsUsed?.length > 0) && (
                                    <div className="flex flex-wrap items-center gap-2">
                                        {parsed.confidence && parsed.confidence !== 'NONE' && (
                                            <ConfidenceBadge level={parsed.confidence} score={parsed.confidenceScore} />
                                        )}
                                        {parsed.toolsUsed?.length > 0 && (
                                            <ToolBadges tools={parsed.toolsUsed} />
                                        )}
                                    </div>
                                )}

                                <p className="text-sm font-medium text-foreground leading-snug">
                                    {renderWikiLinks(parsed.summary ?? '')}
                                </p>

                                <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                                    {parsed.details?.map((item: string, idx: number) => (
                                        <div key={idx} className="flex gap-2 text-muted-foreground text-sm">
                                            <span className="text-primary font-bold mt-0.5">•</span>
                                            <span>{renderWikiLinks(item)}</span>
                                        </div>
                                    ))}
                                </div>

                                {parsed.sources?.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest w-full mb-1">
                                            Tài liệu tham khảo
                                        </span>
                                        {parsed.sources.map((src: string, i: number) => (
                                            <span
                                                key={i}
                                                className="px-2 py-1 bg-muted border border-border rounded-md text-[11px] text-foreground font-medium"
                                            >
                                                {src}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Suggested follow-up questions */}
                                {!isStreaming && parsed.suggestedFollowUps?.length > 0 && (
                                    <div className="pt-3 border-t border-border">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <MessageSquarePlus className="w-3 h-3 text-muted-foreground" />
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                Câu hỏi gợi ý
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {parsed.suggestedFollowUps.map((q: string, i: number) => (
                                                <button
                                                    key={i}
                                                    onClick={() => onFollowUpClick?.(q)}
                                                    className={cn(
                                                        'text-[11px] px-2.5 py-1.5 rounded-md border text-left',
                                                        'bg-muted/50 border-border text-muted-foreground',
                                                        'hover:bg-primary/5 hover:border-primary/30 hover:text-foreground',
                                                        'transition-colors duration-150 cursor-pointer'
                                                    )}
                                                >
                                                    {q}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : isAssistant && isStreaming && content.trim().startsWith('{') ? (
                            <div className="space-y-4 py-2">
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-1.5">
                                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                                    </div>
                                    <span className="text-xs font-bold text-primary uppercase tracking-widest animate-pulse">
                                        Đang tổng hợp câu trả lời
                                    </span>
                                </div>
                                {(() => {
                                    const match = content.match(/"summary":\s*"([^"]*)"/);
                                    const summary = match ? match[1] : content.match(/"summary":\s*"([^"]*)$/)?.[1];
                                    return summary ? (
                                        <p className="text-sm font-medium text-foreground animate-in fade-in duration-700">
                                            {summary}
                                            <span className="inline-block w-1.5 h-5 bg-primary ml-1 animate-pulse align-middle" />
                                        </p>
                                    ) : null;
                                })()}
                            </div>
                        ) : (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {content + (isStreaming ? ' \u2588' : '')}
                            </ReactMarkdown>
                        )}
                    </div>

                    {/* Insufficient sources warning */}
                    {hasInsufficientSources && !isStreaming && (
                        <div className="flex items-center gap-2 mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-md text-xs text-amber-700 dark:text-amber-400 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            <p>Câu trả lời này dựa trên thông tin hạn chế từ các tài liệu nội bộ hiện có.</p>
                        </div>
                    )}

                    {/* Citations */}
                    {isAssistant && citations.length > 0 && !isStreaming && (
                        <div className="mt-5 border-t border-border pt-4">
                            <CitationList citations={citations} onCitationClick={onCitationClick} />
                        </div>
                    )}
                </div>

                {/* Bubble Actions */}
                {isAssistant && !isStreaming && content && (
                    <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                            onClick={handleCopy}
                            title="Sao chép tin nhắn"
                        >
                            {copied ? (
                                <Check className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                                <Copy className="w-3.5 h-3.5" />
                            )}
                        </Button>

                        {onSave && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                                onClick={onSave}
                                title="Lưu vào ghi chú"
                            >
                                <Bookmark className="w-3.5 h-3.5" />
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
