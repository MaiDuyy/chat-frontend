'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Search, User as UserIcon, X } from 'lucide-react';
import { useSearchDirectoryQuery } from '@/src/redux/feature/userApi';
import { useGetOrCreatePrivateChatMutation } from '@/src/redux/feature/chatApi';
import { getAvatarUrl } from '@/src/utils/image-utils';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/redux/store';

interface DirectorySearchModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DirectorySearchModal({ open, onOpenChange }: DirectorySearchModalProps) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const currentWorkspaceId = useSelector((state: RootState) => state.workspace.currentWorkspaceId);
    const { data, isLoading, isFetching } = useSearchDirectoryQuery(
        { searchTerm: debouncedSearch, workspaceId: currentWorkspaceId || undefined }
    );
    const [getOrCreateChat, { isLoading: isCreating }] = useGetOrCreatePrivateChatMutation();

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleSelectUser = async (userId: string) => {
        try {
            const result = await getOrCreateChat({ partnerId: userId }).unwrap();
            onOpenChange(false);
            if (result?.chat?.id) router.push(`/chat/${result.chat.id}`);
        } catch {}
    };

    const users = data?.users || [];
    const showLoading = isLoading || isFetching;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-sm border border-border bg-background p-0 shadow-2xl [&>button]:rounded-sm overflow-hidden">
                {/* Header with search input */}
                <div className="px-5 pt-5 pb-3 border-b border-border dark:border-white/[0.04]">
                    <DialogTitle className="text-sm font-semibold uppercase font-mono tracking-wider text-foreground dark:text-foreground">
                        Tìm kiếm thành viên
                    </DialogTitle>
                    <div className="relative mt-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground dark:text-muted-foreground" />
                        <Input
                            placeholder="Tìm theo tên hoặc email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-8 h-9 bg-muted dark:bg-muted/40 border border-border rounded-sm text-xs focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-blue-500 font-mono transition-colors text-slate-850 dark:text-slate-150"
                            autoFocus
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground dark:text-muted-foreground hover:text-muted-foreground cursor-pointer"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Results */}
                <div className="overflow-y-auto max-h-[320px] custom-scrollbar p-1">
                    {showLoading ? (
                        <div className="flex items-center justify-center h-24">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                    ) : users.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                            {users.map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => handleSelectUser(user.id)}
                                    disabled={isCreating}
                                    className="flex items-center gap-3 w-full px-4 py-2 hover:bg-muted dark:hover:bg-muted/10 transition-colors text-left disabled:opacity-50 border-b border-border/50 dark:border-white/[0.03] last:border-0 cursor-pointer rounded-sm"
                                >
                                    <Avatar className="h-8 w-8 rounded-sm border border-border shrink-0">
                                        <AvatarImage className="object-cover" src={getAvatarUrl(user.avatar, user.name)} />
                                        <AvatarFallback className="rounded-sm bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground font-mono text-[10px] font-semibold">
                                            {user.name ? user.name.slice(0, 2).toUpperCase() : 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 overflow-hidden text-left">
                                        <p className="text-xs font-semibold text-foreground dark:text-foreground truncate">{user.name}</p>
                                        <p className="text-[10px] font-mono text-muted-foreground dark:text-muted-foreground mt-0.5 truncate">{user.email}</p>
                                    </div>
                                    {isCreating && (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-450 dark:text-muted-foreground gap-2">
                            {debouncedSearch.length >= 2 ? (
                                <>
                                    <UserIcon className="h-6 w-6 text-muted-foreground dark:text-muted-foreground" />
                                    <p className="text-xs font-mono">Không tìm thấy thành viên nào.</p>
                                </>
                            ) : (
                                <>
                                    <Search className="h-6 w-6 text-muted-foreground dark:text-muted-foreground" />
                                    <p className="text-xs font-mono">Nhập ít nhất 2 ký tự để tìm kiếm.</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
