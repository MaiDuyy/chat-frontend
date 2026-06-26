'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Sparkles, X, Send, Loader2, Bot, RefreshCw,
  Zap, History, Clock, ChevronRight, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AIMessage, useAIAssistant } from '@/src/hooks/useAIAssistant';
import { AIMessageBubble } from '../ai/AIMessageBubble';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGetConversationMessagesQuery, useGetConversationsQuery } from '@/src/redux/feature/aiApi';
import { useSelector } from 'react-redux';

const formatTitle = (title: string) => {
  if (!title) return '';
  let clean = title;
  
  // 1. Handle JSON
  if (clean.startsWith('{')) {
    try {
      const parsed = JSON.parse(clean);
      clean = parsed.summary || clean;
    } catch { /* skip */ }
  }
  
  // 2. Handle label-style string: "summary: Title, details: ..."
  const lower = clean.toLowerCase();
  if (lower.includes('summary:')) {
    const start = lower.indexOf('summary:') + 8;
    let end = lower.indexOf('details:');
    if (end === -1) end = lower.indexOf(', details:');
    if (end === -1) end = clean.length;
    
    if (end > start) {
      clean = clean.substring(start, end);
    }
  }
  
  // 3. Final cleanup
  return clean.replace(/[{}\"\\[\\]]|summary:|details:|sources:/g, '').trim().replace(/,$/, '').trim();
};

interface AIAssistantPanelProps {
  chatId: string;
  initialQuery?: string;
  onClose: () => void;
}

export function AIAssistantPanel({ chatId, initialQuery, onClose }: AIAssistantPanelProps) {
  const [agentMode, setAgentMode] = useState(false);
  const [forceNewConv, setForceNewConv] = useState(false);
  const { data: conversations, isLoading: isLoadingConv, refetch: refetchConversations } = useGetConversationsQuery();
  
  // Both RAG and Agent share the same conversation for a given chatId
  const activeConv = useMemo(() => {
    if (forceNewConv) return null;
    if (!conversations || !chatId) return null;
    return conversations.find(c => c.chatId === chatId);
  }, [conversations, chatId, forceNewConv]);

  const { aiMessages: currentMessages, isStreaming, sendAIQuery, sendAgentQuery, clearAI } = useAIAssistant(chatId, activeConv?.id || undefined);

  const { data: historyMessages, isLoading: isLoadingHistoryMessages } = useGetConversationMessagesQuery(
    activeConv?.id as number,
    { skip: !activeConv?.id }
  );
  
  const [inputValue, setInputValue] = useState('');
  const [view, setView] = useState<'chat' | 'history'>('chat');
  
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sentInitialRef = useRef(false);

  // Map history messages to AIMessage format
  const mappedHistory: AIMessage[] = useMemo(() => {
    if (!activeConv?.id || !historyMessages) return [];
    return historyMessages.map(m => ({
      id: `hist_${m.id}`,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      timestamp: m.createdAt,
      mode: agentMode ? 'agent' : 'rag'
    }));
  }, [historyMessages, agentMode, activeConv?.id]);

  // Combine history and current session messages
  const allMessages = useMemo(() => {
    return [...mappedHistory, ...currentMessages];
  }, [mappedHistory, currentMessages]);

  // Send initial query from "Ask AI" button or /ai slash command
  useEffect(() => {
    if (initialQuery && !sentInitialRef.current) {
      sentInitialRef.current = true;
      sendAIQuery(initialQuery);
    }
  }, [initialQuery, sendAIQuery]);

  // Auto-scroll on new messages/tokens
  useEffect(() => {
    if (view === 'chat') {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [allMessages, view]);

  const currentWorkspaceId = useSelector((state: any) => state.workspace?.currentWorkspaceId);

  const prevStreamingRef = useRef(false);
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming) {
      refetchConversations();
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, refetchConversations]);

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;
    setForceNewConv(false);
    if (agentMode) {
      sendAgentQuery(text, currentWorkspaceId || undefined);
    } else {
      sendAIQuery(text);
    }
    setInputValue('');
    textareaRef.current?.focus();
  }, [inputValue, isStreaming, agentMode, sendAIQuery, sendAgentQuery, currentWorkspaceId]);

  const handleFollowUp = useCallback((question: string) => {
    if (isStreaming) return;
    setForceNewConv(false);
    if (agentMode) {
      sendAgentQuery(question, currentWorkspaceId || undefined);
    } else {
      sendAIQuery(question);
    }
  }, [isStreaming, agentMode, sendAIQuery, sendAgentQuery, currentWorkspaceId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    clearAI();
    setForceNewConv(true);
    sentInitialRef.current = false;
    setView('chat');
  };

  // Suggested queries differ by mode
  const suggestions = agentMode
    ? ['Tóm tắt chat này', 'Tạo task: Review PR', 'Thông tin nhóm']
    : ['Tìm tài liệu liên quan', 'Giải thích quy trình', 'Chính sách nghỉ phép'];

  return (
    <div className="flex flex-col h-full bg-background border-l border-border w-[360px] shrink-0 shadow-2xl relative overflow-hidden transition-all duration-300">
      {/* Header with Glassmorphism */}
      <div className={cn(
        'sticky top-0 z-20 flex items-center justify-between px-5 py-4 border-b backdrop-blur-md transition-all duration-500',
        agentMode
          ? 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-100/50 dark:border-amber-900/30'
          : 'bg-background/80 border-border'
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-9 h-9 rounded-md flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-105',
            agentMode
              ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-200/50'
              : 'bg-gradient-to-br from-accent-emerald to-accent-mint shadow-emerald-500/20'
          )}>
            {agentMode ? <Zap size={18} className="text-white" /> : <Sparkles size={18} className="text-slate-950" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground tracking-tight leading-none mb-1">
              {view === 'history' ? 'Lịch sử AI' : (agentMode ? 'Trợ lý Agent' : 'Trợ lý AI')}
            </h3>
            <div className="flex items-center gap-1.5">
              <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", agentMode ? "bg-amber-500" : "bg-emerald-500")} />
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                {view === 'history' ? 'Gần đây' : 'Sẵn sàng'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* History Toggle */}
          <button
            onClick={() => setView(v => v === 'chat' ? 'history' : 'chat')}
            className={cn(
              view === 'history'
                ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                : 'bg-background hover:bg-muted border-border text-muted-foreground hover:text-foreground'
            )}
            title={view === 'chat' ? 'Xem lịch sử hội thoại' : 'Quay lại Chat'}
          >
            {view === 'chat' ? <History size={14} /> : <MessageSquare size={14} />}
          </button>

          {/* Agent Mode Toggle Button */}
          {view === 'chat' && (
            <button
              onClick={() => setAgentMode(prev => !prev)}
              className={cn(
                'group relative flex items-center justify-center w-8 h-8 rounded-md transition-all duration-300 border shadow-sm',
                agentMode
                  ? 'bg-amber-500 border-amber-400 text-white shadow-amber-100'
                  : 'bg-background hover:bg-muted border-border text-muted-foreground hover:text-amber-500'
              )}
              title={agentMode ? 'Chuyển về chế độ RAG' : 'Bật Chế độ Agent (Tool Calling)'}
            >
              <Zap size={14} className={cn("transition-transform", agentMode && "animate-pulse")} />
            </button>
          )}

          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-muted rounded-md" onClick={handleClear} title="Làm mới">
            <RefreshCw size={14} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md" onClick={onClose}>
            <X size={14} />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
        {view === 'chat' ? (
          /* Chat View */
          <ScrollArea className="flex-1 h-full px-5 py-6 custom-scrollbar">
            <div className="space-y-6 pb-4">
              {allMessages.length === 0 && !isLoadingHistoryMessages && (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center py-8 animate-in fade-in zoom-in duration-700">
                  <div className={cn(
                    'w-16 h-16 rounded-md flex items-center justify-center mb-6 shadow-xl transform -rotate-3 transition-transform hover:rotate-0 duration-300',
                    agentMode ? 'bg-amber-50 shadow-amber-100' : 'bg-muted shadow-sm'
                  )}>
                    <Bot size={32} className={agentMode ? 'text-amber-500' : 'text-primary'} />
                  </div>
                  <div className="space-y-2 mb-8">
                    <h4 className="text-lg font-bold text-foreground tracking-tight">
                      {agentMode ? 'Agent đã sẵn sàng' : 'Tôi có thể giúp gì cho bạn?'}
                    </h4>
                    <p className="text-xs text-muted-foreground max-w-[240px] leading-relaxed mx-auto font-medium">
                      {agentMode
                        ? 'Tôi có thể tóm tắt chat, tạo công việc, tìm tài liệu và thực thi các hành động thông minh.'
                        : 'Hãy hỏi bất cứ điều gì về tài liệu nội bộ và quy trình của tổ chức bạn.'}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 w-full max-w-[280px]">
                    {suggestions.map(q => (
                      <button
                        key={q}
                        onClick={() => agentMode ? sendAgentQuery(q) : sendAIQuery(q)}
                        className={cn(
                          'group flex items-center justify-between px-4 py-2.5 text-xs font-semibold rounded-md transition-all duration-200 border text-left',
                          agentMode
                            ? 'bg-white border-amber-100 text-amber-700 hover:border-amber-400 hover:bg-amber-50 shadow-sm'
                            : 'bg-white border-border text-muted-foreground hover:border-primary hover:bg-primary/5 shadow-sm'
                        )}
                      >
                        <span className="truncate">{q}</span>
                        <Send size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-current" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isLoadingHistoryMessages && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                  <Loader2 size={24} className="animate-spin text-primary" />
                  <span className="text-xs font-medium">Đang tải tin nhắn cũ...</span>
                </div>
              )}

              {allMessages.map((msg) => (
                <AIMessageBubble
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  isStreaming={msg.isStreaming}
                  mode={msg.mode}
                  onFollowUpClick={handleFollowUp}
                />
              ))}
              <div ref={scrollEndRef} className="h-4" />
            </div>
          </ScrollArea>
        ) : (
          /* History View */
          <ScrollArea className="flex-1 h-full px-5 py-6 custom-scrollbar">
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Hội thoại gần đây</span>
                <Clock size={12} className="text-muted-foreground" />
              </div>
              
              {isLoadingConv ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                  <Loader2 size={24} className="animate-spin text-primary" />
                  <span className="text-xs font-medium">Đang tải lịch sử...</span>
                </div>
              ) : conversations?.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground font-medium">Chưa có lịch sử hội thoại.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations?.slice(0, 10).map((conv: any) => (
                    <button
                      key={conv.id}
                      onClick={() => setView('chat')}
                      className="w-full flex items-center gap-3 p-3 rounded-md bg-background border border-border hover:border-primary/50 hover:bg-muted transition-all duration-200 group text-left shadow-sm"
                    >
                      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0 group-hover:bg-background transition-colors">
                        <MessageSquare size={14} className="text-muted-foreground group-hover:text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-muted-foreground truncate group-hover:text-foreground font-bold transition-colors">
                          {formatTitle(conv.title)}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-medium">
                          {new Date(conv.createdAt).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Mode Banner Subtle */}
      {view === 'chat' && agentMode && allMessages.length > 0 && (
        <div className="mx-5 mb-4 px-3 py-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-md flex items-start gap-2 animate-in slide-in-from-bottom-2 duration-300">
          <Zap size={12} className="mt-0.5 shrink-0 text-amber-500 animate-pulse" />
          <p className="text-[10px] text-amber-800 leading-tight font-medium">
            <strong>Chế độ Agent:</strong> Đang sử dụng Tool Calling để thực thi các yêu cầu phức tạp.
          </p>
        </div>
      )}

      {/* Refined Input Area */}
      <div className="p-5 bg-background border-t border-border shadow-[0_-10px_20px_-15px_rgba(0,0,0,0.05)]">
        <div className="relative group transition-all duration-300">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={agentMode ? 'Yêu cầu agent thực hiện...' : 'Hỏi về tài liệu nội bộ...'}
            className="min-h-[50px] max-h-[140px] w-full bg-muted/50 border-border rounded-md py-3.5 pl-4 pr-12 text-sm font-medium placeholder:text-muted-foreground focus:bg-background focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all duration-300 resize-none custom-scrollbar"
            disabled={isStreaming}
            rows={1}
          />
          <div className="absolute right-2 bottom-2">
            <Button
              size="icon"
              className={cn(
                'h-9 w-9 rounded-md shadow-lg transition-all duration-300 transform active:scale-95',
                agentMode
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 shadow-amber-200/50'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm'
              )}
              onClick={handleSend}
              disabled={!inputValue.trim() || isStreaming}
            >
              {isStreaming ? (
                <Loader2 size={16} className="animate-spin text-white" />
              ) : (
                <Send size={16} className="text-white" />
              )}
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 mt-3 opacity-60">
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest text-center">
                {agentMode ? 'Tool Calling enabled' : 'Gemini AI Assistant'}
            </p>
        </div>
      </div>
    </div>
  );
}