"use client";

import { useState, useRef } from "react";
import { useAppSelector, useAppDispatch } from "@/src/redux/hooks";
import { useUpdateProfileMutation, useChangePasswordMutation } from "@/src/redux/feature/userApi";
import { setCredentials, logOut } from "@/src/redux/feature/authSlice";
import { performFullLogout } from "@/src/utils/auth-utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
    User,
    Bell,
    Lock,
    Palette,
    Languages,
    HelpCircle,
    LogOut,
    Camera,
    Moon,
    Sun,
    ChevronRight,
    Shield,
    Eye,
    EyeOff,
    Save,
    ArrowLeft,
    Ban,
} from "lucide-react";
import { AccountSettingsPage } from "../account";
import BlockedUsersSheet from "../chat/blocked-users-sheet";



type SettingsSection = "profile" | "notifications" | "privacy" | "appearance" | "language" | "help";

export default function SettingsPage() {
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const [activeSection, setActiveSection] = useState<SettingsSection>("profile");
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showBlockedUsers, setShowBlockedUsers] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form states
    const [name, setName] = useState(user?.name || "");
    const [number, setNumber] = useState(user?.number || "");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    // Notification settings
    const [notifications, setNotifications] = useState({
        messages: true,
        mentions: true,
        friendRequests: true,
        sounds: true,
        desktop: true,
    });

    // Privacy settings
    const [privacy, setPrivacy] = useState({
        showOnlineStatus: true,
        showLastSeen: true,
        showReadReceipts: true,
        allowAddBynumber: true,
    });

    // API mutations
    const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
    const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();

    const initials = user?.name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U";

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onload = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpdateProfile = async () => {
        try {
            const formData = new FormData();
            formData.append("name", name);
            if (number) formData.append("number", number);
            if (avatarFile) formData.append("avatar", avatarFile);

            const result = await updateProfile(formData).unwrap();
            if (result.user) {
                dispatch(setCredentials({
                    user: result.user,
                    accessToken: "",
                    refreshToken: ""
                }));
                toast.success("Cập nhật thông tin thành công!");
                setIsEditing(false);
                setAvatarFile(null);
                setAvatarPreview(null);
            }
        } catch (error: any) {
            toast.error(error?.data?.message || "Lỗi cập nhật thông tin");
        }
    };

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            toast.error("Mật khẩu xác nhận không khớp");
            return;
        }
        if (newPassword.length < 6) {
            toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
            return;
        }

        try {
            await changePassword({
                currentPassword,
                newPassword,
            }).unwrap();
            toast.success("Đổi mật khẩu thành công!");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            toast.error(error?.data?.message || "Lỗi đổi mật khẩu");
        }
    };

    const handleLogout = () => {
        performFullLogout(dispatch);
    };

    const toggleDarkMode = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.classList.toggle("dark");
    };

    const menuItems = [
        { id: "profile" as const, icon: User, label: "Thông tin cá nhân" },
        { id: "notifications" as const, icon: Bell, label: "Thông báo" },
        { id: "privacy" as const, icon: Lock, label: "Quyền riêng tư" },
        { id: "appearance" as const, icon: Palette, label: "Giao diện" },
        { id: "language" as const, icon: Languages, label: "Ngôn ngữ" },
        { id: "help" as const, icon: HelpCircle, label: "Trợ giúp" },
    ];

    const renderContent = () => {
        switch (activeSection) {
            case "profile":
                return (
                    // <div className="space-y-6">
                    //     <h2 className="text-xl font-semibold text-foreground">
                    //         Thông tin cá nhân
                    //     </h2>

                    //     {/* Avatar */}
                    //     <div className="flex items-center gap-6">
                    //         <div className="relative">
                    //             <Avatar className="h-24 w-24 ring-4 ring-blue-100 dark:ring-blue-900">
                    //                 <AvatarImage src={avatarPreview || user?.avatar || undefined} />
                    //                 <AvatarFallback className="bg-gradient-to-br from-blue-500 to-emerald-600 text-white text-2xl">
                    //                     {initials}
                    //                 </AvatarFallback>
                    //             </Avatar>
                    //             <button
                    //                 onClick={() => fileInputRef.current?.click()}
                    //                 className="absolute bottom-0 right-0 p-2 bg-primary rounded-full text-white hover:bg-primary/90 transition-colors shadow-lg"
                    //             >
                    //                 <Camera className="h-4 w-4" />
                    //             </button>
                    //             <input
                    //                 ref={fileInputRef}
                    //                 type="file"
                    //                 accept="image/*"
                    //                 className="hidden"
                    //                 onChange={handleAvatarChange}
                    //             />
                    //         </div>
                    //         <div>
                    //             <h3 className="text-lg font-semibold text-foreground">
                    //                 {user?.name}
                    //             </h3>
                    //             <p className="text-muted-foreground">{user?.email}</p>
                    //         </div>
                    //     </div>

                    //     {/* Form */}
                    //     <div className="space-y-4 max-w-md">
                    //         <div>
                    //             <Label htmlFor="name">Tên hiển thị</Label>
                    //             <Input
                    //                 id="name"
                    //                 value={name}
                    //                 onChange={(e) => setName(e.target.value)}
                    //                 disabled={!isEditing}
                    //                 className="mt-1"
                    //             />
                    //         </div>
                    //         <div>
                    //             <Label htmlFor="email">Email</Label>
                    //             <Input
                    //                 id="email"
                    //                 value={user?.email || ""}
                    //                 disabled
                    //                 className="mt-1 bg-muted dark:bg-muted"
                    //             />
                    //         </div>
                    //         <div>
                    //             <Label htmlFor="number">Số điện thoại</Label>
                    //             <Input
                    //                 id="number"
                    //                 value={number}
                    //                 onChange={(e) => setNumber(e.target.value)}
                    //                 disabled={!isEditing}
                    //                 placeholder="Chưa cập nhật"
                    //                 className="mt-1"
                    //             />
                    //         </div>

                    //         <div className="flex gap-3 pt-4">
                    //             {isEditing ? (
                    //                 <>
                    //                     <Button
                    //                         onClick={handleUpdateProfile}
                    //                         disabled={isUpdating}
                    //                         className="bg-primary hover:bg-primary/90"
                    //                     >
                    //                         <Save className="h-4 w-4 mr-2" />
                    //                         {isUpdating ? "Đang lưu..." : "Lưu thay đổi"}
                    //                     </Button>
                    //                     <Button
                    //                         variant="outline"
                    //                         onClick={() => {
                    //                             setIsEditing(false);
                    //                             setName(user?.name || "");
                    //                             setNumber(user?.number || "");
                    //                             setAvatarFile(null);
                    //                             setAvatarPreview(null);
                    //                         }}
                    //                     >
                    //                         Hủy
                    //                     </Button>
                    //                 </>
                    //             ) : (
                    //                 <Button onClick={() => setIsEditing(true)}>
                    //                     Chỉnh sửa
                    //                 </Button>
                    //             )}
                    //         </div>
                    //     </div>

                    //     {/* Change Password */}
                    //     <div className="pt-6 border-t border-border">
                    //         <h3 className="text-lg font-semibold text-foreground mb-4">
                    //             Đổi mật khẩu
                    //         </h3>
                    //         <div className="space-y-4 max-w-md">
                    //             <div className="relative">
                    //                 <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
                    //                 <Input
                    //                     id="currentPassword"
                    //                     type={showPassword ? "text" : "password"}
                    //                     value={currentPassword}
                    //                     onChange={(e) => setCurrentPassword(e.target.value)}
                    //                     className="mt-1 pr-10"
                    //                 />
                    //                 <button
                    //                     type="button"
                    //                     onClick={() => setShowPassword(!showPassword)}
                    //                     className="absolute right-3 top-9 text-muted-foreground hover:text-muted-foreground"
                    //                 >
                    //                     {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    //                 </button>
                    //             </div>
                    //             <div>
                    //                 <Label htmlFor="newPassword">Mật khẩu mới</Label>
                    //                 <Input
                    //                     id="newPassword"
                    //                     type="password"
                    //                     value={newPassword}
                    //                     onChange={(e) => setNewPassword(e.target.value)}
                    //                     className="mt-1"
                    //                 />
                    //             </div>
                    //             <div>
                    //                 <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
                    //                 <Input
                    //                     id="confirmPassword"
                    //                     type="password"
                    //                     value={confirmPassword}
                    //                     onChange={(e) => setConfirmPassword(e.target.value)}
                    //                     className="mt-1"
                    //                 />
                    //             </div>
                    //             <Button
                    //                 onClick={handleChangePassword}
                    //                 disabled={isChangingPassword || !currentPassword || !newPassword}
                    //                 className="bg-primary hover:bg-primary/90"
                    //             >
                    //                 <Lock className="h-4 w-4 mr-2" />
                    //                 {isChangingPassword ? "Đang xử lý..." : "Đổi mật khẩu"}
                    //             </Button>
                    //         </div>
                    //     </div>
                    // </div>
                    // <div className="space-y-6 max-w-full">
                    <AccountSettingsPage />
                    // </div>
                );

            case "notifications":
                return (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-foreground">
                            Cài đặt thông báo
                        </h2>
                        <div className="space-y-4">
                            {[
                                { key: "messages", label: "Tin nhắn mới", desc: "Nhận thông báo khi có tin nhắn mới" },
                                { key: "mentions", label: "Nhắc đến", desc: "Thông báo khi được nhắc đến trong nhóm" },
                                { key: "friendRequests", label: "Lời mời kết bạn", desc: "Thông báo lời mời kết bạn" },
                                { key: "sounds", label: "Âm thanh", desc: "Phát âm thanh khi có thông báo" },
                                { key: "desktop", label: "Thông báo desktop", desc: "Hiển thị thông báo trên màn hình" },
                            ].map((item) => (
                                <div key={item.key} className="flex items-center justify-between p-3 bg-muted dark:bg-slate-800/60 border border-border/80 dark:border-border/50 rounded-md">
                                    <div>
                                        <p className="text-xs font-semibold text-foreground">{item.label}</p>
                                        <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                                    </div>
                                    <Switch
                                        checked={notifications[item.key as keyof typeof notifications]}
                                        onCheckedChange={(checked: boolean) =>
                                            setNotifications((prev) => ({ ...prev, [item.key]: checked }))
                                        }
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case "privacy":
                return (
                    <div className="space-y-4">
                        <h2 className="text-sm font-bold text-foreground">
                            Quyền riêng tư
                        </h2>
                        <div className="space-y-1.5">
                            {[
                                { key: "showOnlineStatus", label: "Hiển thị trạng thái online", desc: "Cho phép người khác thấy bạn đang online" },
                                { key: "showLastSeen", label: "Hiển thị lần hoạt động cuối", desc: "Cho phép người khác thấy lần online cuối" },
                                { key: "showReadReceipts", label: "Xác nhận đã đọc", desc: "Cho phép người khác thấy bạn đã đọc tin nhắn" },
                                { key: "allowAddBynumber", label: "Cho phép tìm kiếm bằng SĐT", desc: "Người khác có thể tìm bạn bằng số điện thoại" },
                            ].map((item) => (
                                <div key={item.key} className="flex items-center justify-between p-3 bg-muted dark:bg-slate-800/60 border border-border/80 dark:border-border/50 rounded-md">
                                    <div>
                                        <p className="text-xs font-semibold text-foreground">{item.label}</p>
                                        <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                                    </div>
                                    <Switch
                                        checked={privacy[item.key as keyof typeof privacy]}
                                        onCheckedChange={(checked: boolean) =>
                                            setPrivacy((prev) => ({ ...prev, [item.key]: checked }))
                                        }
                                    />
                                </div>
                            ))}

                            {/* Blocked Users */}
                            <div
                                className="flex items-center justify-between p-3 bg-muted dark:bg-slate-800/60 border border-border/80 dark:border-border/50 rounded-md cursor-pointer hover:bg-muted dark:hover:bg-slate-700/60 transition-colors"
                                onClick={() => setShowBlockedUsers(true)}
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-md bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                                        <Ban className="h-3.5 w-3.5 text-red-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-foreground">Danh sách chặn</p>
                                        <p className="text-[11px] text-muted-foreground">Quản lý những người bạn đã chặn</p>
                                    </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>

                        <BlockedUsersSheet
                            isOpen={showBlockedUsers}
                            onClose={() => setShowBlockedUsers(false)}
                        />
                    </div>
                );

            case "appearance":
                return (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-foreground">
                            Giao diện
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-muted dark:bg-gray-800 rounded-md">
                                <div className="flex items-center gap-3">
                                    {isDarkMode ? <Moon className="h-5 w-5 text-blue-500" /> : <Sun className="h-5 w-5 text-yellow-500" />}
                                    <div>
                                        <p className="font-medium text-foreground">Chế độ tối</p>
                                        <p className="text-sm text-muted-foreground">
                                            {isDarkMode ? "Đang bật" : "Đang tắt"}
                                        </p>
                                    </div>
                                </div>
                                <Switch checked={isDarkMode} onCheckedChange={toggleDarkMode} />
                            </div>

                            <div className="p-4 bg-muted dark:bg-gray-800 rounded-md">
                                <p className="font-medium text-foreground mb-3">Màu chủ đề</p>
                                <div className="flex gap-3">
                                    {["bg-blue-500", "bg-emerald-500", "bg-green-500", "bg-amber-500", "bg-orange-500"].map((color) => (
                                        <button
                                            key={color}
                                            className={`w-10 h-10 rounded-full ${color} ring-2 ring-offset-2 ring-transparent hover:ring-gray-400 transition-all`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case "language":
                return (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-foreground">
                            Ngôn ngữ
                        </h2>
                        <div className="space-y-2">
                            {[
                                { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
                                { code: "en", label: "English", flag: "🇺🇸" },
                            ].map((lang) => (
                                <button
                                    key={lang.code}
                                    className="w-full flex items-center justify-between p-4 bg-muted dark:bg-gray-800 rounded-md hover:bg-muted dark:hover:bg-muted transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{lang.flag}</span>
                                        <span className="font-medium text-foreground">{lang.label}</span>
                                    </div>
                                    {lang.code === "vi" && (
                                        <div className="w-4 h-4 bg-blue-500 rounded-full" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                );

            case "help":
                return (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-foreground">
                            Trợ giúp & Hỗ trợ
                        </h2>
                        <div className="space-y-2">
                            {[
                                { label: "Trung tâm trợ giúp", desc: "Câu hỏi thường gặp và hướng dẫn" },
                                { label: "Liên hệ hỗ trợ", desc: "Gửi yêu cầu hỗ trợ" },
                                { label: "Điều khoản sử dụng", desc: "Xem điều khoản dịch vụ" },
                                { label: "Chính sách bảo mật", desc: "Xem chính sách bảo mật" },
                                { label: "Phiên bản", desc: "v1.0.0" },
                            ].map((item) => (
                                <button
                                    key={item.label}
                                    className="w-full flex items-center justify-between p-4 bg-muted dark:bg-gray-800 rounded-md hover:bg-muted dark:hover:bg-muted transition-colors"
                                >
                                    <div className="text-left">
                                        <p className="font-medium text-foreground">{item.label}</p>
                                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                </button>
                            ))}
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="flex h-screen bg-[#F8F8F8] dark:bg-[#111113]">
            {/* Settings Sidebar */}
            <div className="w-64 bg-background border-r border-border flex flex-col shrink-0">
                {/* Header */}
                <div className="flex items-center gap-2.5 px-4 h-12 border-b border-border">
                    <a href="/chat" className="w-7 h-7 flex items-center justify-center rounded-sm text-muted-foreground hover:bg-muted dark:hover:bg-slate-800 transition-colors cursor-pointer">
                        <ArrowLeft className="h-4 w-4" />
                    </a>
                    <h1 className="text-xs font-bold text-foreground font-mono uppercase tracking-wider">Cài đặt</h1>
                </div>

                {/* Menu */}
                <nav className="flex-1 p-2 space-y-1">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveSection(item.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 transition-all duration-150 text-xs font-mono font-medium cursor-pointer rounded-sm ${
                                activeSection === item.id
                                    ? 'bg-muted dark:bg-muted text-foreground font-bold border-l-2 border-slate-900 dark:border-border pl-2'
                                    : 'text-muted-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-muted hover:text-foreground dark:hover:text-foreground'
                            }`}
                        >
                            <item.icon className="h-3.5 w-3.5 shrink-0" />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>

                {/* Logout */}
                <div className="p-2 border-t border-border">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-xs font-mono font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
                    >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Đăng xuất</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className={`p-6 transition-all duration-300 ${activeSection === "profile" ? "max-w-6xl mx-auto w-full" : "max-w-2xl"}`}>
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}
