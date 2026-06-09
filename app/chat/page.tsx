"use client";

import { MessageSquare } from "lucide-react";

export default function ChatIndexPage() {
  return (
    <div className="hidden md:flex flex-1 flex-col items-center justify-center h-full bg-muted dark:bg-[#111113] transition-colors duration-200">
      <div className="flex flex-col items-center gap-4 text-muted-foreground dark:text-muted-foreground max-w-md px-6 text-center">
        <div className="p-4 border border-border bg-background rounded-sm shadow-sm">
          <MessageSquare size={32} className="text-muted-foreground dark:text-muted-foreground" strokeWidth={1.5} />
        </div>
        <p className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground dark:text-muted-foreground mt-2">
          Hệ thống Chat
        </p>
        <p className="text-[11px] font-mono text-muted-foreground dark:text-muted-foreground leading-relaxed">
          Chọn một cuộc trò chuyện cá nhân hoặc kênh thảo luận nhóm từ danh sách bên trái để bắt đầu chia sẻ tin nhắn, tệp tin và thực hiện cuộc gọi thời gian thực.
        </p>
      </div>
    </div>
  );
}
