import React from 'react';
import { Info, ShieldAlert } from 'lucide-react';

export const PublicChannelNotice: React.FC = () => {
  return (
    <div className="mx-4 my-6 p-3.5 rounded-sm border border-border bg-muted/40 dark:bg-muted/25 font-mono select-none">
      <div className="flex gap-3">
        <div className="h-6 w-6 rounded-sm bg-muted dark:bg-muted border border-border flex items-center justify-center shrink-0">
          <Info size={13} className="text-muted-foreground dark:text-muted-foreground" />
        </div>
        
        <div>
          <h4 className="text-[10px] font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
            <ShieldAlert size={12} className="text-emerald-500" />
            Thông báo kênh công khai
          </h4>
          <p className="text-[9px] text-slate-450 dark:text-muted-foreground mt-1 leading-relaxed">
            Mọi thành viên trong không gian làm việc, bao gồm cả Quản trị viên (Workspace Admins), đều có quyền xem danh sách và đọc tất cả tin nhắn trong cuộc trò chuyện này.
          </p>
        </div>
      </div>
    </div>
  );
};
