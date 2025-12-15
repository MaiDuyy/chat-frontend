export type RoleType = "USER" | "ADMIN" | "MANAGER"; // Tùy chỉnh theo enum của bạn

export interface User {
  id: string;
  name: string;
  email: string;
  number: string;
  avatar?: string;
  role: RoleType;
  isVerified: boolean;
}

export interface AuthResponse {
  message?: string;
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  deviceId?: string;
  deviceName?: string;
  platform?: string;
}

export interface LoginPhoneRequest {
  number: string;
  password: string;
  deviceId?: string;
  deviceName?: string;
  platform?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  number: string;
  password: string;
  gender?: string;
  birthDate?: string;
  location?: string;
  role?: RoleType;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}