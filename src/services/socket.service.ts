// src/services/socket.service.ts
// Socket.IO client service

import { io, Socket } from "socket.io-client";
import { Message, TypingEvent, MessageReadEvent, UserOnlineEvent, MessageReactedEvent, Notification } from "@/src/type/chat.types";

// Event types cho recalled và pinned
export interface MessageRecalledEvent {
  messageId: string;
  chatId: string;
  userId: string;
  userName: string;
}

export interface MessagePinnedEvent {
  messageId: string;
  chatId: string;
  pin: boolean;
  userId: string;
  userName: string;
}

export interface MessageBlockedEvent {
  chatId: string;
  isBlockedByMe: boolean;
  message: string;
}

// Friend events
export interface FriendRequestReceivedEvent {
  id: string;
  sender: { id: string; name: string; avatar: string | null };
  createdAt: string;
}

export interface FriendRequestAcceptedEvent {
  friendId: string;
  user: { id: string; name: string; avatar: string | null };
  chatId: string;
  createdAt: string;
}

export interface FriendRemovedEvent {
  userId: string;
  userName: string;
}
export interface FriendRequestDeclinedEvent {
  requestId: string;
  userId: string; // Người đã từ chối
}
export interface FriendRequestCancelledEvent {
  requestId: string;
  userId: string; // Người đã hủy
}

// Socket URL - backend server (không có /api)
const getSocketUrl = (): string => {
  // DEBUG: Hardcode URL để test
  // TODO: Sau khi hoạt động, có thể dùng environment variable
  // const url = "http://localhost:8080";
  const url = "https://chat-backend-pearl-theta.vercel.app/api"
  return url;
};

let socket: Socket | null = null;

export interface SocketCallbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onNewMessage?: (data: { message: Message; chatId: string; tempId?: string }) => void;
  onTypingStart?: (data: TypingEvent) => void;
  onTypingStop?: (data: { chatId: string; userId: string }) => void;
  onMessageRead?: (data: MessageReadEvent) => void;
  onMessageReacted?: (data: MessageReactedEvent) => void;
  onMessageRecalled?: (data: MessageRecalledEvent) => void;
  onMessagePinned?: (data: MessagePinnedEvent) => void;
  onMessageBlocked?: (data: MessageBlockedEvent) => void;
  onUserOnline?: (data: UserOnlineEvent) => void;
  onUserOffline?: (data: UserOnlineEvent) => void;
  onUsersOnline?: (data: { userIds: string[] }) => void;
  onNotification?: (data: Notification) => void;
  onError?: (error: { message: string }) => void;
  // Friend events
  onFriendRequestReceived?: (data: FriendRequestReceivedEvent) => void;
  onFriendRequestAccepted?: (data: FriendRequestAcceptedEvent) => void;
  onFriendRemoved?: (data: FriendRemovedEvent) => void;
  onFriendRequestDeclined?: (data: FriendRequestDeclinedEvent) => void;
  onFriendRequestCancelled?: (data: FriendRequestCancelledEvent) => void;
}

// Kết nối socket
export const connectSocket = (token: string, callbacks?: SocketCallbacks): Socket => {
  // Ngắt kết nối cũ nếu có
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  const socketUrl = getSocketUrl();
  console.log("[Socket] Connecting to:", socketUrl);
  console.log("[Socket] Token (first 20 chars):", token?.substring(0, 20) + "...");

  // Kết nối đến root namespace "/"
  socket = io(socketUrl, {
    path: "/socket.io", // Đường dẫn mặc định của Socket.IO
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 20000,
    forceNew: true, // Tạo kết nối mới
  });

  // Event handlers
  socket.on("connect", () => {
    console.log("[Socket] ✅ Connected:", socket?.id);
    callbacks?.onConnect?.();
  });

  socket.on("disconnect", (reason) => {
    console.log("[Socket] ❌ Disconnected:", reason);
    callbacks?.onDisconnect?.();
  });

  socket.on("connect_error", (error) => {
    console.error("[Socket] ⚠️ Connection error:", error.message);
    callbacks?.onError?.({ message: error.message });
  });

  socket.on("reconnect", (attempt) => {
    console.log("[Socket] 🔄 Reconnected after", attempt, "attempts");
  });

  socket.on("reconnect_error", (error) => {
    console.error("[Socket] ⚠️ Reconnect error:", error.message);
  });

  // Message events
  socket.on("message:new", (data) => {
    console.log("[Socket] 📩 New message:", data);
    callbacks?.onNewMessage?.(data);
  });

  // Typing events
  socket.on("typing:start", (data) => {
    console.log("[Socket] ⌨️ Typing start:", data);
    callbacks?.onTypingStart?.(data);
  });

  socket.on("typing:stop", (data) => {
    console.log("[Socket] ⌨️ Typing stop:", data);
    callbacks?.onTypingStop?.(data);
  });

  // Read events
  socket.on("message:read", (data) => {
    console.log("[Socket] 👁️ Message read:", data);
    callbacks?.onMessageRead?.(data);
  });

  // Reaction events
  socket.on("message:reacted", (data) => {
    console.log("[Socket] ❤️ Message reacted:", data);
    callbacks?.onMessageReacted?.(data);
  });

  // Recalled events
  socket.on("message:recalled", (data) => {
    console.log("[Socket] 🔄 Message recalled:", data);
    callbacks?.onMessageRecalled?.(data);
  });

  // Pinned events
  socket.on("message:pinned", (data) => {
    console.log("[Socket] 📌 Message pinned:", data);
    callbacks?.onMessagePinned?.(data);
  });

  // Online/Offline events
  socket.on("user:online", (data) => {
    console.log("[Socket] 🟢 User online:", data);
    callbacks?.onUserOnline?.(data);
  });

  socket.on("user:offline", (data) => {
    console.log("[Socket] 🔴 User offline:", data);
    callbacks?.onUserOffline?.(data);
  });

  // Danh sách users online (nhận khi connect)
  socket.on("users:online", (data) => {
    console.log("[Socket] 📋 Online users list:", data);
    callbacks?.onUsersOnline?.(data);
  });

  // Notification events
  socket.on("notification:new", (data) => {
    console.log("[Socket] 🔔 New notification:", data);
    callbacks?.onNotification?.(data);
  });

  // Error events
  socket.on("error", (data) => {
    console.error("[Socket] ❗ Error:", data);
    callbacks?.onError?.(data);
  });

  // Blocked message events
  socket.on("message:blocked", (data) => {
    console.log("[Socket] 🚫 Message blocked:", data);
    callbacks?.onMessageBlocked?.(data);
  });

  // Friend events
  socket.on("friend:request:received", (data) => {
    console.log("[Socket] 👥 Friend request received:", data);
    callbacks?.onFriendRequestReceived?.(data);
  });

  socket.on("friend:request:accepted", (data) => {
    console.log("[Socket] ✅ Friend request accepted:", data);
    callbacks?.onFriendRequestAccepted?.(data);
  });

  socket.on("friend:removed", (data) => {
    console.log("[Socket] ❌ Friend removed:", data);
    callbacks?.onFriendRemoved?.(data);
  });

  socket.on("friend:request:declined", (data) => {
    console.log("[Socket] 🚫 Friend request declined:", data);
    callbacks?.onFriendRequestDeclined?.(data);
  });

  // Khi đối phương hủy lời mời họ đã gửi cho mình (quan trọng để mất cái badge đỏ)
  socket.on("friend:request:cancelled", (data) => {
    console.log("[Socket] ↩️ Friend request cancelled:", data);
    callbacks?.onFriendRequestCancelled?.(data);
  });

  return socket;
};

// Ngắt kết nối
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Lấy socket instance
export const getSocket = (): Socket | null => socket;

// Gửi tin nhắn
export const sendMessage = (data: {
  chatId: string;
  content?: string;
  type?: string;
  replyToId?: string;
  tempId?: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
}) => {
  socket?.emit("message:send", data);
};

// Bắt đầu gõ
export const startTyping = (chatId: string) => {
  socket?.emit("typing:start", { chatId });
};

// Dừng gõ
export const stopTyping = (chatId: string) => {
  socket?.emit("typing:stop", { chatId });
};

// Đánh dấu đã đọc
export const markRead = (chatId: string) => {
  socket?.emit("message:read", { chatId });
};

// React tin nhắn
export const reactMessage = (messageId: string, emoji: string) => {
  socket?.emit("message:react", { messageId, emoji });
};

// Thu hồi tin nhắn
export const recallMessage = (messageId: string) => {
  socket?.emit("message:recall", { messageId });
};

// Ghim/bỏ ghim tin nhắn
export const pinMessage = (messageId: string) => {
  socket?.emit("message:pin", { messageId });
};

// Join chat room
export const joinChat = (chatId: string) => {
  socket?.emit("chat:join", { chatId });
};

// Leave chat room
export const leaveChat = (chatId: string) => {
  socket?.emit("chat:leave", { chatId });
};

export const socketService = {
  connectSocket,
  disconnectSocket,
  getSocket,
  sendMessage,
  startTyping,
  stopTyping,
  markRead,
  reactMessage,
  recallMessage,
  pinMessage,
  joinChat,
  leaveChat,
};
