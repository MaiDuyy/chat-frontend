// authSlice.ts
import { User } from "@/src/type/auth.types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

// --- HÀM HELPER ĐỂ LẤY DỮ LIỆU TỪ LS ---
const getInitialStateFromStorage = (): AuthState => {
  if (typeof window === 'undefined') {
    return { user: null, token: null, refreshToken: null, isAuthenticated: false };
  }

  try {
    const token = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");
    // Lưu ý: User object nên được lưu vào LS dưới dạng JSON string khi login
    const userJson = localStorage.getItem("user"); 
    const user = userJson ? JSON.parse(userJson) : null;

    if (token && refreshToken && user) {
      return {
        user: user,
        token: token,
        refreshToken: refreshToken,
        isAuthenticated: true, // Đã có token thì coi như đã login
      };
    }
  } catch (error) {
    console.error("Lỗi parse JSON từ localStorage", error);
  }

  return { user: null, token: null, refreshToken: null, isAuthenticated: false };
};

// SỬ DỤNG HÀM TRÊN ĐỂ KHỞI TẠO
const initialState: AuthState = getInitialStateFromStorage();

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
      
      if (typeof window !== 'undefined') {
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        // QUAN TRỌNG: Lưu cả thông tin user để khi F5 còn load lại được
        localStorage.setItem("user", JSON.stringify(user)); 
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
        localStorage.removeItem("user"); // Xóa user
      }
    },
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