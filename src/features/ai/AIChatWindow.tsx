'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/redux/store';
import { useGetConversationMessagesQuery } from '@/src/redux/feature/aiApi';
import type { ChatMessage, Citation } from '@/src/redux/feature/aiApi';
import { useGetUserWorkspacesQuery } from '@/src/redux/feature/workspaceApi';
import { useListDepartmentsQuery, useGetUserDepartmentsQuery } from '@/src/redux/feature/departmentApi';
import { useAIAssistant } from '@/src/hooks/useAIAssistant';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AIMessageBubble } from './AIMessageBubble';
import { Send, Loader2, Sparkles, StopCircle, AlertCircle, Bot, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export interface AIMessageLocal {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    citations?: any[];
    isStreaming?: boolean;
}

interface AIChatWindowProps {
    conversationId: number;
    className?: string;
}

export function AIChatWindow({ conversationId, className }: AIChatWindowProps) {
    const [input, setInput] = useState('');
    const [selectedScope, setSelectedScope] = useState<string>('default');
    const [aiMode, setAiMode] = useState<'rag' | 'agent'>('rag');
    const scrollEndRef = useRef<HTMLDivElement>(null);
    const [historyMessages, setHistoryMessages] = useState<AIMessageLocal[]>([]);

    const user = useSelector((state: RootState) => state.auth.user);
    const globalRoles = useSelector((state: RootState) => state.auth.roles) || [];
    const currentWorkspaceId = useSelector((state: any) => state.workspace.currentWorkspaceId);
    const userId = user?.id || '';
    const { data: userDepts = [] } = useGetUserDepartmentsQuery(userId, { skip: !userId });
    const { data: workspaces = [] } = useGetUserWorkspacesQuery();
    const { data: departments = [] } = useListDepartmentsQuery();

    const isGlobalAdmin = globalRoles.some(r => r.includes('ADMIN') || r.includes('SUPER_ADMIN'));

    const chatId = `standalone-ai-${userId}`;
    const { aiMessages, isStreaming, sendAIQuery, sendAgentQuery, clearAI } = useAIAssistant(chatId, conversationId);

    const { data: history, isFetching } = useGetConversationMessagesQuery(conversationId);

    useEffect(() => {
        if (history) {
            setHistoryMessages(history.map((m: ChatMessage) => ({
                id: m.id?.toString() || `hist-${Math.random()}`,
                role: m.role as 'user' | 'assistant',
                content: m.content,
                timestamp: m.createdAt || new Date().toISOString()
            })));
        }
    }, [history, conversationId]);

    useEffect(() => {
        clearAI();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId]);

    const allMessages: AIMessageLocal[] = [
        ...historyMessages,
        ...aiMessages.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
            isStreaming: m.isStreaming,
        })),
    ];

    const hasPartialResults = allMessages.some(
        (m) =>
            m.role === 'assistant' &&
            (m.content.includes('Hệ thống quản lý phòng ban hiện đang bảo trì') ||
                m.content.includes('partial_results'))
    );

    useEffect(() => {
        scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [allMessages.length, isStreaming]);

    const handleSubmit = () => {
        if (!input.trim() || isStreaming) return;
        const msg = input.trim();
        setInput('');

        if (aiMode === 'agent') {
            sendAgentQuery(msg, currentWorkspaceId || 'default-workspace');
        } else {
            sendAIQuery(msg);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleCitationClick = useCallback((_citation: Citation) => {}, []);

    const handleFollowUp = useCallback((question: string) => {
        if (isStreaming) return;
        if (aiMode === 'agent') {
            sendAgentQuery(question, currentWorkspaceId || 'default-workspace');
        } else {
            sendAIQuery(question);
        }
    }, [isStreaming, aiMode, sendAIQuery, sendAgentQuery, currentWorkspaceId]);

    if (isFetching && allMessages.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-primary/60" />
                <span className="text-sm font-medium">Tải lịch sử trò chuyện...</span>
            </div>
        );
    }

    return (
        <div className={cn('flex-1 flex flex-col min-h-0 h-full bg-background relative overflow-hidden', className)}>
            {/* Warning Banner */}
            {hasPartialResults && (
                <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs px-4 py-2.5 flex items-center gap-2.5 z-20 animate-in slide-in-from-top duration-300 pointer-events-auto">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                    <span className="font-semibold">Hệ thống quản lý phòng ban hiện đang bảo trì. Kết quả tìm kiếm chỉ truy xuất dữ liệu trong Workspace này.</span>
                </div>
            )}

            {/* Fade top */}
            <div className={cn("absolute left-0 right-0 h-14 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none", hasPartialResults ? "top-10" : "top-0")} />

            {/* Chat History */}
            <ScrollArea className="flex-1 min-h-0 px-4 sm:px-6">
                <div className="max-w-3xl mx-auto py-12 space-y-1">
                    {allMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in zoom-in duration-500">
                            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center shadow-lg mb-6">
                                <Sparkles className="w-8 h-8 text-primary-foreground" />
                            </div>
                            <h2 className="text-2xl font-bold text-foreground tracking-tight mb-3">
                                Tôi có thể giúp gì cho bạn?
                            </h2>
                            <p className="text-muted-foreground max-w-md leading-relaxed mb-7 text-sm font-medium">
                                Tôi là Trợ lý AI Nội bộ của NEXUS. Tôi có thể giúp bạn tìm kiếm tài liệu công ty,
                                tóm tắt kiến thức hoặc trả lời các câu hỏi kỹ thuật.
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {[
                                    'Tìm kiếm chính sách nhân sự',
                                    'Tóm tắt dự án mới nhất',
                                    'Hướng dẫn kỹ thuật',
                                ].map(suggestion => (
                                    <button
                                        key={suggestion}
                                        onClick={() => setInput(suggestion)}
                                        className={cn(
                                            'px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer',
                                            'bg-card border border-border text-foreground',
                                            'hover:border-primary/40 hover:bg-primary/5 hover:text-primary',
                                            'transition-colors duration-150'
                                        )}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1 pb-32">
                            {allMessages.map((message) => (
                                <AIMessageBubble
                                    key={message.id}
                                    role={message.role}
                                    content={message.content}
                                    citations={message.citations}
                                    isStreaming={!!message.isStreaming}
                                    timestamp={new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    onCitationClick={handleCitationClick}
                                    onFollowUpClick={handleFollowUp}
                                />
                            ))}
                            <div ref={scrollEndRef} className="h-1" />
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Input Bar */}
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-5 pt-2 z-20 pointer-events-none bg-gradient-to-t from-background via-background/95 to-transparent">
                <div className="max-w-3xl mx-auto pointer-events-auto">
                    {/* Controls row */}
                    <div className="flex items-center gap-2 mb-2">
                        {/* Mode toggle */}
                        <div className="flex rounded-lg border border-border overflow-hidden">
                            <button
                                onClick={() => setAiMode('rag')}
                                className={cn(
                                    "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors",
                                    aiMode === 'rag'
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-card text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Search className="w-3 h-3" />RAG
                            </button>
                            <button
                                onClick={() => setAiMode('agent')}
                                className={cn(
                                    "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors",
                                    aiMode === 'agent'
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-card text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Bot className="w-3 h-3" />Agent
                            </button>
                        </div>

                        {/* Admin scope selector */}
                        {isGlobalAdmin && (
                            <div className="flex items-center gap-2 bg-slate-900 border border-border px-3 py-1.5 rounded-lg shadow-md">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Phạm vi:</span>
                                <Select value={selectedScope} onValueChange={setSelectedScope}>
                                    <SelectTrigger className="h-6 w-[200px] text-xs bg-slate-950 border-border text-white rounded-md">
                                        <SelectValue placeholder="Chọn phạm vi" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-950 border-border text-white text-xs max-h-[250px] overflow-y-auto">
                                        <SelectItem value="default" className="text-xs cursor-pointer focus:bg-slate-800">
                                            Mặc định (Không gian hiện tại)
                                        </SelectItem>
                                        {departments.length > 0 && (
                                            <SelectGroup>
                                                <SelectLabel className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-1">Phòng ban</SelectLabel>
                                                {departments.map((dept: any) => (
                                                    <SelectItem key={dept.id} value={`dept:${dept.id}`} className="text-xs cursor-pointer focus:bg-slate-800 pl-4">
                                                        Phòng {dept.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        )}
                                        {workspaces.length > 0 && (
                                            <SelectGroup>
                                                <SelectLabel className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-1">Workspace</SelectLabel>
                                                {workspaces.map((ws: any) => (
                                                    <SelectItem key={ws.id} value={`ws:${ws.id}`} className="text-xs cursor-pointer focus:bg-slate-800 pl-4">
                                                        {ws.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <div
                        className={cn(
                            'relative flex items-end gap-2',
                            'bg-card border border-border rounded-lg shadow-sm',
                            'ring-0 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/60',
                            'transition-all duration-200 overflow-hidden'
                        )}
                    >
                        <Textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={aiMode === 'agent' ? "Hỏi Agent (có thể gọi tools)..." : "Hỏi Trợ lý NEXUS về tri thức nội bộ..."}
                            className={cn(
                                'min-h-[52px] max-h-44 flex-1 bg-transparent border-0',
                                'focus-visible:ring-0 focus-visible:ring-offset-0',
                                'py-3.5 pl-4 pr-2 text-sm font-medium',
                                'placeholder:text-muted-foreground resize-none custom-scrollbar'
                            )}
                            disabled={isStreaming}
                        />

                        <div className="flex items-center pb-2 pr-2">
                            <Button
                                onClick={isStreaming ? () => {} : handleSubmit}
                                disabled={!input.trim() && !isStreaming}
                                size="icon"
                                className={cn(
                                    'h-9 w-9 rounded-md shrink-0 transition-all duration-200',
                                    isStreaming
                                        ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                                        : 'bg-primary hover:bg-primary/90 text-primary-foreground',
                                    'disabled:opacity-40'
                                )}
                            >
                                {isStreaming ? (
                                    <StopCircle className="w-4 h-4" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground text-center mt-2 font-medium tracking-wide">
                        {aiMode === 'agent' ? 'Agent Mode · Gemini + Tool Calling' : 'Trợ lý Tri thức Nội bộ · AI có thể mắc sai sót'}
                    </p>
                </div>
            </div>
        </div>
    );
}
