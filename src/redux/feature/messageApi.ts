// src/redux/feature/messageApi.ts
// API endpoints cho Message system

import { apiSlice } from "../api/baseApi";
import {
  MessagesResponse,
  Message,
  SendMessageRequest,
} from "@/src/type/chat.types";

export const messageApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Lấy tin nhắn
    getMessages: builder.query<MessagesResponse, { chatId: string; cursor?: string; limit?: number }>({
      query: ({ chatId, cursor, limit }) => ({
        url: `/messages/${chatId}`,
        params: { cursor, limit },
      }),
      providesTags: (_result, _error, { chatId }) => [{ type: "Messages", id: chatId }],
    }),

    // Gửi tin nhắn
    sendMessage: builder.mutation<{ message: Message }, { chatId: string; data: SendMessageRequest }>({
      query: ({ chatId, data }) => ({
        url: `/messages/${chatId}`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_result, _error, { chatId }) => [
        { type: "Messages", id: chatId },
        "Chats",
      ],
    }),

    // Tìm kiếm tin nhắn
    searchMessages: builder.query<{ messages: Message[] }, { chatId: string; q: string }>({
      query: ({ chatId, q }) => `/messages/${chatId}/search?q=${encodeURIComponent(q)}`,
    }),

    // Lấy media
    getMediaMessages: builder.query<{ media: Message[] }, { chatId: string; type?: "image" | "video" | "file" | "all" }>({
      query: ({ chatId, type }) => ({
        url: `/messages/${chatId}/media`,
        params: { type },
      }),
    }),

    // Lấy tin nhắn đã ghim
    getPinnedMessages: builder.query<{ pinnedMessages: Message[] }, string>({
      query: (chatId) => `/messages/${chatId}/pinned`,
      providesTags: (_result, _error, chatId) => [{ type: "PinnedMessages", id: chatId }],
    }),

    // Xóa tin nhắn cho mình
    deleteMessageForMe: builder.mutation<{ message: string }, string>({
      query: (messageId) => ({
        url: `/messages/${messageId}`,
        method: "DELETE",
      }),
    }),

    // Thu hồi tin nhắn
    recallMessage: builder.mutation<{ message: string }, string>({
      query: (messageId) => ({
        url: `/messages/${messageId}/recall`,
        method: "DELETE",
      }),
    }),

    // React tin nhắn
    reactMessage: builder.mutation<{ message: string; action: string; emoji?: string }, { messageId: string; emoji: string }>({
      query: ({ messageId, emoji }) => ({
        url: `/messages/${messageId}/react`,
        method: "POST",
        body: { emoji },
      }),
    }),

    // Ghim/bỏ ghim tin nhắn
    togglePinMessage: builder.mutation<{ message: string; pin: boolean }, string>({
      query: (messageId) => ({
        url: `/messages/${messageId}/pin`,
        method: "PUT",
      }),
    }),
  }),
});

export const {
  useGetMessagesQuery,
  useLazyGetMessagesQuery,
  useSendMessageMutation,
  useSearchMessagesQuery,
  useLazySearchMessagesQuery,
  useGetMediaMessagesQuery,
  useGetPinnedMessagesQuery,
  useDeleteMessageForMeMutation,
  useRecallMessageMutation,
  useReactMessageMutation,
  useTogglePinMessageMutation,
} = messageApi;
