import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { Mutex } from "async-mutex";
import { RootState } from "../store";
import { logOut, tokenReceived } from "../feature/authSlice";


const mutex = new Mutex();

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "https://chat-backend-pearl-theta.vercel.app/api", // URL Backend
  credentials: "include",
prepareHeaders: (headers, { getState }) => {
    // 1. Thử lấy token từ Redux Store
    let token = (getState() as RootState).auth.token;

    // 2. Nếu Redux null (ví dụ vừa F5 xong), lấy từ localStorage
    if (!token && typeof window !== 'undefined') {
       token = localStorage.getItem("accessToken");
    }

    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  // Đợi mutex unlock trước khi chạy request
  await mutex.waitForUnlock();
  
  // 1. Gọi request ban đầu
  let result = await baseQuery(args, api, extraOptions);

  // 2. Nếu lỗi 401 (Unauthorized) -> Token hết hạn
  if (result.error && result.error.status === 401) {
    // Kiểm tra xem có luồng nào đang refresh không
    if (!mutex.isLocked()) {
      const release = await mutex.acquire();
      
      try {
        // Lấy refresh token từ store hoặc local storage
        const refreshToken = (api.getState() as RootState).auth.refreshToken || localStorage.getItem("refreshToken");

        if (refreshToken) {
          // Gọi API refresh token
          const refreshResult = await baseQuery(
            {
              url: "/auth/refresh-token",
              method: "POST",
              body: { refreshToken },
            },
            api,
            extraOptions
          );

          if (refreshResult.data) {
            // Refresh thành công
            const data = refreshResult.data as { accessToken: string; refreshToken: string };
            
            // Dispatch action cập nhật token mới vào store
            api.dispatch(tokenReceived(data));
            
            // Retry (gọi lại) request ban đầu với token mới
            result = await baseQuery(args, api, extraOptions);
          } else {
            // Refresh thất bại -> Force logout
            api.dispatch(logOut());
          }
        } else {
           // Không có refresh token -> Logout
           api.dispatch(logOut());
        }
      } finally {
        release();
      }
    } else {
      // Nếu mutex đang bị lock (đang có request khác refresh), đợi và retry
      await mutex.waitForUnlock();
      result = await baseQuery(args, api, extraOptions);
    }
  }
  return result;
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "User",
    "Account",
    "Friends",
    "FriendRequests",
    "Blocked",
    "Chats",
    "Messages",
    "PinnedMessages",
    "Notifications",
  ],
  endpoints: () => ({}),
});