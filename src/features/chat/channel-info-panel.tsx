"use client";

import React, { useState, useRef } from 'react';
import { X, Hash, Lock, Users, UserPlus, Settings, Pencil, Bell, BellOff, LogOut, CheckCircle2, Loader2, Search, Pin, FileText, Image as ImageIcon, Video, Paperclip, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import {
  useGetChannelQuery,
  useGetChannelMembersQuery,
  useAddChannelMemberMutation,
  useRemoveChannelMemberMutation,
  useUpdateChannelMutation,
  useLeaveChannelMutation,
  useUpdateChannelPreferencesMutation,
} from '@/src/redux/feature/channelApi';
import { useGetWorkspaceMembersQuery } from '@/src/redux/feature/workspaceApi';
import { useGetPinnedMessagesQuery, useGetMediaMessagesQuery, useTogglePinMessageMutation } from '@/src/redux/feature/messageApi';
import { getAvatarUrl, getMediaUrl } from '@/src/utils/image-utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { MessageSnippet } from './message-snippet';

interface ChannelInfoPanelProps {
  channelId: string;
  isOpen: boolean;
  onClose: () => void;
  onLeaveChannel?: () => void;
}

export const ChannelInfoPanel: React.FC<ChannelInfoPanelProps> = ({
  channelId,
  isOpen,
  onClose,
  onLeaveChannel,
}) => {
  const currentUser = useSelector((state: any) => state.auth?.user);
  const [activeTab, setActiveTab] = useState<'about' | 'members' | 'files' | 'settings'>('about');
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTopic, setEditTopic] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [addSearch, setAddSearch] = useState('');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'image' | 'video' | 'file'>('all');
  const [error, setError] = useState<string | null>(null);
  const editNameRef = useRef<HTMLInputElement>(null);

  const { data: channel, isLoading: loadingChannel } = useGetChannelQuery(channelId, { skip: !channelId || !isOpen });
  const { data: membersData, isLoading: loadingMembers } = useGetChannelMembersQuery(channelId, { skip: !channelId || !isOpen });

  const [updateChannel, { isLoading: updating }] = useUpdateChannelMutation();
  const [addMember, { isLoading: addingMember }] = useAddChannelMemberMutation();
  const [removeMember] = useRemoveChannelMemberMutation();
  const [leaveChannel] = useLeaveChannelMutation();
  const [updatePreferences] = useUpdateChannelPreferencesMutation();

  const { data: pinnedData, isLoading: loadingPinned } = useGetPinnedMessagesQuery(channelId, { skip: !channelId || !isOpen });
  const { data: mediaData, isLoading: loadingMedia } = useGetMediaMessagesQuery({ chatId: channelId, type: mediaFilter }, { skip: !channelId || !isOpen || activeTab !== 'files' });
  const [togglePin] = useTogglePinMessageMutation();

  const renderMediaItem = (message: any) => {
    if (message.type === "image") {
      return (
        <div
          key={message.id}
          className="relative aspect-square rounded-sm border border-border overflow-hidden group cursor-pointer"
        >
          <img
            src={getMediaUrl(message.content || "")}
            alt="Media"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              size="icon"
              variant="secondary"
              className="h-6 w-6 rounded-sm"
              onClick={(e) => {
                e.stopPropagation();
                window.open(getMediaUrl(message.content || ""), "_blank");
              }}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      );
    }

    if (message.type === "video") {
      return (
        <div
          key={message.id}
          className="relative aspect-video rounded-sm border border-border overflow-hidden group cursor-pointer bg-slate-950"
        >
          <video
            src={getMediaUrl(message.content || "")}
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Video className="h-5 w-5 text-white opacity-85" />
          </div>
        </div>
      );
    }

    return (
      <div
        key={message.id}
        className="flex items-center gap-2.5 p-2 bg-muted/50 rounded-sm hover:bg-muted dark:hover:bg-muted transition-all border border-border group"
      >
        <div className="w-7 h-7 bg-muted dark:bg-muted rounded-sm flex items-center justify-center flex-shrink-0 border border-border">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0 font-mono">
          <p className="text-[10px] font-bold text-foreground truncate">{message.file?.name || "File"}</p>
          <p className="text-[9px] text-muted-foreground truncate mt-0.5">
            {message.sender?.name} • {message.time ? format(new Date(message.time), 'dd/MM') : '--/--'}
          </p>
        </div>
      </div>
    );
  };

  // Workspace members to invite from
  const workspaceId = channel?.workspaceId;
  const { data: wsMembers } = useGetWorkspaceMembersQuery(
    { workspaceId: workspaceId! },
    { skip: !workspaceId || activeTab !== 'members' }
  );

  const myMembership = membersData?.members?.find((m) => m.userId === currentUser?.id);
  const isMuted = myMembership?.isMuted ?? false;
  const isOwnerOrModerator = myMembership?.role === 'CHANNEL_OWNER' || myMembership?.role === 'CHANNEL_MODERATOR';

  const Icon = channel?.type === 'PRIVATE' || (channel?.type as string) === 'GUEST' ? Lock : Hash;

  const memberIds = new Set(membersData?.members?.map((m) => m.userId) || []);
  const availableToInvite = (wsMembers?.items || []).filter(
    (m: any) => !memberIds.has(m.userId) && ((m.user?.name || m.userId) as string).toLowerCase().includes(addSearch.toLowerCase())
  );

  const filteredMembers = membersData?.members?.filter((m) =>
    (m.user?.name || m.userId).toLowerCase().includes(memberSearch.toLowerCase())
  ) || [];

  const handleSaveSettings = async () => {
    setError(null);
    if (!editName.trim()) {
      setError('Tên nhóm không được để trống!');
      editNameRef.current?.focus();
      return;
    }
    try {
      await updateChannel({
        channelId,
        name: editName.trim(),
        description: editDescription || undefined,
        topic: editTopic || undefined,
      }).unwrap();
      toast.success('Đã cập nhật kênh!');
      setEditMode(false);
    } catch (e: any) {
      if (e?.data?.errorCode === 'DUPLICATE_GROUP_NAME') {
        setError(e.data.message || 'Tên nhóm đã tồn tại.');
        editNameRef.current?.focus();
        toast.error('Cập nhật nhóm thất bại, vui lòng kiểm tra lại thông tin');
      } else {
        toast.error(e?.data?.message || 'Cập nhật thất bại');
      }
    }
  };

  const handleAddMember = async (userId: string, userName: string) => {
    try {
      await addMember({ channelId, targetUserId: userId }).unwrap();
      toast.success(`Đã thêm ${userName} vào kênh!`);
    } catch (e: any) {
      toast.error(e?.data?.message || 'Thêm thành viên thất bại');
    }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!confirm(`Xóa ${userName} khỏi kênh?`)) return;
    try {
      await removeMember({ channelId, targetUserId: userId }).unwrap();
      toast.success(`Đã xóa ${userName}`);
    } catch (e: any) {
      toast.error(e?.data?.message || 'Xóa thất bại');
    }
  };

  const handleLeave = async () => {
    if (!confirm('Rời khỏi kênh này?')) return;
    try {
      await leaveChannel(channelId).unwrap();
      toast.success('Đã rời kênh');
      onLeaveChannel?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.data?.message || 'Không thể rời kênh');
    }
  };

  const handleToggleMute = async () => {
    try {
      await updatePreferences({ channelId, isMuted: !isMuted }).unwrap();
      toast.success(isMuted ? 'Đã bật thông báo' : 'Đã tắt thông báo');
    } catch (e: any) {
      toast.error('Cập nhật thất bại');
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent 
        style={{ width: '320px', maxWidth: '320px' }} 
        className="!w-80 !max-w-80 p-0 flex flex-col border-l border-border bg-background shadow-2xl z-50 font-mono no-scrollbar"
      >
        <ScrollArea className="flex-1 h-full custom-scrollbar no-scrollbar">
          <div className="flex flex-col min-h-full">
            {/* Minimalist Tech Header Section */}
            <div className="h-16 bg-muted dark:bg-muted border-b border-border w-full shrink-0 relative flex items-center px-4">
              <div className="h-8 w-8 rounded-sm bg-background border border-border flex items-center justify-center mr-3 shadow-none shrink-0">
                <div className="h-6 w-6 rounded-sm bg-muted dark:bg-muted/50 flex items-center justify-center">
                  <Icon size={14} className="text-foreground" />
                </div>
              </div>
              <div className="min-w-0">
                <h2 className="text-xs font-bold text-foreground truncate uppercase tracking-wider">#{channel?.name || '...'}</h2>
                <p className="text-[9px] text-muted-foreground leading-none mt-0.5">INFO_SIDEBAR_PANEL</p>
              </div>
            </div>

            {/* Sticky Tabs Navigation (Sleek Geometric Lines) */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border flex px-2 shrink-0">
              {(['about', 'members', 'files', 'settings'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-[9px] font-bold uppercase tracking-wider transition-all border-b-2 font-mono ${
                    activeTab === tab
                      ? 'text-foreground border-slate-900 dark:border-border'
                      : 'text-muted-foreground border-transparent hover:text-muted-foreground dark:hover:text-foreground'
                  }`}
                >
                  {tab === 'about' ? 'Về kênh' : tab === 'members' ? 'Thành viên' : tab === 'files' ? 'Media' : 'Cài đặt'}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1">
              {loadingChannel ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* ── ABOUT TAB ── */}
                  {activeTab === 'about' && (
                    <div className="p-4 space-y-4">
                      {/* Stats grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted/50 border border-border rounded-sm p-2.5 text-center font-mono">
                          <p className="text-sm font-bold text-foreground">{channel?._count?.members ?? 0}</p>
                          <p className="text-[8px] uppercase tracking-widest text-muted-foreground font-bold mt-0.5">Thành viên</p>
                        </div>
                        <div className="bg-muted/50 border border-border rounded-sm p-2.5 text-center font-mono">
                          <p className="text-sm font-bold text-foreground">{channel?._count?.messages ?? 0}</p>
                          <p className="text-[8px] uppercase tracking-widest text-muted-foreground font-bold mt-0.5">Tin nhắn</p>
                        </div>
                      </div>

                      {/* Type badge status tags */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant="secondary"
                          className={`rounded-sm shadow-none border font-mono text-[9px] uppercase tracking-wider font-bold ${
                            channel?.type === 'PUBLIC' 
                              ? 'bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-500 border-emerald-250/20' 
                              : 'bg-amber-50/50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-500 border-amber-250/20'
                          }`}
                        >
                          {channel?.type === 'PUBLIC' ? 'Công khai' : channel?.type === 'PRIVATE' ? 'Riêng tư' : 'Khách'}
                        </Badge>
                        {channel?.isDefault && (
                          <Badge variant="secondary" className="rounded-sm shadow-none border border-blue-200/40 bg-blue-50/50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-500 dark:border-blue-900/20 font-mono text-[9px] uppercase tracking-wider font-bold">Mặc định</Badge>
                        )}
                        {channel?.isReadOnly && (
                          <Badge variant="secondary" className="rounded-sm shadow-none border border-emerald-200/40 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-500 dark:border-emerald-900/20 font-mono text-[9px] uppercase tracking-wider font-bold">Chỉ đọc</Badge>
                        )}
                      </div>

                      {/* Description */}
                      <div className="font-mono">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Mô tả</p>
                        <p className="text-xs text-muted-foreground leading-relaxed bg-muted/20 border border-border/50 p-2 rounded-sm min-h-[48px]">
                          {channel?.description || 'Chưa có mô tả.'}
                        </p>
                      </div>

                      {/* Topic */}
                      {channel?.topic && (
                        <div className="font-mono">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Chủ đề</p>
                          <p className="text-xs text-muted-foreground leading-relaxed bg-muted/20 border border-border/50 p-2 rounded-sm">{channel.topic}</p>
                        </div>
                      )}

                      {/* Created */}
                      <div className="font-mono">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Ngày khởi tạo</p>
                        <p className="text-xs text-muted-foreground font-semibold">
                          {channel?.createdAt ? format(new Date(channel.createdAt), 'dd/MM/yyyy') : '—'}
                        </p>
                      </div>

                      <Separator className="bg-muted/60 dark:bg-white/[0.06]" />

                      {/* Members Preview */}
                      <div className="space-y-3 font-mono">
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Thành viên xem trước</p>
                          <button 
                            onClick={() => setActiveTab('members')}
                            className="text-[9px] text-foreground font-bold hover:underline"
                          >
                            [ XEM TẤT CẢ ]
                          </button>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                           {membersData?.members?.slice(0, 7).map((m) => (
                             <Avatar key={m.userId} className="h-7 w-7 border border-border shadow-none shrink-0 rounded-sm">
                               <AvatarImage src={getAvatarUrl(m.user?.avatar, m.user?.name || '')} className="rounded-sm" />
                               <AvatarFallback className="text-[9px] font-bold bg-muted dark:bg-muted text-muted-foreground rounded-sm">
                                 {m.user?.name?.[0].toUpperCase()}
                               </AvatarFallback>
                             </Avatar>
                           ))}
                           {(membersData?.total || 0) > 7 && (
                             <div className="h-7 w-7 rounded-sm bg-muted dark:bg-muted border border-border flex items-center justify-center text-[9px] text-muted-foreground font-bold">
                               +{((membersData?.total || 0) - 7)}
                             </div>
                           )}
                        </div>
                      </div>

                      <Separator className="bg-muted/60 dark:bg-white/[0.06]" />

                      {/* Media Preview Section */}
                      <div className="space-y-3 font-mono">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Thư viện ảnh gần đây</h3>
                          <button onClick={() => setActiveTab('files')} className="text-[9px] text-foreground font-bold hover:underline">[ XEM TẤT CẢ ]</button>
                        </div>
                        {loadingMedia ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
                        ) : (mediaData?.media || []).length > 0 ? (
                          <div className="grid grid-cols-4 gap-1.5">
                            {(mediaData?.media || []).filter((m: any) => m.type === 'image').slice(0, 4).map((msg: any) => (
                              <div key={msg.id} className="aspect-square rounded-sm overflow-hidden cursor-pointer hover:opacity-85 transition-opacity border border-border">
                                <img src={getMediaUrl(msg.content || "")} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                            {(mediaData?.media || []).filter((m: any) => m.type === 'image').length === 0 && (
                              <div className="col-span-4 text-center py-3 bg-muted/50 border border-dashed border-border rounded-sm">
                                <p className="text-[9px] text-muted-foreground italic">Không có hình ảnh nào</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-center py-4 text-[9px] text-muted-foreground italic bg-muted/50 border border-dashed border-border rounded-sm">Chưa có tệp tin nào được tải lên</p>
                        )}
                      </div>

                      <Separator className="bg-muted/60 dark:bg-white/[0.06]" />

                      {/* Pinned Messages Preview */}
                      <div className="space-y-3 font-mono">
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Tin nhắn đã ghim</p>
                          <Badge variant="secondary" className="h-4 px-1.5 text-[9px] bg-muted border border-border dark:bg-muted dark:border-border rounded-sm font-mono shadow-none">{pinnedData?.pinnedMessages?.length || 0}</Badge>
                        </div>
                        {loadingPinned ? (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />
                        ) : pinnedData?.pinnedMessages?.length ? (
                          <div className="space-y-2">
                            {pinnedData.pinnedMessages.slice(0, 3).map((msg) => (
                              <div key={msg.id} className="p-2 rounded-sm bg-muted/50 border border-border/80 dark:bg-muted/35 dark:border-border relative group">
                                <div className="flex items-center gap-1.5 mb-1 font-mono">
                                   <Avatar className="h-4 w-4 rounded-sm">
                                      <AvatarImage src={getAvatarUrl(msg.sender?.avatar, msg.sender?.name || '')} className="rounded-sm" />
                                      <AvatarFallback className="text-[7px] rounded-sm">{msg.sender?.name?.[0]}</AvatarFallback>
                                   </Avatar>
                                   <span className="text-[9px] font-bold text-foreground truncate">{msg.sender?.name}</span>
                                   <span className="text-[8px] text-muted-foreground ml-auto">{msg.time ? format(new Date(msg.time), 'HH:mm') : '--:--'}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                                  <MessageSnippet 
                                    type={msg.type} 
                                    content={msg.content} 
                                    file={(msg as any).file} 
                                    className="text-[10px] text-muted-foreground dark:text-muted-foreground line-clamp-2 leading-relaxed"
                                    iconClassName="h-3 w-3 inline-block align-middle shrink-0 mr-1 text-muted-foreground"
                                  />
                                </div>
                                <button 
                                  onClick={() => togglePin({ messageId: msg.id, chatId: channelId })}
                                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-muted dark:hover:bg-muted rounded-sm"
                                >
                                  <X size={10} className="text-muted-foreground" />
                                </button>
                              </div>
                            ))}
                            {pinnedData.pinnedMessages.length > 3 && (
                              <p className="text-[9px] text-foreground font-bold cursor-pointer hover:underline text-center">
                                [ XEM THÊM {pinnedData.pinnedMessages.length - 3} TIN NHẮN ĐÃ GHIM ]
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-4 rounded-sm border border-dashed border-border">
                            <Pin size={12} className="mx-auto mb-1 text-slate-350 dark:text-muted-foreground" />
                            <p className="text-[9px] text-muted-foreground">Chưa có tin nhắn được ghim</p>
                          </div>
                        )}
                      </div>

                      <Separator className="bg-muted/60 dark:bg-white/[0.06]" />

                      {/* Quick Actions */}
                      <div className="space-y-1.5 font-mono">
                        <button
                          onClick={handleToggleMute}
                          className="w-full flex items-center gap-2.5 p-2 rounded-sm border border-border bg-muted/20 hover:bg-muted dark:bg-muted/10 dark:hover:bg-muted transition-colors text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                        >
                          {isMuted ? <BellOff size={13} className="text-muted-foreground" /> : <Bell size={13} className="text-muted-foreground" />}
                          {isMuted ? 'Bật thông báo' : 'Tắt thông báo'}
                        </button>
                        <button
                          onClick={handleLeave}
                          className="w-full flex items-center gap-2.5 p-2 rounded-sm border border-rose-200 dark:border-red-950/20 bg-rose-50/10 hover:bg-destructive/10 dark:bg-red-950/5 dark:hover:bg-red-950/20 transition-colors text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-500"
                        >
                          <LogOut size={13} />
                          Rời kênh
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── MEMBERS TAB ── */}
                  {activeTab === 'members' && (
                    <div className="p-3 space-y-3 font-mono">
                      {/* Search existing members */}
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Tìm thành viên..."
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          className="pl-8 h-8 rounded-sm border-border bg-muted/20 dark:bg-muted/50 focus-visible:ring-0 focus-visible:border-border dark:focus-visible:border-border text-xs font-mono"
                        />
                      </div>

                      {/* Member list */}
                      {loadingMembers ? (
                        <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                      ) : (
                        <div className="space-y-1">
                          {filteredMembers.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-1.5 rounded-sm hover:bg-muted dark:hover:bg-muted border border-transparent hover:border-border/60 dark:hover:border-white/[0.04] group transition-colors">
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar className="h-6.5 w-6.5 shrink-0 rounded-sm">
                                  <AvatarImage src={getAvatarUrl(member.user?.avatar, member.user?.name || member.userId)} className="rounded-sm" />
                                  <AvatarFallback className="text-[9px] bg-muted dark:bg-muted text-muted-foreground rounded-sm">
                                    {(member.user?.name || 'U')[0].toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold text-foreground dark:text-slate-150 truncate leading-none">{member.user?.name || member.userId}</p>
                                  <p className="text-[8px] text-muted-foreground mt-0.5 leading-none uppercase tracking-wide">
                                    {member.role === 'CHANNEL_OWNER' ? '👑 Chủ sở hữu' : member.role === 'CHANNEL_MODERATOR' ? '🛡 Quản trị' : 'Thành viên'}
                                  </p>
                                </div>
                              </div>
                              {isOwnerOrModerator && member.userId !== currentUser?.id && (
                                <button
                                  onClick={() => handleRemoveMember(member.userId, member.user?.name || member.userId)}
                                  className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded-sm text-rose-500 hover:bg-destructive/10 dark:hover:bg-red-950/30 transition-all border border-transparent hover:border-rose-200/40"
                                >
                                  <X size={11} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add member section (owner/mod only) */}
                      {isOwnerOrModerator && (
                        <>
                          <Separator className="bg-muted/60 dark:bg-white/[0.06]" />
                          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Thêm nhân sự mới</p>
                          <div className="relative">
                            <UserPlus className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                              placeholder="Tìm người trong Workspace..."
                              value={addSearch}
                              onChange={(e) => setAddSearch(e.target.value)}
                              className="pl-8 h-8 rounded-sm border-border bg-muted/20 dark:bg-muted/50 focus-visible:ring-0 focus-visible:border-border dark:focus-visible:border-border text-xs font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            {availableToInvite.map((m: any) => (
                              <div key={m.userId} className="flex items-center justify-between p-1.5 rounded-sm hover:bg-muted dark:hover:bg-muted border border-transparent hover:border-border/60 dark:hover:border-white/[0.04]">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Avatar className="h-6.5 w-6.5 shrink-0 rounded-sm">
                                    <AvatarImage src={getAvatarUrl(m.user?.avatar, m.user?.name || m.userId)} className="rounded-sm" />
                                    <AvatarFallback className="text-[9px] bg-muted dark:bg-muted text-muted-foreground dark:text-zinc-350 rounded-sm">{(m.user?.name || 'U')[0].toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <p className="text-[11px] font-bold text-foreground dark:text-slate-150 truncate leading-none">{m.user?.name || m.userId}</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 text-[10px] font-bold uppercase tracking-wider text-foreground border border-border hover:bg-muted dark:hover:bg-muted rounded-sm px-2 shadow-none"
                                  onClick={() => handleAddMember(m.userId, m.user?.name || m.userId)}
                                  disabled={addingMember}
                                >
                                  Mời
                                </Button>
                              </div>
                            ))}
                            {addSearch && availableToInvite.length === 0 && (
                              <p className="text-[10px] text-center text-muted-foreground py-3 italic">Không tìm thấy nhân sự phù hợp</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* ── MEDIA TAB ── */}
                  {activeTab === 'files' && (
                    <div className="p-4 space-y-4 font-mono">
                      <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-hide no-scrollbar">
                          {[
                              { value: "all", label: "TẤT CẢ", icon: null },
                              { value: "image", label: "ẢNH", icon: ImageIcon },
                              { value: "video", label: "VIDEO", icon: Video },
                              { value: "file", label: "TÀI LIỆU", icon: FileText },
                          ].map(({ value, label, icon: IconComponent }) => (
                              <Button
                                  key={value}
                                  size="sm"
                                  variant={mediaFilter === value ? "default" : "outline"}
                                  onClick={() => setMediaFilter(value as any)}
                                  className="h-6 px-2 text-[9px] font-bold font-mono tracking-wider flex items-center gap-1 shrink-0 rounded-sm shadow-none"
                              >
                                  {IconComponent && <IconComponent className="h-3 w-3" />}
                                  {label}
                              </Button>
                          ))}
                      </div>

                      {loadingMedia ? (
                        <div className="flex justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                      ) : mediaData?.media?.length ? (
                        <div className={`
                            ${mediaFilter === "file" || (mediaFilter === "all" && mediaData.media.every((m: any) => m.type === "file"))
                                ? "space-y-2"
                                : "grid grid-cols-3 gap-1.5"
                            }
                        `}>
                          {mediaData.media.map((msg: any) => renderMediaItem(msg))}
                        </div>
                      ) : (
                        <div className="text-center py-12 px-4 bg-muted/50 rounded-sm border border-dashed border-border">
                          <div className="h-10 w-10 bg-white dark:bg-muted border border-border rounded-sm flex items-center justify-center mx-auto mb-3 shadow-none">
                              <Paperclip size={18} className="text-slate-350 dark:text-muted-foreground" />
                          </div>
                          <h4 className="text-[11px] font-bold text-foreground dark:text-white uppercase tracking-wider">Thư viện trống</h4>
                          <p className="text-[9px] text-muted-foreground mt-1 leading-normal">Ảnh, tệp tin và các tài liệu trao đổi trong kênh này sẽ được tự động đồng bộ tại đây.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── SETTINGS TAB ── */}
                  {activeTab === 'settings' && (
                    <div className="p-4 space-y-4 font-mono">
                      {isOwnerOrModerator ? (
                        <>
                          <div className="flex items-center justify-between border-b border-border/60 dark:border-border pb-2">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-foreground">Cấu hình kênh</p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6.5 text-[9px] font-bold font-mono uppercase tracking-wider gap-1.5 rounded-sm shadow-none"
                              onClick={() => {
                                if (!editMode) {
                                  setEditName(channel?.name || '');
                                  setEditDescription(channel?.description || '');
                                  setEditTopic(channel?.topic || '');
                                }
                                setEditMode(!editMode);
                                setError(null);
                              }}
                            >
                              <Pencil size={11} />
                              {editMode ? 'Hủy' : 'Sửa'}
                            </Button>
                          </div>

                          {editMode ? (
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">Tên kênh</label>
                                <Input
                                  ref={editNameRef}
                                  value={editName}
                                  onChange={(e) => {
                                    setEditName(e.target.value);
                                    if (error) setError(null);
                                  }}
                                  className={`h-8 text-xs rounded-sm border font-mono transition-colors ${
                                    error 
                                      ? 'border-red-500 focus-visible:border-red-500 dark:border-red-550 dark:focus-visible:border-red-550 focus-visible:ring-0 focus-visible:ring-offset-0' 
                                      : 'border-border'
                                  }`}
                                  placeholder="tên-kênh"
                                />
                                {error && (
                                  <span className="text-[10px] font-mono font-medium text-red-500 dark:text-red-400 mt-1 block">
                                    {error}
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">Mô tả</label>
                                <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="text-xs resize-none rounded-sm border-border" rows={3} placeholder="Kênh này dùng để..." />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">Chủ đề thảo luận</label>
                                <Input value={editTopic} onChange={(e) => setEditTopic(e.target.value)} className="h-8 text-xs rounded-sm border-border" placeholder="Chủ đề đang thảo luận..." />
                              </div>
                              <Button onClick={handleSaveSettings} disabled={updating} className="w-full h-8 text-[10px] font-bold uppercase tracking-wider rounded-sm gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-muted dark:hover:bg-muted dark:text-foreground shadow-none border border-transparent active:scale-[0.98] transition-all">
                                {updating ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                Lưu thiết lập
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-3.5 text-xs">
                              <div className="space-y-0.5">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Tên định danh</p>
                                <p className="text-foreground font-bold font-mono">#{channel?.name}</p>
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Mô tả chi tiết</p>
                                <p className="text-muted-foreground leading-normal">{channel?.description || 'Chưa cấu hình mô tả.'}</p>
                              </div>
                              {channel?.topic && (
                                <div className="space-y-0.5">
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Chủ đề hiện tại</p>
                                  <p className="text-muted-foreground leading-normal">{channel.topic}</p>
                                </div>
                              )}
                              <Separator className="bg-muted/60 dark:bg-white/[0.06]" />
                              <div className="flex items-center justify-between py-1 bg-muted/10 border border-border p-2.5 rounded-sm">
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-foreground dark:text-foreground">Chế độ Chỉ đọc</p>
                                  <p className="text-[8px] text-muted-foreground mt-0.5 leading-none">Chỉ Admin mới có quyền phát ngôn</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant={channel?.isReadOnly ? "default" : "outline"}
                                  className={`h-6 text-[8px] font-bold uppercase tracking-wider rounded-sm shadow-none ${
                                    channel?.isReadOnly 
                                      ? 'bg-slate-900 hover:bg-slate-800 dark:bg-muted dark:hover:bg-muted dark:text-foreground border-transparent' 
                                      : 'border-border hover:bg-muted dark:hover:bg-muted text-muted-foreground'
                                  }`}
                                  onClick={async () => {
                                    try {
                                      await updateChannel({ channelId, isReadOnly: !channel?.isReadOnly }).unwrap();
                                      toast.success(channel?.isReadOnly ? 'Đã tắt chế độ chỉ đọc' : 'Đã bật chế độ chỉ đọc');
                                    } catch (e) {
                                      toast.error('Cập nhật thất bại');
                                    }
                                  }}
                                >
                                  {channel?.isReadOnly ? 'Đang bật' : 'Đang tắt'}
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-8 bg-muted/50 border border-dashed border-border rounded-sm">
                          <Settings size={20} className="mx-auto mb-2 text-slate-350 dark:text-muted-foreground animate-spin" style={{ animationDuration: '6s' }} />
                          <p className="text-[10px] text-muted-foreground dark:text-muted-foreground px-4 leading-normal">Chỉ Chủ sở hữu kênh hoặc Quản trị viên mới được cấu hình cài đặt kỹ thuật.</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
