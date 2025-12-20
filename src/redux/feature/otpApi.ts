// src/redux/feature/otpApi.ts
// API endpoints cho OTP - xác thực email, quên mật khẩu

import { apiSlice } from "../api/baseApi";
import {
  SendOTPRequest,
  VerifyEmailOTPRequest,
  ResetPasswordRequest,
  VerifyOTPRequest,
  ResendOTPRequest,
  OTPResponse,
  VerifyOTPResponse,
} from "@/src/type/auth.types";

export const otpApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Gửi OTP xác thực email
    sendVerificationOTP: builder.mutation<OTPResponse, SendOTPRequest>({
      query: (data) => ({
        url: "/otp/send-verification",
        method: "POST",
        body: data,
      }),
    }),

    // Xác thực email bằng OTP
    verifyEmailOTP: builder.mutation<OTPResponse, VerifyEmailOTPRequest>({
      query: (data) => ({
        url: "/otp/verify-email",
        method: "POST",
        body: data,
      }),
    }),

    // Gửi OTP quên mật khẩu
    sendForgotPasswordOTP: builder.mutation<OTPResponse, SendOTPRequest>({
      query: (data) => ({
        url: "/otp/forgot-password",
        method: "POST",
        body: data,
      }),
    }),

    // Đặt lại mật khẩu với OTP
    resetPasswordWithOTP: builder.mutation<OTPResponse, ResetPasswordRequest>({
      query: (data) => ({
        url: "/otp/reset-password",
        method: "POST",
        body: data,
      }),
    }),

    // Kiểm tra mã OTP (không consume)
    verifyOTPCode: builder.mutation<VerifyOTPResponse, VerifyOTPRequest>({
      query: (data) => ({
        url: "/otp/verify",
        method: "POST",
        body: data,
      }),
    }),

    // Gửi lại OTP
    resendOTP: builder.mutation<OTPResponse, ResendOTPRequest>({
      query: (data) => ({
        url: "/otp/resend",
        method: "POST",
        body: data,
      }),
    }),
  }),
});

export const {
  useSendVerificationOTPMutation,
  useVerifyEmailOTPMutation,
  useSendForgotPasswordOTPMutation,
  useResetPasswordWithOTPMutation,
  useVerifyOTPCodeMutation,
  useResendOTPMutation,
} = otpApi;
