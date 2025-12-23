// src/redux/feature/chatApi.ts
// API endpoints cho Chat system

import { apiSlice } from "../api/baseApi";
import {
  ChatsResponse,
  ChatDetailsResponse,
  Chat,
} from "@/src/type/chat.types";

export const chatApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Lấy danh sách chat
    getChats: builder.query<ChatsResponse, { type?: "all" | "private" | "group" } | void>({
      query: (params) => ({
        url: "/chats",
        params: params || {},
      }),
      providesTags: ["Chats"],
    }),

    // Lấy chi tiết chat
    getChatById: builder.query<ChatDetailsResponse, string>({
      query: (chatId) => `/chats/${chatId}`,
      providesTags: (_result, _error, chatId) => [{ type: "Chats", id: chatId }],
    }),

    // Tạo hoặc lấy chat 1-1
    getOrCreatePrivateChat: builder.mutation<{ chat: Chat; created: boolean }, { partnerId: string }>({
      query: (body) => ({
        url: "/chats/private",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Chats"],
    }),

    // Tạo nhóm chat
    createGroupChat: builder.mutation<{ message: string; chat: Chat }, { name: string; avatar?: string; memberIds: string[] }>({
      query: (body) => ({
        url: "/chats/group",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Chats"],
    }),

    // Cập nhật nhóm
    updateChat: builder.mutation<{ message: string; chat: Chat }, { chatId: string; name?: string; avatar?: string }>({
      query: ({ chatId, ...body }) => ({
        url: `/chats/${chatId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { chatId }) => [{ type: "Chats", id: chatId }],
    }),

    // Xóa chat
    deleteChat: builder.mutation<{ message: string }, string>({
      query: (chatId) => ({
        url: `/chats/${chatId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Chats"],
    }),

    // Thêm thành viên
    addMembers: builder.mutation<{ message: string }, { chatId: string; memberIds: string[] }>({
      query: ({ chatId, memberIds }) => ({
        url: `/chats/${chatId}/members`,
        method: "POST",
        body: { memberIds },
      }),
      invalidatesTags: (_result, _error, { chatId }) => [{ type: "Chats", id: chatId }],
    }),

    // Xóa thành viên
    removeMember: builder.mutation<{ message: string }, { chatId: string; memberId: string }>({
      query: ({ chatId, memberId }) => ({
        url: `/chats/${chatId}/members/${memberId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { chatId }) => [{ type: "Chats", id: chatId }],
    }),

    // Rời nhóm
    leaveChat: builder.mutation<{ message: string }, string>({
      query: (chatId) => ({
        url: `/chats/${chatId}/leave`,
        method: "POST",
      }),
      invalidatesTags: ["Chats"],
    }),

    // Ghim/bỏ ghim chat
    togglePinChat: builder.mutation<{ message: string; pin: boolean }, { chatId: string; pin?: boolean }>({
      query: ({ chatId, pin }) => ({
        url: `/chats/${chatId}/pin`,
        method: "PUT",
        body: { pin },
      }),
      invalidatesTags: ["Chats"],
    }),

    // Bật/tắt thông báo
    toggleNotifyChat: builder.mutation<{ message: string; notify: boolean }, { chatId: string; notify?: boolean }>({
      query: ({ chatId, notify }) => ({
        url: `/chats/${chatId}/notify`,
        method: "PUT",
        body: { notify },
      }),
      invalidatesTags: (_result, _error, { chatId }) => [{ type: "Chats", id: chatId }],
    }),

    // Đánh dấu đã đọc
    markChatAsRead: builder.mutation<{ message: string }, string>({
      query: (chatId) => ({
        url: `/chats/${chatId}/read`,
        method: "PUT",
      }),
      invalidatesTags: ["Chats"],
    }),
  }),
});

export const {
  useGetChatsQuery,
  useGetChatByIdQuery,
  useGetOrCreatePrivateChatMutation,
  useCreateGroupChatMutation,
  useUpdateChatMutation,
  useDeleteChatMutation,
  useAddMembersMutation,
  useRemoveMemberMutation,
  useLeaveChatMutation,
  useTogglePinChatMutation,
  useToggleNotifyChatMutation,
  useMarkChatAsReadMutation,
} = chatApi;
