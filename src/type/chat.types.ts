// src/type/chat.types.ts
// Types cho Chat, Message, Friend, Notification

import { User } from "./auth.types";

// ===== Friend Types =====
export interface Friend {
  friendshipId: string;
  id: string;
  name: string;
  avatar?: string | null;
  status?: string | null;
  isOnline: boolean;
  lastSeen?: string | null;
  createdAt: string;
  birthDate? : string ;
}

export interface FriendRequest {
  id: string;
  sender?: {
    id: string;
    name: string;
    avatar?: string | null;
    status?: string | null;
    isOnline?: boolean;
  };
  receiver?: {
    id: string;
    name: string;
    avatar?: string | null;
    status?: string | null;
    isOnline?: boolean;
  };
  createdAt: string;
}

export interface SearchUser {
  id: string;
  name: string;
  avatar?: string | null;
  status?: string | null;
  isOnline?: boolean;
  relation: "none" | "friend" | "request_sent" | "request_received" | "blocked";
  requestId?: string;
  email?:string;
  location?: string; 
  birthDate? : string;
}

export interface BlockedUser {
  id: string;
  user: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  blockedAt: string;
}

// ===== Chat Types =====
export type ChatParticipantRole = "MEMBER" | "LEADER";

export interface ChatParticipant {
  id: string;
  name: string;
  avatar?: string | null;
  isOnline?: boolean;
  lastSeen?: string | null;
  status?: string | null;
  role?: ChatParticipantRole;
}

export interface Chat {
  id: string;
  name?: string | null;
  avatar?: string | null;
  isGroup: boolean;
  pin: boolean;
  notify: boolean;
  readed: boolean;
  participants: ChatParticipant[];
  participantCount: number;
  lastMessage?: {
    id: string;
    content?: string | null;
    type: string;
    time: string;
    sender: {
      id: string;
      name: string;
    };
  } | null;
  updatedAt: string;
}

export interface ChatDetails extends Chat {
  myRole?: ChatParticipantRole;
  createdAt: string;
}

// ===== Message Types =====
export type MessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "file"
  | "sticker"
  | "gif"
  | "location"
  | "contact"
  | "system";

export interface MessageReaction {
  emoji: string;
  count: number;
  users: { id: string; name: string }[];
}

export interface Message {
  id: string;
  content?: string | null;
  type: MessageType;
  time: string;
  pin: boolean;
  sender: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  replyTo?: {
    id: string;
    content?: string | null;
    type: string;
    sender: { id: string; name: string };
  } | null;
  file?: {
    name: string;
    size: string;
    type: string;
  } | null;
  reactions: MessageReaction[];
  isMe: boolean;
}

export interface SendMessageRequest {
  content?: string;
  type?: MessageType;
  replyToId?: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
}

// ===== Notification Types =====
export type NotificationType =
  | "FRIEND_REQUEST"
  | "FRIEND_ACCEPTED"
  | "NEW_MESSAGE"
  | "GROUP_INVITE"
  | "GROUP_REMOVED"
  | "MENTION"
  | "REACTION"
  | "SYSTEM";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
}

// ===== API Response Types =====
export interface FriendsListResponse {
  friends: Friend[];
}

export interface FriendRequestsResponse {
  requests: FriendRequest[];
}

export interface SearchUsersResponse {
  users: SearchUser[];
}

export interface ChatsResponse {
  chats: Chat[];
}

export interface ChatDetailsResponse {
  chat: ChatDetails;
}

export interface MessagesResponse {
  messages: Message[];
  nextCursor?: string | null;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  nextCursor?: string | null;
}

// ===== Socket Event Types =====
export interface TypingEvent {
  chatId: string;
  userId: string;
  userName: string;
}

export interface MessageReadEvent {
  chatId: string;
  userId: string;
}

export interface UserOnlineEvent {
  userId: string;
  userName?: string;
  lastSeen?: string;
}

export interface MessageReactedEvent {
  messageId: string;
  userId: string;
  userName: string;
  emoji: string;
  action: "added" | "removed" | "changed";
}
