"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Bot, X, Send, Square, Loader2, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

// ── WikiFixerChat ─────────────────────────────────────────────────────────────

export interface WikiFixerChatProps {
  /** Sheet mode: controlled open state */
  open?: boolean;
  /** Sheet mode: close callback */
  onClose?: () => void;
  /** Inline mode: render without Sheet wrapper */
  inline?: boolean;
  slug: string;
  issueId?: number;
  workspaceId: string;
}

// Inner chat logic + UI (reused by both Sheet and inline modes)
function WikiFixerChatInner({
  slug,
  issueId,
  workspaceId,
  onClose,
  isInline = false,
}: {
  slug: string;
  issueId?: number;
  workspaceId: string;
  onClose?: () => void;
  isInline?: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const initialMessageSentRef = useRef(false);

  // Route through API gateway (port 3000) instead of calling AI service directly
  const GATEWAY_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3000/api")
    .replace(/\/api\/?$/, "");

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isStreaming) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: messageText,
    };
    setMessages((prev) => [...prev, userMsg]);
    setError(null);
    setIsStreaming(true);

    const assistantMsgId = `assistant_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantMsgId, role: "assistant", content: "", isStreaming: true },
    ]);

    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${GATEWAY_URL}/mrp/wiki/fixer/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          wikiPageSlug: slug,
          issueId: issueId ?? undefined,
          message: messageText,
          workspaceId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              const tok = parsed.token ?? parsed.content ?? parsed.text ?? parsed;
              if (typeof tok === "string") accumulated += tok;
            } catch {
              if (data && data !== "[DONE]") accumulated += data;
            }
          } else if (line.trim() && !line.startsWith(":")) {
            accumulated += line;
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, content: accumulated, isStreaming: true } : m
          )
        );
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: accumulated || "(Không có phản hồi)", isStreaming: false }
            : m
        )
      );
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: m.content + " _(đã dừng)_", isStreaming: false }
              : m
          )
        );
      } else {
        const errMsg = (err as Error)?.message ?? "Lỗi không xác định";
        setError(errMsg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: `Lỗi: ${errMsg}`, isStreaming: false }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [isStreaming, slug, issueId, workspaceId, GATEWAY_URL]);

  // Auto-send initial message when issueId is set
  useEffect(() => {
    if (issueId && !initialMessageSentRef.current && messages.length === 0) {
      initialMessageSentRef.current = true;
      const initMsg = `Phân tích và sửa issue #${issueId} cho trang '${slug}'`;
      const timer = setTimeout(() => sendMessage(initMsg), 400);
      return () => clearTimeout(timer);
    }
  }, [issueId, slug, messages.length, sendMessage]);

  // Reset when slug/issueId changes
  useEffect(() => {
    initialMessageSentRef.current = false;
    setMessages([]);
    setError(null);
    setIsStreaming(false);
    abortControllerRef.current?.abort();
  }, [slug, issueId]);

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue("");
    sendMessage(text);
  };

  const handleStop = () => abortControllerRef.current?.abort();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn("flex flex-col", isInline ? "h-full" : "h-full bg-background")}>
      {/* Header */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 border-b border-border shrink-0",
        "bg-gradient-to-r from-blue-50 to-blue-50/50 dark:from-blue-950/20 dark:to-blue-900/10"
      )}>
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shrink-0">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground leading-none">Wiki Fixer Agent</p>
          <p className="text-[9px] text-muted-foreground mt-0.5 truncate font-mono">
            {slug}{issueId ? ` · Issue #${issueId}` : ""}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md flex items-center justify-center border border-border bg-background text-muted-foreground hover:text-red-500 hover:border-red-200 transition-all shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Wiki Fixer Agent</p>
              <p className="text-[10px] text-muted-foreground mt-1 max-w-[220px] leading-relaxed">
                Tôi sẽ phân tích và đề xuất cách sửa các vấn đề chất lượng trong trang wiki này.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            {msg.role === "assistant" && (
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 mr-1.5 mt-0.5">
                <Bot className="w-2.5 h-2.5 text-white" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[88%] rounded-xl px-2.5 py-2 text-xs leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              )}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none text-xs">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content || (msg.isStreaming ? "..." : "")}
                  </ReactMarkdown>
                  {msg.isStreaming && (
                    <span className="inline-block w-1 h-3.5 bg-current animate-pulse ml-0.5 align-middle" />
                  )}
                </div>
              ) : (
                <span>{msg.content}</span>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="flex items-center gap-2 p-2 bg-red-500/5 border border-red-400/20 rounded-lg text-[10px] text-red-600 dark:text-red-400">
            <AlertCircle className="w-3 h-3 shrink-0" />
            {error}
          </div>
        )}

        <div ref={scrollEndRef} className="h-1" />
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 border-t border-border bg-background shrink-0">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập yêu cầu... (Ctrl+Enter để gửi)"
            disabled={isStreaming}
            rows={2}
            className={cn(
              "w-full resize-none rounded-lg border py-2 pl-2.5 pr-10 text-[11px] font-medium leading-relaxed",
              "bg-muted/40 placeholder:text-muted-foreground/60",
              "focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 focus:bg-background transition-all",
              "max-h-[100px] min-h-[48px]",
              "border-blue-200/50 dark:border-blue-800/30"
            )}
          />
          {isStreaming ? (
            <button
              onClick={handleStop}
              className="absolute right-2 bottom-2 h-7 w-7 rounded-md flex items-center justify-center border border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              title="Dừng"
            >
              <Square className="w-3 h-3" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="absolute right-2 bottom-2 h-7 w-7 rounded-md flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-40 transition-all"
              title="Gửi (Ctrl+Enter)"
            >
              <Send className="w-3 h-3 text-white" />
            </button>
          )}
        </div>
        <p className="text-center text-[8px] text-muted-foreground/40 font-mono uppercase tracking-widest mt-1.5">
          Wiki Fixer · AI Knowledge Service
        </p>
      </div>
    </div>
  );
}

// ── Sheet variant (used in WikiBrowser) ───────────────────────────────────────

export function WikiFixerChat({ open = false, onClose, inline, slug, issueId, workspaceId }: WikiFixerChatProps) {
  if (inline) {
    return (
      <WikiFixerChatInner
        slug={slug}
        issueId={issueId}
        workspaceId={workspaceId}
        onClose={onClose}
        isInline
      />
    );
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose?.()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[480px] p-0 flex flex-col bg-background border-l border-border"
      >
        <WikiFixerChatInner
          slug={slug}
          issueId={issueId}
          workspaceId={workspaceId}
          onClose={onClose}
        />
      </SheetContent>
    </Sheet>
  );
}
