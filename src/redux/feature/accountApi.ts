// src/redux/feature/accountApi.ts
// API endpoints cho quản lý tài khoản - avatar, status, thông tin

import { apiSlice } from "../api/baseApi";
import {
  AccountDetails,
  UpdateAccountRequest,
  UpdateStatusRequest,
  UpdateOnlineStatusRequest,
  SelectAvatarRequest,
  AvatarHistoryResponse,
  UploadAvatarResponse,
  UserActivityStatus,
  User,
} from "@/src/type/auth.types";

export const accountApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Lấy thông tin tài khoản
    getAccountDetails: builder.query<{ user: AccountDetails }, void>({
      query: () => "/account",
      providesTags: ["User"],
    }),

    // Cập nhật thông tin tài khoản
    updateAccount: builder.mutation<{ message: string; user: User }, UpdateAccountRequest>({
      query: (data) => ({
        url: "/account",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["User"],
    }),

    // Upload avatar (FormData)
    uploadAvatar: builder.mutation<UploadAvatarResponse, FormData>({
      query: (formData) => ({
        url: "/account/avatar",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["User"],
    }),

    // Xóa avatar
    deleteAvatar: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: "/account/avatar",
        method: "DELETE",
      }),
      invalidatesTags: ["User"],
    }),

    // Lấy lịch sử avatar
    getAvatarHistory: builder.query<AvatarHistoryResponse, void>({
      query: () => "/account/avatars",
    }),

    // Chọn avatar từ lịch sử
    selectAvatar: builder.mutation<{ message: string; avatar: string }, SelectAvatarRequest>({
      query: (data) => ({
        url: "/account/avatar/select",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["User"],
    }),

    // Cập nhật trạng thái (status text)
    updateStatus: builder.mutation<{ message: string; status: string | null }, UpdateStatusRequest>({
      query: (data) => ({
        url: "/account/status",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["User"],
    }),

    // Cập nhật online/offline
    updateOnlineStatus: builder.mutation<
      { message: string; isOnline: boolean; lastSeen: string },
      UpdateOnlineStatusRequest
    >({
      query: (data) => ({
        url: "/account/online-status",
        method: "PUT",
        body: data,
      }),
    }),

    // Heartbeat
    heartbeat: builder.mutation<{ success: boolean }, void>({
      query: () => ({
        url: "/account/heartbeat",
        method: "POST",
      }),
    }),

    // Lấy trạng thái hoạt động của user khác
    getUserActivityStatus: builder.query<UserActivityStatus, string>({
      query: (userId) => `/account/${userId}/status`,
    }),
  }),
});

export const {
  useGetAccountDetailsQuery,
  useUpdateAccountMutation,
  useUploadAvatarMutation,
  useDeleteAvatarMutation,
  useGetAvatarHistoryQuery,
  useSelectAvatarMutation,
  useUpdateStatusMutation,
  useUpdateOnlineStatusMutation,
  useHeartbeatMutation,
  useGetUserActivityStatusQuery,
} = accountApi;
