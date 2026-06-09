'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2, Users, Check, UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchDirectoryQuery } from '@/src/redux/feature/userApi';
import { useCreateGroupChatMutation } from '@/src/redux/feature/chatApi';
import { getAvatarUrl } from '@/src/utils/image-utils';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/redux/store';

interface GroupCreationModalProps {
    open: boolean;
    onClose: () => void;
    onChatCreated: (chatId: string) => void;
}

export function GroupCreationModal({ open, onClose, onChatCreated }: GroupCreationModalProps) {
    const [groupName, setGroupName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const currentWorkspaceId = useSelector((state: RootState) => state.workspace.currentWorkspaceId);
    const { data, isLoading, isFetching } = useSearchDirectoryQuery({ searchTerm: debouncedSearch, workspaceId: currentWorkspaceId || undefined }, {
        // skip: debouncedSearch.length < 2,
    });

    const [createGroupChat, { isLoading: creatingGroup }] = useCreateGroupChatMutation();

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const users = data?.users || [];
    const showLoading = isLoading || isFetching;

    // Toggle member selection
    const toggleMember = (memberId: string) => {
        setSelectedMembers((prev) =>
            prev.includes(memberId)
                ? prev.filter((id) => id !== memberId)
                : [...prev, memberId]
        );
    };

    // Create group
    const handleCreateGroup = async () => {
        setError(null);
        if (!groupName.trim()) {
            setError('Vui lòng nhập tên nhóm!');
            inputRef.current?.focus();
            return;
        }
        if (selectedMembers.length === 0) {
            toast.error('Vui lòng chọn ít nhất 1 thành viên!');
            return;
        }

        try {
            const result = await createGroupChat({
                name: groupName.trim(),
                memberIds: selectedMembers,
            }).unwrap();
            toast.success('Tạo nhóm thành công!');
            onChatCreated(result.chat.id);
            handleClose();
        } catch (err: any) {
            if (err?.data?.errorCode === 'DUPLICATE_GROUP_NAME') {
                setError(err.data.message || 'Tên nhóm đã tồn tại.');
                inputRef.current?.focus();
                toast.error('Tạo nhóm thất bại, vui lòng kiểm tra lại thông tin');
            } else {
                toast.error(err?.data?.message || 'Lỗi tạo nhóm!');
            }
        }
    };

    // Reset state on close
    const handleClose = () => {
        setGroupName('');
        setSearchTerm('');
        setDebouncedSearch('');
        setSelectedMembers([]);
        setError(null);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md rounded-sm border border-border bg-background p-6 shadow-2xl [&>button]:rounded-sm">
                <DialogHeader className="border-b border-border pb-4">
                    <DialogTitle className="text-sm font-semibold tracking-wider uppercase font-mono text-foreground flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-500" />
                        Tạo nhóm mới
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                    {/* Group name input */}
                    <div>
                        <Label htmlFor="groupName" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block font-mono">
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
                            className={`bg-muted/40 border rounded-sm text-xs h-9 focus-visible:ring-0 focus-visible:ring-offset-0 font-mono transition-colors text-foreground ${
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

                    {/* Search directory */}
                    <div>
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block font-mono">
                            Thêm thành viên
                        </Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm theo tên hoặc email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 bg-muted/40 border border-border rounded-sm text-xs h-9 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-blue-500 font-mono transition-colors text-foreground"
                            />
                        </div>
                    </div>

                    {/* Selected members count */}
                    {selectedMembers.length > 0 && (
                        <div className="flex items-center gap-2 text-xs font-mono font-medium text-primary bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 px-3 py-1.5 rounded-sm">
                            <Check className="h-3.5 w-3.5" />
                            <span>Đã chọn: <span className="font-bold underline">{selectedMembers.length}</span> thành viên</span>
                        </div>
                    )}

                    {/* Search results / user list */}
                    <ScrollArea className="h-64 rounded-sm border border-border bg-muted/20 p-2">
                        {showLoading ? (
                            <div className="flex h-full items-center justify-center py-10">
                                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                            </div>
                        ) : users.length > 0 ? (
                            <div className="flex flex-col gap-1">
                                {users.map((user) => (
                                    <div
                                        key={user.id}
                                        onClick={() => toggleMember(user.id)}
                                        className={`flex items-center gap-3 p-2 rounded-sm cursor-pointer transition-all border ${
                                            selectedMembers.includes(user.id)
                                                ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-200 dark:border-blue-905/30'
                                                : 'border-transparent hover:bg-muted/50 dark:hover:bg-muted/10'
                                        }`}
                                    >
                                        <Checkbox
                                            checked={selectedMembers.includes(user.id)}
                                            onCheckedChange={() => toggleMember(user.id)}
                                            className="pointer-events-none rounded-sm border-border dark:border-border data-[state=checked]:bg-primary data-[state=checked]:border-blue-600 dark:data-[state=checked]:bg-blue-500 dark:data-[state=checked]:border-blue-500"
                                        />
                                        <Avatar className="h-8 w-8 rounded-sm border border-border">
                                            <AvatarImage className="object-cover" src={getAvatarUrl(user.avatar, user.name)} />
                                            <AvatarFallback className="rounded-sm bg-muted text-muted-foreground font-mono text-xs font-semibold">
                                                {user.name ? user.name.slice(0, 2).toUpperCase() : 'U'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 overflow-hidden text-left">
                                            <h4 className="text-xs font-semibold text-foreground truncate">
                                                {user.name}
                                            </h4>
                                            <p className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate">
                                                {user.email}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : debouncedSearch.length >= 2 ? (
                            <div className="flex h-56 flex-col items-center justify-center text-muted-foreground dark:text-muted-foreground space-y-2">
                                <UserIcon className="h-6 w-6 opacity-40" />
                                <p className="text-xs font-mono">Không tìm thấy người dùng.</p>
                            </div>
                        ) : (
                            <div className="flex h-56 flex-col items-center justify-center text-muted-foreground dark:text-muted-foreground space-y-2">
                                <Search className="h-6 w-6 opacity-40" />
                                <p className="text-xs font-mono">Nhập ít nhất 2 ký tự để tìm kiếm.</p>
                            </div>
                        )}
                    </ScrollArea>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2 border-t border-border">
                        <Button
                            variant="outline"
                            className="flex-1 rounded-sm border border-border hover:bg-muted dark:hover:bg-muted/10 font-mono text-xs font-medium h-9 uppercase tracking-wider transition-colors"
                            onClick={handleClose}
                        >
                            Hủy
                        </Button>
                        <Button
                            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-white rounded-sm font-mono text-xs font-medium h-9 uppercase tracking-wider transition-colors"
                            onClick={handleCreateGroup}
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
                </div>
            </DialogContent>
        </Dialog>
    );
}