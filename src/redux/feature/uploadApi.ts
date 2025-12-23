// src/redux/feature/uploadApi.ts
// API endpoints cho Upload files

import { apiSlice } from "../api/baseApi";

export interface UploadResponse {
  message: string;
  url: string;
  publicId: string;
  resourceType: string;
  format: string;
  bytes: number;
}

export const uploadApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Upload single file (general)
    uploadFile: builder.mutation<UploadResponse, FormData>({
      query: (formData) => ({
        url: "/upload",
        method: "POST",
        body: formData,
      }),
    }),

    // Upload avatar (POST /api/upload with type=avatar)
    uploadAvatar: builder.mutation<UploadResponse, FormData>({
      query: (formData) => {
        // Thêm type=avatar vào formData
        formData.append("type", "avatar");
        return {
          url: "/upload",
          method: "POST",
          body: formData,
        };
      },
    }),

    // Upload group avatar (POST /api/upload with type=group)
    uploadGroupAvatar: builder.mutation<UploadResponse, FormData>({
      query: (formData) => {
        // Thêm type=group vào formData
        formData.append("type", "group");
        return {
          url: "/upload",
          method: "POST",
          body: formData,
        };
      },
    }),

    // Upload chat media (images, videos, files)
    uploadChatMedia: builder.mutation<UploadResponse, FormData>({
      query: (formData) => {
        formData.append("type", "chat");
        return {
          url: "/upload",
          method: "POST",
          body: formData,
        };
      },
    }),
  }),
});

export const {
  useUploadFileMutation,
  useUploadAvatarMutation,
  useUploadGroupAvatarMutation,
  useUploadChatMediaMutation,
} = uploadApi;

