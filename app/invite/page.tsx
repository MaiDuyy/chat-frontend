"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import {
  useValidateInviteTokenQuery,
  useAcceptInviteMutation,
  useJoinInviteMutation,
  useRejectInviteMutation
} from "@/src/redux/feature/workspaceApi";
import { useGetProfileQuery } from "@/src/redux/feature/userApi";
import { setCredentials } from "@/src/redux/feature/authSlice";
import { setWorkspace } from "@/src/redux/feature/workspaceSlice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, UserPlus, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Mail, User, Building2, Terminal } from "lucide-react";
import { toast } from "sonner";

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0F0F11] flex items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-foreground" />
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Initialising setup...</p>
        </div>
      </div>
    }>
      <InvitePageContent />
    </Suspense>
  );
}

function InvitePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const token = searchParams.get("token");

  // Registration form state
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState("male");

  const {
    data: inviteData,
    isLoading: isValidating,
    error: validationError
  } = useValidateInviteTokenQuery(token || "", {
    skip: !token,
  });

  const hasToken = typeof window !== "undefined" && !!localStorage.getItem("accessToken");
  const { data: profile, isLoading: isCheckingAuth } = useGetProfileQuery(undefined, {
    skip: !hasToken,
  });
  const [acceptInvite, { isLoading: isAccepting }] = useAcceptInviteMutation();
  const [joinInvite, { isLoading: isJoining }] = useJoinInviteMutation();
  const [rejectInvite, { isLoading: isRejecting }] = useRejectInviteMutation();

  const handleAction = async () => {
    if (!token) return;

    if (profile) {
      // Scenario A: Existing User
      const userEmail = (profile as any).user?.email || (profile as any).email;
      if (userEmail?.toLowerCase() !== (inviteData as any)?.invitation?.email.toLowerCase()) {
        toast.error("Email tài khoản không khớp với email nhận lời mời!");
        return;
      }

      try {
        await joinInvite({ token }).unwrap();
        toast.success("Gia nhập không gian làm việc thành công!");

        // Redirect to workspace
        const workspaceId = (inviteData as any).invitation.workspaceId;
        if (workspaceId) dispatch(setWorkspace(workspaceId));
        router.push("/chat");
      } catch (err: any) {
        toast.error(err?.data?.message || "Không thể tham gia workspace");
      }
    } else {
      // Scenario B: New User (Registration)
      if (!name || !password) {
        toast.error("Vui lòng điền họ tên và đặt mật khẩu bảo mật!");
        return;
      }

      try {
        const result = await acceptInvite({
          token,
          name,
          password,
          gender
        }).unwrap();

        // Auto-login
        if (result.accessToken) {
          dispatch(setCredentials({
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            roles: result.roles,
          }));

          toast.success("Đăng ký tài khoản và gia nhập thành công!");

          // Redirect to workspace
          const workspaceId = (inviteData as any).invitation.workspaceId;
          if (workspaceId) dispatch(setWorkspace(workspaceId));
          router.push("/chat");
        }
      } catch (err: any) {
        toast.error(err?.data?.message || "Đăng ký tài khoản không thành công");
      }
    }
  };

  const handleReject = async () => {
    if (!token) return;

    try {
      await rejectInvite({ token }).unwrap();
      toast.info("Bạn đã từ chối lời mời.");
      router.push("/");
    } catch (err: any) {
      toast.error(err?.data?.message || "Có lỗi xảy ra");
    }
  };

  // State Card styling generator for unified theme
  const renderWrapper = (children: React.ReactNode) => (
    <div className="min-h-screen w-full bg-[#0F0F11] flex items-center justify-center p-4 relative overflow-hidden font-mono selection:bg-white selection:text-[#0F0F11]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none z-0" />
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none z-0" />
      <div className="relative z-10 w-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );

  if (!token) {
    return renderWrapper(
      <Card className="w-full max-w-md shadow-2xl border border-red-500/30 dark:border-red-950/40 bg-background rounded-sm overflow-hidden animate-in fade-in duration-300">
        <div className="h-1 bg-red-600 w-full" />
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-red-100/50 dark:bg-red-950/30 border border-red-200/40 dark:border-red-900/25 flex items-center justify-center mb-3 rounded-sm">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-500" />
          </div>
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">Liên kết không hợp lệ</CardTitle>
          <CardDescription className="text-[10px] font-mono text-muted-foreground dark:text-muted-foreground leading-normal pt-1.5">
            Đường dẫn lời mời này bị thiếu khóa xác thực hệ thống.
          </CardDescription>
        </CardHeader>
        <CardFooter className="pt-4 pb-6">
          <Button 
            className="w-full border border-border hover:bg-muted dark:hover:bg-muted rounded-sm h-9 text-xs font-mono font-bold text-muted-foreground shadow-none bg-transparent"
            variant="outline" 
            onClick={() => router.push("/")}
          >
            Quay lại trang chủ
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (isValidating || isCheckingAuth) {
    return renderWrapper(
      <div className="text-center space-y-4">
        <div className="relative w-14 h-14 mx-auto flex items-center justify-center border border-border/80 dark:border-white/[0.06] rounded-sm bg-slate-950/20">
          <Loader2 className="w-6 h-6 animate-spin text-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">SECURE_GATEWAY_VALIDATION</p>
          <p className="text-[9px] text-muted-foreground font-mono">Đang kiểm tra tính toàn vẹn của mã thông báo...</p>
        </div>
      </div>
    );
  }

  if (validationError || !inviteData?.success) {
    return renderWrapper(
      <Card className="w-full max-w-md shadow-2xl border border-amber-500/30 dark:border-amber-950/40 bg-background rounded-sm overflow-hidden animate-in fade-in duration-300">
        <div className="h-1 bg-amber-500 w-full" />
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-amber-100/50 dark:bg-amber-950/30 border border-amber-200/40 dark:border-amber-900/25 flex items-center justify-center mb-3 rounded-sm">
            <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-500" />
          </div>
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">Lời mời hết hiệu lực</CardTitle>
          <CardDescription className="text-[10px] font-mono text-muted-foreground dark:text-muted-foreground leading-normal pt-1.5">
            {(validationError as any)?.data?.message || "Đường dẫn lời mời này đã hết hạn hoặc đã được sử dụng trước đó."}
          </CardDescription>
        </CardHeader>
        <CardFooter className="pt-4 pb-6">
          <Button 
            className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-muted dark:hover:bg-muted dark:text-foreground rounded-sm h-9 text-xs font-mono font-bold shadow-none" 
            onClick={() => router.push("/")}
          >
            Quay lại trang chủ
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const { invitation }: any = inviteData;
  const userProfileEmail = (profile as any)?.user?.email || (profile as any)?.email;
  const emailMismatch = profile && userProfileEmail?.toLowerCase() !== invitation.email.toLowerCase();

  return renderWrapper(
    <Card className="w-full max-w-[500px] shadow-2xl border border-border bg-background overflow-hidden rounded-sm animate-in fade-in duration-500">
      <div className="h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 w-full" />

      <CardHeader className="text-center pb-4 pt-6">
        <div className="mx-auto w-16 h-16 relative mb-4">
          <div className="absolute inset-0 border border-border rounded-sm bg-muted dark:bg-muted flex items-center justify-center shadow-sm">
            {invitation.workspace?.icon ? (
              <Avatar className="h-14 w-14 rounded-sm">
                <AvatarImage src={invitation.workspace.icon} className="rounded-sm" />
                <AvatarFallback className="rounded-sm text-lg font-bold bg-slate-900 text-white dark:bg-muted dark:text-foreground font-mono">
                  {invitation.workspace.name[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-14 h-14 bg-muted dark:bg-muted rounded-sm flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        <CardTitle className="text-lg font-bold uppercase tracking-tight text-foreground font-mono">
          Yêu cầu gia nhập
        </CardTitle>
        <CardDescription className="text-[10px] font-mono text-muted-foreground dark:text-muted-foreground leading-normal mt-1">
          Lời mời chính thức tham gia tổ chức <span className="text-foreground dark:text-foreground font-bold">&quot;{invitation.workspace?.name}&quot;</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        {/* Core Metadata Info Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-sm bg-muted/50 dark:bg-muted/40 border border-border flex items-center gap-2.5">
            <Mail className="w-4 h-4 text-blue-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[8px] uppercase font-bold text-muted-foreground dark:text-muted-foreground tracking-widest font-mono">Gửi đến</p>
              <p className="text-[10px] font-bold text-muted-foreground truncate">{invitation.email}</p>
            </div>
          </div>
          <div className="p-3 rounded-sm bg-muted/50 dark:bg-muted/40 border border-border flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[8px] uppercase font-bold text-muted-foreground dark:text-muted-foreground tracking-widest font-mono">Vai trò</p>
              <p className="text-[10px] font-bold text-muted-foreground truncate uppercase">{invitation.role}</p>
            </div>
          </div>
          {invitation.department && (
            <div className="p-3 rounded-sm bg-muted/50 dark:bg-muted/40 border border-border flex items-center gap-2.5 col-span-2">
              <Building2 className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[8px] uppercase font-bold text-muted-foreground dark:text-muted-foreground tracking-widest font-mono">Phòng ban liên kết</p>
                <div className="flex justify-between items-center mt-0.5">
                  <p className="text-[10px] font-bold text-muted-foreground">{invitation.department.name}</p>
                  <p className="text-[8px] font-mono text-amber-600 dark:text-amber-500 font-bold uppercase tracking-wide">
                    Vai trò: {invitation.departmentRole}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {profile ? (
          emailMismatch ? (
            <div className="p-3 rounded-sm bg-red-50/10 dark:bg-red-950/10 border border-red-200/40 dark:border-red-950/20 flex gap-2.5 animate-in slide-in-from-top-1 duration-300">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[10px] text-red-900 dark:text-red-400 font-bold uppercase tracking-wider font-mono">
                  Lỗi đồng bộ tài khoản
                </p>
                <p className="text-[9px] text-red-650 dark:text-red-400/80 leading-normal">
                  Bạn đang đăng nhập bằng <b>{userProfileEmail}</b> nhưng lời mời dành cho <b>{invitation.email}</b>.
                </p>
                <Button
                  variant="link"
                  className="p-0 h-auto text-[9px] font-mono text-red-500 hover:text-red-450 dark:text-red-400 dark:hover:text-red-300 font-bold underline"
                  onClick={() => router.push(`/login?callback=/invite?token=${token}`)}
                >
                  [ ĐĂNG NHẬP TÀI KHOẢN KHÁC ]
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-sm bg-emerald-50/10 dark:bg-emerald-950/10 border border-emerald-250/20 dark:border-emerald-900/20 flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <p className="text-[10px] text-emerald-900 dark:text-emerald-450 font-bold uppercase tracking-wider font-mono">
                  Sẵn sàng gia nhập
                </p>
                <p className="text-[9px] text-muted-foreground dark:text-muted-foreground">Hệ thống đã nhận diện được tài khoản của bạn.</p>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-3.5 pt-2 animate-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center gap-2">
              <div className="h-[1px] bg-muted dark:bg-white/[0.08] flex-1" />
              <span className="text-[8px] uppercase font-bold text-muted-foreground tracking-widest font-mono">Đăng ký tài khoản mới</span>
              <div className="h-[1px] bg-muted dark:bg-white/[0.08] flex-1" />
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-[10px] font-bold font-mono uppercase tracking-wider text-foreground dark:text-foreground">Họ và tên</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="NGUYEN VAN A"
                    className="pl-9 h-9 rounded-sm border-border bg-muted/20 dark:bg-muted/50 focus-visible:ring-0 focus-visible:border-border dark:focus-visible:border-border text-xs font-mono uppercase"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="text-[10px] font-bold font-mono uppercase tracking-wider text-foreground dark:text-foreground">Mật khẩu bảo mật</Label>
                <div className="relative">
                  <Terminal className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9 h-9 rounded-sm border-border bg-muted/20 dark:bg-muted/50 focus-visible:ring-0 focus-visible:border-border dark:focus-visible:border-border text-xs font-mono"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold font-mono uppercase tracking-wider text-foreground dark:text-foreground">Giới tính</Label>
                <RadioGroup defaultValue="male" className="flex gap-3" onValueChange={setGender}>
                  <div className="flex items-center space-x-2 bg-muted/50 dark:bg-muted/30 border border-border px-4 py-2 rounded-sm flex-1 cursor-pointer hover:bg-muted dark:hover:bg-muted/60 transition-colors">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male" className="cursor-pointer text-xs font-mono">Nam</Label>
                  </div>
                  <div className="flex items-center space-x-2 bg-muted/50 dark:bg-muted/30 border border-border px-4 py-2 rounded-sm flex-1 cursor-pointer hover:bg-muted dark:hover:bg-muted/60 transition-colors">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female" className="cursor-pointer text-xs font-mono">Nữ</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-4 pt-4 pb-6 border-t border-border dark:border-white/[0.04]">
        <div className="grid grid-cols-2 gap-3 w-full">
          <Button
            variant="outline"
            className="h-10 rounded-sm border border-border hover:bg-muted dark:hover:bg-muted text-muted-foreground font-bold font-mono text-xs shadow-none transition-all active:scale-[0.98] bg-transparent"
            onClick={handleReject}
            disabled={isRejecting || isAccepting || isJoining}
          >
            {isRejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : "TỪ CHỐI"}
          </Button>

          <Button
            className="h-10 rounded-sm bg-slate-900 hover:bg-slate-800 text-white dark:bg-muted dark:hover:bg-muted dark:text-foreground shadow-none font-bold font-mono text-xs transition-all active:scale-[0.98] border border-transparent disabled:opacity-50"
            onClick={handleAction}
            disabled={isAccepting || isJoining || isRejecting || !!emailMismatch}
          >
            {isAccepting || isJoining ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : (
              <>
                {profile ? "CHẤP NHẬN" : "GIA NHẬP"}
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </>
            )}
          </Button>
        </div>

        <p className="text-[8px] text-center text-muted-foreground font-mono tracking-wide leading-relaxed px-4">
          Bằng cách gia nhập, bạn đồng ý tuân thủ các quy tắc tổ chức, điều khoản dịch vụ và chính sách bảo mật dữ liệu của Nexus.
        </p>
      </CardFooter>
    </Card>
  );
}
