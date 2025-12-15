
import { User } from "@/src/type/auth.types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";


interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

// Khởi tạo state ban đầu (có thể lấy từ localStorage nếu cần persist ngay lúc load)
const initialState: AuthState = {
  user: null,
  token: null, // Access Token
  refreshToken: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; accessToken: string; refreshToken: string }>
    ) => {
      const { user, accessToken, refreshToken } = action.payload;
      state.user = user;
      state.token = accessToken;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;
      
      // Lưu vào localStorage để persist (Hoặc dùng thư viện redux-persist)
      if (typeof window !== 'undefined') {
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
      }
    },
    logOut: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      }
    },
    // Action cập nhật token mới sau khi refresh thành công
    tokenReceived: (state, action: PayloadAction<{ accessToken: string, refreshToken: string }>) => {
      state.token = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      if (typeof window !== 'undefined') {
        localStorage.setItem("accessToken", action.payload.accessToken);
        localStorage.setItem("refreshToken", action.payload.refreshToken);
      }
    }
  },
});

export const { setCredentials, logOut, tokenReceived } = authSlice.actions;
export default authSlice.reducer;