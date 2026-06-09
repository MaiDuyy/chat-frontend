"use client";

import React from 'react';
import { 
  Users, 
  MessageSquare, 
  Activity, 
  TrendingUp, 
  TrendingDown,
  Clock,
  ArrowRight,
  Hash
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/redux/store';
import { useGetWorkspaceMembersQuery, useGetWorkspaceStatsQuery } from '@/src/redux/feature/workspaceApi';
import { useGetChatsQuery } from '@/src/redux/feature/chatApi';
import { useListChannelsQuery } from '@/src/redux/feature/channelApi';
import { useRealtimeChat } from '@/src/hooks/useRealtimeChat';
import { getAvatarUrl } from '@/src/utils/image-utils';

const StatCard = ({ title, value, trend, trendValue, icon: Icon }: any) => (
  <Card className="border border-border shadow-sm bg-background overflow-hidden group rounded-sm transition-all duration-150">
    <CardContent className="p-4">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">{title}</p>
          <h3 className="text-xl font-bold font-mono text-foreground">{value}</h3>
          {trend && (
            <div className="flex items-center gap-1 mt-1.5">
              {trend === 'up' ? (
                <TrendingUp size={12} className="text-emerald-600 dark:text-emerald-400" />
              ) : (
                <TrendingDown size={12} className="text-rose-600 dark:text-rose-400" />
              )}
              <span className={`text-[10px] font-bold font-mono ${trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {trendValue}
              </span>
              <span className="text-[10px] text-muted-foreground dark:text-muted-foreground font-medium font-mono ml-1">vs week ago</span>
            </div>
          )}
        </div>
        <div className="p-2 rounded-sm bg-muted dark:bg-muted/50 text-muted-foreground dark:text-muted-foreground border border-border dark:border-white/[0.04] transition-colors group-hover:bg-muted dark:group-hover:bg-muted duration-150">
          <Icon size={15} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const ActivityItem = ({ user, action, target, time }: any) => (
  <div className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0 border-b last:border-0 border-border dark:border-white/[0.04]">
    <div className="h-7 w-7 rounded-sm bg-muted dark:bg-muted border border-border/50 dark:border-white/[0.06] flex items-center justify-center text-muted-foreground font-bold text-xs shrink-0 overflow-hidden">
      <img src={getAvatarUrl(undefined, user)} alt="" className='object-cover w-full h-full' />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-foreground">
        <span className="font-bold font-mono text-slate-950 dark:text-white">{user}</span> {action} <span className="font-semibold text-primary hover:underline cursor-pointer font-mono">{target}</span>
      </p>
      <p className="text-[10px] font-mono text-muted-foreground dark:text-muted-foreground mt-0.5 flex items-center gap-1">
        <Clock size={10} />
        {time}
      </p>
    </div>
    <ArrowRight size={12} className="text-slate-350 dark:text-muted-foreground" />
  </div>
);

export default function WorkspaceDashboard() {
  const currentWorkspaceId = useSelector((state: RootState) => state.workspace.currentWorkspaceId);
  const currentUser = useSelector((state: RootState) => state.auth?.user);
  
  const { data: membersData } = useGetWorkspaceMembersQuery({ workspaceId: currentWorkspaceId || '' }, { skip: !currentWorkspaceId });
  const { data: groupsData } = useGetChatsQuery({ type: 'group', workspaceId: currentWorkspaceId || '' }, { skip: !currentWorkspaceId });
  const { data: channelsData } = useListChannelsQuery({ workspaceId: currentWorkspaceId || '' }, { skip: !currentWorkspaceId });
  const { data: statsData } = useGetWorkspaceStatsQuery(currentWorkspaceId || '', { skip: !currentWorkspaceId });
  const { onlineUsers } = useRealtimeChat();

  const totalMembers = membersData?.total || (membersData?.items as any)?.length || 0;
  const onlineMembers = (membersData?.items as any)?.filter((m: any) => 
    onlineUsers.has(m.userId) || m.userId === currentUser?.id
  ).length || 0;
  const totalGroups = groupsData?.chats?.length || 0;
  const totalChannels = channelsData?.length || 0;

  const maxMessages = Math.max(...(statsData?.messageActivity?.map((m: any) => m.count) || [10]));
  const maxMembers = Math.max(...(statsData?.memberActivity?.map((m: any) => m.count) || [10]));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-bold text-foreground font-mono uppercase tracking-tight">Tổng quan Workspace</h1>
        <p className="text-xs text-muted-foreground dark:text-muted-foreground font-mono mt-0.5">Theo dõi hoạt động và chỉ số phát triển của đội ngũ bạn.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Tổng thành viên" 
          value={totalMembers} 
          icon={Users} 
        />
        <StatCard 
          title="Nhóm chat" 
          value={totalGroups} 
          icon={MessageSquare} 
        />
        <StatCard 
          title="Kênh thảo luận" 
          value={totalChannels} 
          icon={Hash} 
        />
        <StatCard 
          title="Đang Online" 
          value={onlineMembers} 
          icon={Activity} 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border border-border shadow-sm bg-background rounded-sm">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-[10px] font-bold font-mono uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">Lưu lượng tin nhắn (30 ngày)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="h-[200px] w-full flex items-end gap-1.5 px-1 border-b border-border dark:border-white/[0.04]">
              {statsData?.messageActivity?.length ? statsData.messageActivity.map((val: any, i: number) => (
                <div 
                  key={i} 
                  className="flex-1 bg-muted dark:bg-muted hover:bg-slate-900 dark:hover:bg-muted transition-all rounded-t-[1px] relative group cursor-pointer duration-150"
                  style={{ height: `${Math.max((val.count / maxMessages) * 100, 2)}%`, minHeight: '4px' }}
                >
                   <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-950 text-white text-[9px] font-mono px-2.5 py-1 rounded-sm border border-white/[0.08] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap text-center shadow-md">
                     <span className="font-bold">{val.count} tin nhắn</span><br/>{new Date(val.date).toLocaleDateString('vi-VN')}
                   </div>
                </div>
              )) : (
                 <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-mono">Chưa có dữ liệu tin nhắn</div>
              )}
            </div>
            <div className="flex justify-between mt-3 text-[9px] text-muted-foreground dark:text-muted-foreground font-bold font-mono uppercase tracking-wider">
              <span>30 ngày trước</span>
              <span>Hôm nay</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm bg-background rounded-sm">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-[10px] font-bold font-mono uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">Thành viên mới (12 tuần)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="h-[200px] w-full flex items-end gap-3 px-3 border-b border-border dark:border-white/[0.04]">
              {statsData?.memberActivity?.length ? statsData.memberActivity.map((val: any, i: number) => (
                <div 
                  key={i} 
                  className="flex-1 bg-muted dark:bg-muted hover:bg-slate-900 dark:hover:bg-muted rounded-t-[1px] relative group cursor-pointer transition-all duration-150"
                  style={{ height: `${Math.max((val.count / maxMembers) * 100, 2)}%`, minHeight: '4px' }}
                >
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-955 text-white text-[9px] font-mono px-2.5 py-1 rounded-sm border border-white/[0.08] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap text-center shadow-md">
                     <span className="font-bold">{val.count} thành viên</span><br/>Tuần: {new Date(val.week).toLocaleDateString('vi-VN')}
                   </div>
                </div>
              )) : (
                 <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-mono">Chưa có dữ liệu thành viên</div>
              )}
            </div>
            <div className="flex justify-between mt-3 text-[9px] text-muted-foreground dark:text-muted-foreground font-bold font-mono uppercase tracking-wider">
              <span>12 tuần trước</span>
              <span>Tuần này</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border border-border shadow-sm bg-background rounded-sm">
        <CardHeader className="flex flex-row items-center justify-between p-4 pb-0">
          <CardTitle className="text-[10px] font-bold font-mono uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">Hoạt động gần đây</CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-primary font-bold font-mono hover:text-blue-700 dark:hover:text-blue-300">Xem tất cả</Button>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-1">
             {statsData?.recentActivity?.length ? statsData.recentActivity.map((act: any, i: number) => (
                <ActivityItem 
                  key={i}
                  user={act.user} 
                  action={act.action} 
                  target={act.target} 
                  time={new Date(act.time).toLocaleString('vi-VN')} 
                />
             )) : (
                <div className="py-6 text-center text-muted-foreground text-xs font-mono">Chưa có hoạt động nào</div>
             )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Button({ children, variant, size, className, onClick }: any) {
  const variants: any = {
    ghost: "hover:bg-muted dark:hover:bg-muted text-muted-foreground dark:text-muted-foreground",
    outline: "border border-border hover:bg-muted dark:hover:bg-muted text-muted-foreground",
    primary: "bg-slate-900 dark:bg-muted text-white dark:text-foreground hover:bg-slate-800 dark:hover:bg-muted"
  };
  const sizes: any = {
    sm: "px-2.5 py-1 text-xs h-7",
    md: "px-3.5 py-1.5 text-xs h-8"
  };
  return (
    <button 
      onClick={onClick}
      className={`rounded-sm font-mono font-semibold transition-colors duration-150 ${variants[variant || 'primary']} ${sizes[size || 'md']} ${className}`}
    >
      {children}
    </button>
  );
}
