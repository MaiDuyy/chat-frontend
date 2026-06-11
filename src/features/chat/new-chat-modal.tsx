"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchDirectoryQuery } from "@/src/redux/feature/userApi";
import {
    useGetOrCreatePrivateChatMutation,
    useCreateGroupChatMutation,
} from "@/src/redux/feature/chatApi";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Users, MessageCircle, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getAvatarUrl } from "@/src/utils/image-utils";
import { useSelector } from "react-redux";
import { RootState } from "@/src/redux/store";

interface NewChatModalProps {
    open: boolean;
    onClose: () => void;
    onChatCreated: (chatId: string) => void;
}

type TabType = "private" | "group";

export default function NewChatModal({
    open,
    onClose,
    onChatCreated,
}: NewChatModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>("private");
    const [searchQuery, setSearchQuery] = useState("");
    const [groupName, setGroupName] = useState("");
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const currentWorkspaceId = useSelector((state: RootState) => state.workspace.currentWorkspaceId);
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(t);
    }, [searchQuery]);

    const { data: directoryData, isLoading: directoryLoading } = useSearchDirectoryQuery({
        searchTerm: debouncedSearch,
        workspaceId: currentWorkspaceId || undefined
    }, {
        // skip: debouncedSearch.length < 2
    });

    const [createPrivateChat, { isLoading: creatingPrivate }] =
        useGetOrCreatePrivateChatMutation();
    const [createGroupChat, { isLoading: creatingGroup }] =
        useCreateGroupChatMutation();

    const users = directoryData?.users || [];

    // Handle create private chat
    const handleCreatePrivateChat = async (friendId: string) => {
        try {
            const result = await createPrivateChat({ partnerId: friendId }).unwrap();
            onChatCreated(result.chat.id);
            handleClose();
        } catch (error: any) {
            toast.error(error?.data?.message || "Lỗi tạo chat!");
        }
    };

    // Handle create group chat
    const handleCreateGroupChat = async () => {
        setError(null);
        if (!groupName.trim()) {
            setError("Vui lòng nhập tên nhóm!");
            inputRef.current?.focus();
            return;
        }
        if (selectedMembers.length === 0) {
            toast.error("Vui lòng chọn ít nhất 1 thành viên!");
            return;
        }

        try {
            const result = await createGroupChat({
                name: groupName.trim(),
                memberIds: selectedMembers,
            }).unwrap();
            toast.success("Tạo nhóm thành công!");
            onChatCreated(result.chat.id);
            handleClose();
        } catch (err: any) {
            if (err?.data?.errorCode === 'DUPLICATE_GROUP_NAME') {
                setError(err.data.message || 'Tên nhóm đã tồn tại.');
                inputRef.current?.focus();
                toast.error('Tạo nhóm thất bại, vui lòng kiểm tra lại thông tin');
            } else {
                toast.error(err?.data?.message || "Lỗi tạo nhóm!");
            }
        }
    };

    // Toggle member selection
    const toggleMember = (memberId: string) => {
        setSelectedMembers((prev) =>
            prev.includes(memberId)
                ? prev.filter((id) => id !== memberId)
                : [...prev, memberId]
        );
    };

    // Reset state on close
    const handleClose = () => {
        setSearchQuery("");
        setGroupName("");
        setSelectedMembers([]);
        setActiveTab("private");
        setError(null);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md rounded-sm border border-border bg-background p-6 shadow-2xl [&>button]:rounded-sm">
                <DialogHeader className="border-b border-border dark:border-white/[0.04] pb-4">
                    <DialogTitle className="text-sm font-semibold tracking-wider uppercase font-mono text-foreground dark:text-foreground flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-blue-500" />
                        Cuộc trò chuyện mới
                    </DialogTitle>
                </DialogHeader>

                {/* Tabs */}
                <div className="flex bg-muted dark:bg-zinc-950/40 p-0.5 rounded-sm border border-border mb-4">
                    <button
                        onClick={() => setActiveTab("private")}
                        className={`flex-1 py-1.5 text-xs font-mono font-medium tracking-wide uppercase transition-all duration-150 flex items-center justify-center gap-2 rounded-sm ${
                            activeTab === "private"
                                ? "bg-white dark:bg-muted text-primary shadow-sm border border-border/60 dark:border-white/[0.04]"
                                : "text-muted-foreground hover:text-muted-foreground dark:text-muted-foreground dark:hover:text-foreground border border-transparent"
                        }`}
                    >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Chat 1-1
                    </button>
                    <button
                        onClick={() => setActiveTab("group")}
                        className={`flex-1 py-1.5 text-xs font-mono font-medium tracking-wide uppercase transition-all duration-150 flex items-center justify-center gap-2 rounded-sm ${
                            activeTab === "group"
                                ? "bg-white dark:bg-muted text-primary shadow-sm border border-border/60 dark:border-white/[0.04]"
                                : "text-muted-foreground hover:text-muted-foreground dark:text-muted-foreground dark:hover:text-foreground border border-transparent"
                        }`}
                    >
                        <Users className="h-3.5 w-3.5" />
                        Tạo nhóm
                    </button>
                </div>

                {/* Group name input */}
                {activeTab === "group" && (
                    <div className="mb-4">
                        <Label htmlFor="groupName" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground mb-2 block font-mono">
                            Tên nhóm
                        </Label>
                        <Input
                            ref={inputRef}
                            id="groupName"
                            placeholder="Nhập tên nhóm..."
                            value={groupName}
                            onChange={(e) => {
                                setGroupName(e.target.value);
                                if (error) setError(null);
                            }}
                            className={`bg-muted dark:bg-muted/40 border rounded-sm text-xs h-9 focus-visible:ring-0 focus-visible:ring-offset-0 font-mono transition-colors text-slate-850 dark:text-slate-150 ${
                                error 
                                    ? 'border-red-500 focus-visible:border-red-500 dark:border-red-500/80 dark:focus-visible:border-red-500/80' 
                                    : 'border-border focus-visible:border-blue-500'
                            }`}
                        />
                        {error && (
                            <span className="text-[10px] font-mono font-medium text-red-500 dark:text-red-400 mt-1 block">
                                {error}
                            </span>
                        )}
                    </div>
                )}

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
                    <Input
                        placeholder="Tìm bạn bè..."
                        className="pl-9 bg-muted dark:bg-muted/40 border border-border rounded-sm text-xs h-9 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-blue-500 font-mono transition-colors text-slate-850 dark:text-slate-150"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Selected members count */}
                {activeTab === "group" && selectedMembers.length > 0 && (
                    <div className="flex items-center gap-2 mb-3 text-xs font-mono font-medium text-primary bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 px-3 py-1.5 rounded-sm">
                        <Check className="h-3.5 w-3.5" />
                        <span>Đã chọn: <span className="font-bold underline">{selectedMembers.length}</span> thành viên</span>
                    </div>
                )}

                {/* Directory list */}
                <ScrollArea className="h-64 rounded-sm border border-border bg-muted/30 dark:bg-muted/20 p-2">
                    {directoryLoading ? (
                        <div className="flex h-56 flex-col items-center justify-center text-muted-foreground dark:text-muted-foreground">
                            <Loader2 className="w-5 h-5 animate-spin text-blue-500 mb-2" />
                            <p className="text-[10px] font-mono">Đang tìm kiếm...</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="flex h-56 flex-col items-center justify-center text-muted-foreground dark:text-muted-foreground">
                            <p className="text-xs font-mono text-center">
                                {searchQuery.length < 2
                                    ? "Nhập tên hoặc email để tìm kiếm"
                                    : "Không tìm thấy người dùng phù hợp"}
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1 pr-1">
                            {users.map((user) => (
                                <div
                                    key={user.id}
                                    onClick={() =>
                                        activeTab === "private"
                                            ? handleCreatePrivateChat(user.id)
                                            : toggleMember(user.id)
                                    }
                                    className={`flex items-center gap-3 p-2 rounded-sm cursor-pointer transition-all border ${
                                        activeTab === "group" && selectedMembers.includes(user.id)
                                            ? "bg-blue-50/80 dark:bg-blue-950/30 border-blue-200 dark:border-blue-905/30"
                                            : "border-transparent hover:bg-muted/50 dark:hover:bg-muted/10"
                                    }`}
                                >
                                    {activeTab === "group" && (
                                        <Checkbox
                                            checked={selectedMembers.includes(user.id)}
                                            onCheckedChange={() => toggleMember(user.id)}
                                            className="pointer-events-none rounded-sm border-border dark:border-border data-[state=checked]:bg-primary data-[state=checked]:border-blue-600 dark:data-[state=checked]:bg-blue-500 dark:data-[state=checked]:border-blue-500"
                                        />
                                    )}
                                    <Avatar className="h-8 w-8 rounded-sm border border-border">
                                        <AvatarImage className="object-cover" src={getAvatarUrl(user.avatar, user.name)} />
                                        <AvatarFallback className="rounded-sm bg-muted dark:bg-muted text-muted-foreground font-mono text-xs font-semibold">
                                            {user.name.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0 text-left">
                                        <p className="text-xs font-semibold text-foreground dark:text-foreground truncate">
                                            {user.name}
                                        </p>
                                        <p className="text-[10px] font-mono text-muted-foreground dark:text-muted-foreground mt-0.5 truncate">
                                            {user.email || user.status || ""}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                {/* Create group button */}
                {activeTab === "group" && (
                    <div className="mt-4 flex gap-2 pt-2 border-t border-border dark:border-white/[0.04]">
                        <Button
                            variant="outline"
                            className="flex-1 rounded-sm border border-border hover:bg-muted dark:hover:bg-muted/10 font-mono text-xs font-medium h-9 uppercase tracking-wider transition-colors"
                            onClick={handleClose}
                        >
                            Hủy
                        </Button>
                        <Button
                            className="flex-1 bg-primary hover:bg-primary/90 dark:bg-primary/90 dark:hover:bg-primary text-white rounded-sm font-mono text-xs font-medium h-9 uppercase tracking-wider transition-colors"
                            onClick={handleCreateGroupChat}
                            disabled={creatingGroup || !groupName.trim() || selectedMembers.length === 0}
                        >
                            {creatingGroup ? (
                                <span className="flex items-center gap-2 justify-center">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Đang tạo...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2 justify-center">
                                    <Users className="h-3.5 w-3.5" />
                                    Tạo nhóm
                                </span>
                            )}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
