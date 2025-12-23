"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useGetChatByIdQuery, useMarkChatAsReadMutation } from "@/src/redux/feature/chatApi";
import { useGetMessagesQuery } from "@/src/redux/feature/messageApi";
import { useUploadFileMutation } from "@/src/redux/feature/userApi";
import { Message } from "@/src/type/chat.types";
import { useAppSelector } from "@/src/redux/hooks";
import { socketService } from "@/src/services/socket.service";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Phone,
    Video,
    MoreVertical,
    Send,
    Image as ImageIcon,
    Paperclip,
    Smile,
    ArrowLeft,
    Check,
    CheckCheck,
    Reply,
    Trash2,
    Pin,
    X,
    File,
    Loader2,
    Info,
    Search,
} from "lucide-react";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import MessageBubble from "./message-bubble";
import EmojiPicker from "./emoji-picker";
import ChatInfoPanel from "./chat-info-panel";
import GroupSettingsPanel from "./group-settings-panel";

interface ChatWindowProps {
    chatId: string;
    onClose: () => void;
    typingUsers: { userId: string; userName: string }[];
    onlineUsers: Set<string>;
}

export default function ChatWindow({
    chatId,
    onClose,
    typingUsers,
    onlineUsers,
}: ChatWindowProps) {
    const { user } = useAppSelector((state) => state.auth);
    const [messageInput, setMessageInput] = useState("");
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [localMessages, setLocalMessages] = useState<Message[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showInfoPanel, setShowInfoPanel] = useState(false);
    const [showGroupSettings, setShowGroupSettings] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isTypingRef = useRef(false);

    // API queries
    const { data: chatData, isLoading: chatLoading } = useGetChatByIdQuery(chatId);
    const { data: messagesData, isLoading: messagesLoading, refetch } = useGetMessagesQuery({ chatId });
    const [markAsRead] = useMarkChatAsReadMutation();
    const [uploadFile] = useUploadFileMutation();

    const chat = chatData?.chat;
    const messages = messagesData?.messages || [];

    // Merge local messages with server messages
    const allMessages = [...messages, ...localMessages];

    // Get partner info for private chat
    // Trong chat 1-1, participants chứa người còn lại (không phải mình)
    const partner = !chat?.isGroup ? chat?.participants?.find(p => p.id !== user?.id) || chat?.participants?.[0] : null;
    const isOnline = partner ? onlineUsers.has(partner.id) : false;

    // Debug log
    console.log("[ChatWindow] Debug:", {
        chatId,
        isGroup: chat?.isGroup,
        participants: chat?.participants,
        partner: partner ? { id: partner.id, name: partner.name } : null,
        onlineUsers: Array.from(onlineUsers),
        isOnline,
    });

    // Scroll to bottom
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    // Mark as read when opening chat
    useEffect(() => {
        markAsRead(chatId);
        socketService.markRead(chatId);
    }, [chatId, markAsRead]);

    // Listen for new messages via socket
    useEffect(() => {
        const handleNewMessage = (event: CustomEvent) => {
            const { message, chatId: msgChatId } = event.detail;
            if (msgChatId === chatId) {
                // Remove temp message if exists
                setLocalMessages((prev) => prev.filter((m) => m.id !== event.detail.tempId));
                refetch();
            }
        };

        // Handle message recalled
        const handleMessageRecalled = (event: CustomEvent) => {
            const { messageId, chatId: msgChatId } = event.detail;
            if (msgChatId === chatId) {
                refetch(); // Refresh to get updated messages
                toast.info("Tin nhắn đã bị thu hồi");
            }
        };

        // Handle message pinned
        const handleMessagePinned = (event: CustomEvent) => {
            const { messageId, chatId: msgChatId, pin, userName } = event.detail;
            if (msgChatId === chatId) {
                refetch(); // Refresh to get updated pin status
                toast.info(pin ? `${userName} đã ghim tin nhắn` : `${userName} đã bỏ ghim tin nhắn`);
            }
        };

        // Handle message reacted
        const handleMessageReacted = (event: CustomEvent) => {
            const { messageId, chatId: msgChatId } = event.detail;
            // Refetch to update reactions - chatId might come from message.chatId if not directly available
            refetch();
        };

        window.addEventListener("socket:message:new", handleNewMessage as EventListener);
        window.addEventListener("socket:message:recalled", handleMessageRecalled as EventListener);
        window.addEventListener("socket:message:pinned", handleMessagePinned as EventListener);
        window.addEventListener("socket:message:reacted", handleMessageReacted as EventListener);

        return () => {
            window.removeEventListener("socket:message:new", handleNewMessage as EventListener);
            window.removeEventListener("socket:message:recalled", handleMessageRecalled as EventListener);
            window.removeEventListener("socket:message:pinned", handleMessagePinned as EventListener);
            window.removeEventListener("socket:message:reacted", handleMessageReacted as EventListener);
        };
    }, [chatId, refetch]);

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [allMessages.length, scrollToBottom]);

    // Handle typing indicator - TỐI ƯU: chỉ emit startTyping 1 lần
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMessageInput(e.target.value);

        // Chỉ emit startTyping nếu chưa đang typing
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            socketService.startTyping(chatId);
        }

        // Clear previous timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Stop typing after 1.5 seconds of inactivity (giảm từ 2s)
        typingTimeoutRef.current = setTimeout(() => {
            isTypingRef.current = false;
            socketService.stopTyping(chatId);
        }, 1500);
    };

    // Send message - CHỈ gửi qua Socket.IO (backend socket handler sẽ lưu vào DB)
    const handleSend = async () => {
        const content = messageInput.trim();
        if (!content || !user) return;

        // Clear input immediately
        setMessageInput("");
        setReplyTo(null);
        socketService.stopTyping(chatId);

        // Create temp message for optimistic UI
        const tempId = `temp-${Date.now()}`;
        const tempMessage: Message = {
            id: tempId,
            content,
            type: "text",
            time: new Date().toISOString(),
            pin: false,
            sender: {
                id: user.id,
                name: user.name,
                avatar: user.avatar,
            },
            replyTo: replyTo ? {
                id: replyTo.id,
                content: replyTo.content,
                type: replyTo.type,
                sender: replyTo.sender,
            } : null,
            file: null,
            reactions: [],
            isMe: true,
        };

        // Add temp message for optimistic UI
        setLocalMessages((prev) => [...prev, tempMessage]);

        // Chỉ gửi qua Socket.IO - backend sẽ lưu DB và emit message:new
        // Khi nhận được message:new từ socket, temp message sẽ được thay thế
        socketService.sendMessage({
            chatId,
            content,
            type: "text",
            replyToId: replyTo?.id,
            tempId,
        });
    };

    // Handle file select
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "file") => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        const validFiles = files.filter((file) => {
            if (file.size > maxSize) {
                toast.error(`File ${file.name} quá lớn (tối đa 10MB)`);
                return false;
            }
            return true;
        });

        if (validFiles.length > 0) {
            setSelectedFiles(validFiles);

            // Show preview for images
            if (type === "image" && validFiles[0].type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = () => setFilePreview(reader.result as string);
                reader.readAsDataURL(validFiles[0]);
            } else {
                setFilePreview(null);
            }
        }

        // Reset input
        e.target.value = "";
    };

    // Clear selected files
    const clearSelectedFiles = () => {
        setSelectedFiles([]);
        setFilePreview(null);
    };

    // Send file message
    const handleSendFile = async () => {
        if (selectedFiles.length === 0 || !user) return;

        setIsUploading(true);

        try {
            const file = selectedFiles[0];
            const result = await uploadFile({ file, type: "chat" }).unwrap();

            const messageType = file.type.startsWith("image/") ? "image" : "file";

            // Send via socket
            socketService.sendMessage({
                chatId,
                content: result.url,
                type: messageType,
                fileName: result.fileName,
                fileSize: String(result.fileSize),
                fileType: result.fileType,
            });

            clearSelectedFiles();
            toast.success("Gửi file thành công!");
        } catch (error: any) {
            toast.error(error?.data?.message || "Lỗi upload file");
        } finally {
            setIsUploading(false);
        }
    };

    // Handle emoji select
    const handleEmojiSelect = (emoji: string) => {
        setMessageInput((prev) => prev + emoji);
        setShowEmojiPicker(false);
        inputRef.current?.focus();
    };

    // Group messages by date
    const groupedMessages = allMessages.reduce<{ date: string; messages: Message[] }[]>((groups, message) => {
        const messageDate = new Date(message.time);
        let dateLabel = format(messageDate, "dd/MM/yyyy");

        if (isToday(messageDate)) {
            dateLabel = "Hôm nay";
        } else if (isYesterday(messageDate)) {
            dateLabel = "Hôm qua";
        }

        const lastGroup = groups[groups.length - 1];
        if (lastGroup && lastGroup.date === dateLabel) {
            lastGroup.messages.push(message);
        } else {
            groups.push({ date: dateLabel, messages: [message] });
        }
        return groups;
    }, []);

    if (chatLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!chat) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <p className="text-gray-500">Không tìm thấy cuộc trò chuyện</p>
            </div>
        );
    }

    const displayName = chat.name || "Chat";
    const displayAvatar = chat.avatar;
    const initials = displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="h-16 px-4 flex items-center gap-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={onClose}
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>

                <Avatar className="h-10 w-10 ring-2 ring-white dark:ring-gray-700">
                    <AvatarImage src={displayAvatar || undefined} alt={displayName} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                        {initials}
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-900 dark:text-white truncate">
                        {displayName}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {typingUsers.length > 0 ? (
                            <span className="text-blue-500">
                                {chat.isGroup
                                    ? `${typingUsers.map((u) => u.userName).join(", ")} đang gõ...`
                                    : "Đang gõ..."}
                            </span>
                        ) : chat.isGroup ? (
                            `${chat.participants.length} thành viên`
                        ) : isOnline ? (
                            <span className="text-green-500">● Đang hoạt động</span>
                        ) : partner?.lastSeen ? (
                            `Hoạt động ${formatDistanceToNow(new Date(partner.lastSeen), { addSuffix: true, locale: vi })}`
                        ) : (
                            "Offline"
                        )}
                    </p>
                </div>

                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="hidden sm:flex">
                        <Phone className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </Button>
                    <Button variant="ghost" size="icon" className="hidden sm:flex">
                        <Video className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            if (chat?.isGroup) {
                                setShowGroupSettings(true);
                            } else {
                                setShowInfoPanel(true);
                            }
                        }}
                        title={chat?.isGroup ? "Cài đặt nhóm" : "Thông tin cuộc trò chuyện"}
                    >
                        <Info className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </Button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messagesLoading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : allMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-4">
                            <Send className="h-8 w-8 text-gray-400" />
                        </div>
                        <p>Chưa có tin nhắn nào</p>
                        <p className="text-sm">Hãy bắt đầu cuộc trò chuyện!</p>
                    </div>
                ) : (
                    groupedMessages.map((group) => (
                        <div key={group.date}>
                            {/* Date separator */}
                            <div className="flex items-center justify-center my-4">
                                <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-300">
                                    {group.date}
                                </span>
                            </div>

                            {/* Messages */}
                            <div className="space-y-2">
                                {group.messages.map((message, idx) => (
                                    <MessageBubble
                                        key={message.id}
                                        message={message}
                                        isGroup={chat.isGroup}
                                        showAvatar={
                                            !message.isMe &&
                                            (idx === 0 ||
                                                group.messages[idx - 1]?.sender.id !== message.sender.id)
                                        }
                                        onReply={() => setReplyTo(message)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Reply preview */}
            {replyTo && (
                <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3">
                    <Reply className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0 border-l-2 border-blue-500 pl-2">
                        <p className="text-xs text-blue-600 font-medium">
                            {replyTo.isMe ? "Bạn" : replyTo.sender.name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {replyTo.content || `[${replyTo.type}]`}
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setReplyTo(null)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* File Preview */}
            {selectedFiles.length > 0 && (
                <div className="px-4 py-2 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        {filePreview ? (
                            <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
                        ) : (
                            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                                <File className="h-8 w-8 text-gray-500" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{selectedFiles[0].name}</p>
                            <p className="text-xs text-gray-500">
                                {(selectedFiles[0].size / 1024 / 1024).toFixed(2)} MB
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={clearSelectedFiles}
                            disabled={isUploading}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                        <Button
                            onClick={handleSendFile}
                            disabled={isUploading}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isUploading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                {/* Hidden file inputs */}
                <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e, "image")}
                />
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="*/*"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e, "file")}
                />

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0"
                        onClick={() => imageInputRef.current?.click()}
                        title="Gửi ảnh"
                    >
                        <ImageIcon className="h-5 w-5 text-gray-500" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0"
                        onClick={() => fileInputRef.current?.click()}
                        title="Gửi file"
                    >
                        <Paperclip className="h-5 w-5 text-gray-500" />
                    </Button>

                    <div className="flex-1 relative">
                        <Input
                            ref={inputRef}
                            placeholder="Nhập tin nhắn..."
                            className="pr-10 bg-gray-100 dark:bg-gray-700 border-0 rounded-full"
                            value={messageInput}
                            onChange={handleInputChange}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        >
                            <Smile className="h-5 w-5 text-gray-500" />
                        </Button>

                        {/* Emoji Picker */}
                        {showEmojiPicker && (
                            <div className="absolute bottom-full right-0 mb-2">
                                <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
                            </div>
                        )}
                    </div>

                    <Button
                        size="icon"
                        className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 rounded-full"
                        onClick={handleSend}
                        disabled={!messageInput.trim()}
                    >
                        <Send className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Chat Info Panel */}
            <ChatInfoPanel
                chatId={chatId}
                chatName={displayName}
                isOpen={showInfoPanel}
                onClose={() => setShowInfoPanel(false)}
                onMessageClick={(messageId) => {
                    // TODO: Scroll to message
                    setShowInfoPanel(false);
                }}
            />

            {/* Group Settings Panel */}
            {chat?.isGroup && (
                <GroupSettingsPanel
                    chatId={chatId}
                    isOpen={showGroupSettings}
                    onClose={() => setShowGroupSettings(false)}
                    currentUserId={user?.id}
                />
            )}
        </div>
    );
}
