"use client";

import { useState } from "react";
import { Message } from "@/src/type/chat.types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
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
import {
    Reply,
    Copy,
    Trash2,
    RotateCcw,
    Pin,
    Forward,
    MoreHorizontal,
    Smile,
    Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
    useDeleteMessageForMeMutation,
    useRecallMessageMutation,
    useReactMessageMutation,
    useTogglePinMessageMutation,
} from "@/src/redux/feature/messageApi";
import { socketService } from "@/src/services/socket.service";

// Common emojis for quick reactions
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

interface MessageBubbleProps {
    message: Message;
    isGroup: boolean;
    showAvatar: boolean;
    onReply: () => void;
    onMessageDeleted?: (messageId: string) => void;
    onMessageUpdated?: (messageId: string) => void;
}

export default function MessageBubble({
    message,
    isGroup,
    showAvatar,
    onReply,
    onMessageDeleted,
    onMessageUpdated,
}: MessageBubbleProps) {
    const isMe = message.isMe;
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showRecallDialog, setShowRecallDialog] = useState(false);
    const [showReactions, setShowReactions] = useState(false);

    // API mutations
    const [deleteMessage, { isLoading: isDeleting }] = useDeleteMessageForMeMutation();
    const [recallMessage, { isLoading: isRecalling }] = useRecallMessageMutation();
    const [reactMessage, { isLoading: isReacting }] = useReactMessageMutation();
    const [togglePin, { isLoading: isPinning }] = useTogglePinMessageMutation();

    const handleCopy = () => {
        if (message.content) {
            navigator.clipboard.writeText(message.content);
            toast.success("Đã sao chép tin nhắn");
        }
    };

    // Handle delete message (for me only) - Chỉ API, không cần realtime
    const handleDelete = async () => {
        try {
            await deleteMessage(message.id).unwrap();
            toast.success("Đã xóa tin nhắn");
            setShowDeleteDialog(false);
            onMessageDeleted?.(message.id);
        } catch (error: any) {
            toast.error(error?.data?.message || "Lỗi xóa tin nhắn");
        }
    };

    // Handle recall message (delete for everyone) - Socket cho realtime
    const handleRecall = async () => {
        try {
            // Sử dụng socket để realtime với người khác
            socketService.recallMessage(message.id);
            toast.success("Đã thu hồi tin nhắn");
            setShowRecallDialog(false);
            onMessageUpdated?.(message.id);
        } catch (error: any) {
            toast.error(error?.data?.message || "Lỗi thu hồi tin nhắn");
        }
    };

    // Handle react to message - Socket cho realtime
    const handleReact = async (emoji: string) => {
        try {
            // Sử dụng socket để realtime với người khác
            socketService.reactMessage(message.id, emoji);
            setShowReactions(false);
            toast.success(`Đã thêm ${emoji}`);
            onMessageUpdated?.(message.id);
        } catch (error: any) {
            toast.error(error?.data?.message || "Lỗi reaction");
        }
    };

    // Handle pin/unpin message - Socket cho realtime
    const handleTogglePin = async () => {
        try {
            // Sử dụng socket để realtime với người khác
            socketService.pinMessage(message.id);
            toast.success(message.pin ? "Đã bỏ ghim tin nhắn" : "Đã ghim tin nhắn");
            onMessageUpdated?.(message.id);
        } catch (error: any) {
            toast.error(error?.data?.message || "Lỗi ghim tin nhắn");
        }
    };

    const initials = message.sender.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    // Render message content based on type
    const renderContent = () => {
        switch (message.type) {
            case "text":
                return (
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                );
            case "image":
                return (
                    <div className="rounded-lg overflow-hidden max-w-xs">
                        <img
                            src={message.content || ""}
                            alt="Image"
                            className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                        />
                    </div>
                );
            case "video":
                return (
                    <div className="rounded-lg overflow-hidden max-w-xs">
                        <video
                            src={message.content || ""}
                            controls
                            className="w-full h-auto"
                        />
                    </div>
                );
            case "file":
                return (
                    <a
                        href={message.content || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={message.file?.name}
                        className="flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                            📎
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{message.file?.name || "File"}</p>
                            <p className="text-xs opacity-70">{message.file?.size || ""}</p>
                        </div>
                    </a>
                );
            case "sticker":
            case "gif":
                return (
                    <img
                        src={message.content || ""}
                        alt="Sticker"
                        className="w-32 h-32 object-contain"
                    />
                );
            case "system":
                return (
                    <p className="text-sm text-gray-500 italic text-center">
                        {message.content}
                    </p>
                );
            default:
                return <p className="italic opacity-70">[{message.type}]</p>;
        }
    };

    // System message
    if (message.type === "system") {
        return (
            <div className="flex justify-center my-2">
                <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-300">
                    {message.content}
                </span>
            </div>
        );
    }

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger>
                    <div
                        className={`flex items-end gap-2 group ${isMe ? "flex-row-reverse" : "flex-row"
                            }`}
                    >
                        {/* Avatar */}
                        {!isMe && isGroup && (
                            <div className="w-8 flex-shrink-0">
                                {showAvatar ? (
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={message.sender.avatar || undefined} />
                                        <AvatarFallback className="bg-gradient-to-br from-purple-400 to-purple-600 text-white text-xs">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                ) : null}
                            </div>
                        )}

                        {/* Message bubble */}
                        <div
                            className={`max-w-[70%] ${isMe
                                ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md"
                                : "bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl rounded-bl-md shadow-sm"
                                }`}
                        >
                            {/* Reply preview */}
                            {message.replyTo && (
                                <div
                                    className={`px-3 pt-2 pb-1 ${isMe
                                        ? "border-l-2 border-white/50 ml-3"
                                        : "border-l-2 border-blue-500 ml-3"
                                        }`}
                                >
                                    <p className={`text-xs font-medium ${isMe ? "text-blue-200" : "text-blue-600"}`}>
                                        {message.replyTo.sender.name}
                                    </p>
                                    <p className={`text-xs truncate ${isMe ? "text-blue-100" : "text-gray-500"}`}>
                                        {message.replyTo.content || `[${message.replyTo.type}]`}
                                    </p>
                                </div>
                            )}

                            {/* Sender name (group only) */}
                            {!isMe && isGroup && showAvatar && (
                                <p className="px-3 pt-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                                    {message.sender.name}
                                </p>
                            )}

                            {/* Content */}
                            <div className="px-3 py-2">{renderContent()}</div>

                            {/* Time & reactions */}
                            <div
                                className={`px-3 pb-2 flex items-center gap-2 ${isMe ? "justify-start" : "justify-end"
                                    }`}
                            >
                                <span className={`text-[10px] ${isMe ? "text-blue-200" : "text-gray-400"}`}>
                                    {format(new Date(message.time), "HH:mm")}
                                </span>

                                {/* Reactions */}
                                {message.reactions.length > 0 && (
                                    <div className="flex items-center -space-x-1">
                                        {message.reactions.slice(0, 3).map((reaction, idx) => (
                                            <span
                                                key={idx}
                                                className="text-sm bg-white dark:bg-gray-600 rounded-full px-1 shadow-sm cursor-pointer hover:scale-110 transition-transform"
                                                onClick={() => handleReact(reaction.emoji)}
                                            >
                                                {reaction.emoji}
                                                {reaction.count > 1 && (
                                                    <span className="text-xs text-gray-500">{reaction.count}</span>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Pin indicator */}
                                {message.pin && (
                                    <Pin className={`h-3 w-3 ${isMe ? "text-blue-200" : "text-blue-500"}`} />
                                )}
                            </div>
                        </div>

                        {/* Quick actions */}
                        <div
                            className={`opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ${isMe ? "flex-row-reverse" : "flex-row"
                                }`}
                        >
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                                onClick={onReply}
                            >
                                <Reply className="h-3.5 w-3.5" />
                            </Button>

                            {/* Quick reaction button */}
                            <Popover open={showReactions} onOpenChange={setShowReactions}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                                        disabled={isReacting}
                                    >
                                        {isReacting ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Smile className="h-3.5 w-3.5" />
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-2" side="top">
                                    <div className="flex gap-1">
                                        {QUICK_REACTIONS.map((emoji) => (
                                            <button
                                                key={emoji}
                                                className="text-xl hover:scale-125 transition-transform p-1"
                                                onClick={() => handleReact(emoji)}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                </ContextMenuTrigger>

                <ContextMenuContent>
                    <ContextMenuItem onClick={onReply}>
                        <Reply className="h-4 w-4 mr-2" />
                        Trả lời
                    </ContextMenuItem>
                    <ContextMenuItem onClick={handleCopy}>
                        <Copy className="h-4 w-4 mr-2" />
                        Sao chép
                    </ContextMenuItem>
                    <ContextMenuItem>
                        <Forward className="h-4 w-4 mr-2" />
                        Chuyển tiếp
                    </ContextMenuItem>

                    <ContextMenuSeparator />

                    {/* Reaction submenu */}
                    <ContextMenuItem onSelect={(e) => e.preventDefault()}>
                        <Smile className="h-4 w-4 mr-2" />
                        React
                        <div className="ml-auto flex gap-1">
                            {QUICK_REACTIONS.slice(0, 4).map((emoji) => (
                                <button
                                    key={emoji}
                                    className="text-sm hover:scale-125 transition-transform"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleReact(emoji);
                                    }}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </ContextMenuItem>

                    <ContextMenuItem onClick={handleTogglePin} disabled={isPinning}>
                        {isPinning ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Pin className="h-4 w-4 mr-2" />
                        )}
                        {message.pin ? "Bỏ ghim" : "Ghim"}
                    </ContextMenuItem>

                    <ContextMenuSeparator />

                    {isMe && (
                        <ContextMenuItem
                            className="text-orange-600"
                            onClick={() => setShowRecallDialog(true)}
                        >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Thu hồi
                        </ContextMenuItem>
                    )}
                    <ContextMenuItem
                        className="text-red-600"
                        onClick={() => setShowDeleteDialog(true)}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Xóa
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>

            {/* Delete confirmation dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xóa tin nhắn?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tin nhắn sẽ bị xóa khỏi hội thoại của bạn. Người khác vẫn có thể thấy tin nhắn này.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            Xóa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Recall confirmation dialog */}
            <AlertDialog open={showRecallDialog} onOpenChange={setShowRecallDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Thu hồi tin nhắn?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tin nhắn sẽ bị xóa với tất cả mọi người trong hội thoại.
                            Bạn chỉ có thể thu hồi tin nhắn trong vòng 24 giờ.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRecall}
                            className="bg-orange-600 hover:bg-orange-700"
                            disabled={isRecalling}
                        >
                            {isRecalling ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            Thu hồi
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
