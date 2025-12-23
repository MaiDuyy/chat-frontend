"use client";

import { useState, useRef } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
    Camera,
    UserPlus,
    UserMinus,
    Users,
    Crown,
    Search,
    Loader2,
    Pencil,
    X,
    Check,
} from "lucide-react";
import {
    useGetChatByIdQuery,
    useUpdateChatMutation,
    useAddMembersMutation,
    useRemoveMemberMutation,
} from "@/src/redux/feature/chatApi";
import { useGetFriendsQuery } from "@/src/redux/feature/friendApi";
import { useUploadGroupAvatarMutation } from "@/src/redux/feature/uploadApi";

interface GroupSettingsPanelProps {
    chatId: string;
    isOpen: boolean;
    onClose: () => void;
    currentUserId?: string;
}

interface Participant {
    id: string;
    accountId?: string;
    isAdmin?: boolean;
    account?: {
        id: string;
        name: string;
        avatar: string | null;
    };
    // Trường hợp dữ liệu trả về trực tiếp từ participants
    name?: string;
    avatar?: string | null;
}

interface Friend {
    id: string;
    name: string;
    avatar?: string | null;
}

export default function GroupSettingsPanel({
    chatId,
    isOpen,
    onClose,
    currentUserId,
}: GroupSettingsPanelProps) {
    // States
    const [isEditingName, setIsEditingName] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
    const [showRemoveMemberDialog, setShowRemoveMemberDialog] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<Participant | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // API hooks
    const { data: chatData, isLoading: chatLoading, refetch } = useGetChatByIdQuery(chatId, {
        skip: !isOpen || !chatId,
    });
    const { data: friendsData } = useGetFriendsQuery();
    const [updateChat, { isLoading: isUpdating }] = useUpdateChatMutation();
    const [addMembers, { isLoading: isAddingMembers }] = useAddMembersMutation();
    const [removeMember, { isLoading: isRemovingMember }] = useRemoveMemberMutation();
    const [uploadGroupAvatar] = useUploadGroupAvatarMutation();

    const chat = chatData?.chat;
    const participants: Participant[] = (chat?.participants || []) as Participant[];
    const friends: Friend[] = (friendsData?.friends || []) as Friend[];

    // Helper để lấy id thực của member
    const getMemberId = (p: Participant) => p.account?.id || p.id;
    const getMemberName = (p: Participant) => p.account?.name || p.name || "Người dùng";
    const getMemberAvatar = (p: Participant) => p.account?.avatar || p.avatar;

    // Filter friends not already in group
    const existingMemberIds = participants.map((p) => getMemberId(p));
    const availableFriends = friends.filter(
        (f) => !existingMemberIds.includes(f.id) &&
            f.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Get initials
    const getInitials = (name: string) => {
        return (name || "?")
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    // Handle update group name
    const handleUpdateName = async () => {
        if (!newGroupName.trim()) {
            toast.error("Tên nhóm không được để trống");
            return;
        }

        try {
            await updateChat({ chatId, name: newGroupName.trim() }).unwrap();
            toast.success("Đã cập nhật tên nhóm");
            setIsEditingName(false);
            refetch();
        } catch (error: any) {
            toast.error(error?.data?.message || "Lỗi cập nhật tên nhóm");
        }
    };

    // Handle avatar upload
    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            toast.error("Vui lòng chọn file ảnh");
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Ảnh không được vượt quá 5MB");
            return;
        }

        setIsUploadingAvatar(true);

        try {
            // Upload to server with type=group
            const formData = new FormData();
            formData.append("file", file);

            const uploadResult = await uploadGroupAvatar(formData).unwrap();
            const avatarUrl = uploadResult.url;

            // Update chat with new avatar
            await updateChat({ chatId, avatar: avatarUrl }).unwrap();
            toast.success("Đã cập nhật ảnh nhóm");
            refetch();
        } catch (error: any) {
            console.error("Upload error:", error);
            toast.error(error?.data?.message || "Lỗi tải ảnh lên");
        } finally {
            setIsUploadingAvatar(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    // Handle add members
    const handleAddMembers = async () => {
        if (selectedFriends.length === 0) {
            toast.error("Vui lòng chọn ít nhất 1 người");
            return;
        }

        try {
            await addMembers({ chatId, memberIds: selectedFriends }).unwrap();
            toast.success(`Đã thêm ${selectedFriends.length} thành viên`);
            setShowAddMemberDialog(false);
            setSelectedFriends([]);
            setSearchQuery("");
            refetch();
        } catch (error: any) {
            toast.error(error?.data?.message || "Lỗi thêm thành viên");
        }
    };

    // Handle remove member
    const handleRemoveMember = async () => {
        if (!memberToRemove) return;

        try {
            await removeMember({
                chatId,
                memberId: getMemberId(memberToRemove),
            }).unwrap();
            toast.success(`Đã xóa ${getMemberName(memberToRemove)} khỏi nhóm`);
            setShowRemoveMemberDialog(false);
            setMemberToRemove(null);
            refetch();
        } catch (error: any) {
            toast.error(error?.data?.message || "Lỗi xóa thành viên");
        }
    };

    // Toggle friend selection
    const toggleFriendSelection = (friendId: string) => {
        setSelectedFriends((prev) =>
            prev.includes(friendId)
                ? prev.filter((id) => id !== friendId)
                : [...prev, friendId]
        );
    };

    if (!isOpen) return null;

    return (
        <>
            <Sheet open={isOpen} onOpenChange={onClose}>
                <SheetContent className="w-[400px] sm:w-[450px] p-0">
                    <SheetHeader className="p-4 border-b">
                        <SheetTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Thông tin nhóm
                        </SheetTitle>
                    </SheetHeader>

                    {chatLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        </div>
                    ) : (
                        <ScrollArea className="h-[calc(100vh-80px)]">
                            {/* Group Avatar & Name */}
                            <div className="p-6 flex flex-col items-center border-b">
                                {/* Avatar */}
                                <div className="relative group mb-4">
                                    <Avatar className="w-24 h-24 ring-4 ring-white dark:ring-gray-800 shadow-lg">
                                        <AvatarImage src={chat?.avatar || undefined} />
                                        <AvatarFallback className="bg-gradient-to-br from-green-400 to-green-600 text-white text-2xl">
                                            {getInitials(chat?.name || "Nhóm")}
                                        </AvatarFallback>
                                    </Avatar>
                                    <button
                                        onClick={handleAvatarClick}
                                        disabled={isUploadingAvatar}
                                        className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg transition-all"
                                    >
                                        {isUploadingAvatar ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Camera className="w-4 h-4" />
                                        )}
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleAvatarUpload}
                                    />
                                </div>

                                {/* Group Name */}
                                {isEditingName ? (
                                    <div className="flex items-center gap-2 w-full max-w-[250px]">
                                        <Input
                                            value={newGroupName}
                                            onChange={(e) => setNewGroupName(e.target.value)}
                                            placeholder="Nhập tên nhóm"
                                            className="text-center"
                                            autoFocus
                                        />
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={handleUpdateName}
                                            disabled={isUpdating}
                                        >
                                            {isUpdating ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Check className="w-4 h-4 text-green-500" />
                                            )}
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => setIsEditingName(false)}
                                        >
                                            <X className="w-4 h-4 text-gray-500" />
                                        </Button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setNewGroupName(chat?.name || "");
                                            setIsEditingName(true);
                                        }}
                                        className="flex items-center gap-2 group"
                                    >
                                        <h2 className="text-xl font-semibold">{chat?.name || "Nhóm chat"}</h2>
                                        <Pencil className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                )}

                                <p className="text-sm text-gray-500 mt-1">
                                    {participants.length} thành viên
                                </p>
                            </div>

                            {/* Members Section */}
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        Thành viên ({participants.length})
                                    </h3>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setShowAddMemberDialog(true)}
                                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                    >
                                        <UserPlus className="w-4 h-4 mr-1" />
                                        Thêm
                                    </Button>
                                </div>

                                {/* Members List */}
                                <div className="space-y-2">
                                    {participants.map((participant) => {
                                        const memberId = getMemberId(participant);
                                        const memberName = getMemberName(participant);
                                        const memberAvatar = getMemberAvatar(participant);
                                        const isCurrentUser = memberId === currentUserId;
                                        const isAdmin = participant.isAdmin;

                                        return (
                                            <div
                                                key={participant.id}
                                                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="w-10 h-10">
                                                        <AvatarImage src={memberAvatar || undefined} />
                                                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                                                            {getInitials(memberName)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium flex items-center gap-2">
                                                            {memberName}
                                                            {isCurrentUser && (
                                                                <span className="text-xs text-gray-500">(Bạn)</span>
                                                            )}
                                                        </p>
                                                        {isAdmin && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                <Crown className="w-3 h-3 mr-1 text-yellow-500" />
                                                                Quản trị viên
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Remove button - don't show for self */}
                                                {!isCurrentUser && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                        onClick={() => {
                                                            setMemberToRemove(participant);
                                                            setShowRemoveMemberDialog(true);
                                                        }}
                                                    >
                                                        <UserMinus className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </ScrollArea>
                    )}
                </SheetContent>
            </Sheet>

            {/* Add Members Dialog */}
            <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5" />
                            Thêm thành viên
                        </DialogTitle>
                        <DialogDescription>
                            Chọn bạn bè để thêm vào nhóm
                        </DialogDescription>
                    </DialogHeader>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Tìm kiếm bạn bè..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {/* Friends List */}
                    <ScrollArea className="h-[300px]">
                        {availableFriends.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">
                                {searchQuery
                                    ? "Không tìm thấy bạn bè"
                                    : "Tất cả bạn bè đã trong nhóm"}
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {availableFriends.map((friend) => (
                                    <div
                                        key={friend.id}
                                        onClick={() => toggleFriendSelection(friend.id)}
                                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedFriends.includes(friend.id)
                                            ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-200"
                                            : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100"
                                            }`}
                                    >
                                        <Checkbox
                                            checked={selectedFriends.includes(friend.id)}
                                            onCheckedChange={() => toggleFriendSelection(friend.id)}
                                        />
                                        <Avatar className="w-10 h-10">
                                            <AvatarImage src={friend.avatar || undefined} />
                                            <AvatarFallback className="bg-gradient-to-br from-purple-400 to-purple-600 text-white">
                                                {getInitials(friend.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{friend.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowAddMemberDialog(false);
                                setSelectedFriends([]);
                                setSearchQuery("");
                            }}
                        >
                            Hủy
                        </Button>
                        <Button
                            onClick={handleAddMembers}
                            disabled={selectedFriends.length === 0 || isAddingMembers}
                        >
                            {isAddingMembers && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Thêm ({selectedFriends.length})
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Remove Member Alert */}
            <AlertDialog open={showRemoveMemberDialog} onOpenChange={setShowRemoveMemberDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xóa thành viên?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc muốn xóa{" "}
                            <span className="font-semibold">{memberToRemove ? getMemberName(memberToRemove) : ""}</span>{" "}
                            khỏi nhóm? Người này sẽ cần được mời lại để tham gia.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setMemberToRemove(null)}>
                            Hủy
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoveMember}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={isRemovingMember}
                        >
                            {isRemovingMember && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Xóa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
