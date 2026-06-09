import React, { useState } from "react";
import { Copy, Check, Share2, Download, ExternalLink, ShieldAlert, UserPlus, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getInitials, avatarColor } from "../shared/utils";
import { getAvatarUrl } from "@/src/utils/image-utils";

interface InviteTabProps {
    chat: any;
    handleApproveJoin: (targetId: string, approve: boolean) => void;
}

export function InviteTab({ chat, handleApproveJoin }: InviteTabProps) {
    const [copied, setCopied] = useState(false);
    
    // Join Link logic
    const inviteUrl = typeof window !== "undefined" 
        ? `${window.location.origin}/join/${chat?.id}` 
        : "";
        
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(inviteUrl)}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        toast.success("Đã sao chép liên kết mời!");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadQR = async () => {
        try {
            const response = await fetch(qrCodeUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `QR_Invite_${chat?.name || "Group"}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success("Đã tải xuống mã QR!");
        } catch (err) {
            toast.error("Không thể tải xuống mã QR");
        }
    };

    const isPrivate = chat?.joinPolicy === "PRIVATE";
    const needsApproval = chat?.joinPolicy === "APPROVAL";
    const joinRequests = chat?.joinRequests || [];

    if (isPrivate) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <ShieldAlert className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Nhóm riêng tư</h3>
                <p className="text-[12px] text-muted-foreground mt-2 max-w-[280px]">
                    Kế hoạch mời qua liên kết và mã QR đã bị tắt. Chỉ quản trị viên mới có thể thêm thành viên trực tiếp vào nhóm.
                </p>
                <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-lg text-amber-700 text-left">
                    <p className="text-[11px] leading-relaxed">
                        <span className="font-bold">Mẹo:</span> Thay đổi chế độ tham gia trong phần <span className="font-semibold italic">Cài đặt nhóm</span> để cho phép người khác tham gia qua liên kết.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Share Section */}
            <div className="space-y-6">
                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-5 flex flex-col items-center gap-4">
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-border">
                        <img 
                            src={qrCodeUrl} 
                            alt="Join Group QR Code" 
                            className="w-44 h-44"
                        />
                    </div>
                    <div className="text-center space-y-1">
                        <h3 className="text-sm font-bold text-foreground">Quét mã để vào nhóm</h3>
                        <p className="text-[11px] text-muted-foreground max-w-[240px]">
                            {needsApproval 
                                ? "Người tham gia qua mã QR này sẽ cần sự phê duyệt của bạn." 
                                : "Bất kỳ ai quét mã này đều có thể tham gia nhóm ngay lập tức."}
                        </p>
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-[11px] font-semibold gap-1.5 rounded-md border-blue-200 text-blue-700 bg-white hover:bg-blue-50"
                        onClick={handleDownloadQR}
                    >
                        <Download className="w-3.5 h-3.5" />
                        Tải mã QR xuống
                    </Button>
                </div>

                <div className="space-y-3">
                    <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">
                        Liên kết mời trực tiếp
                    </label>
                    <div className="flex gap-2">
                        <div className="relative flex-1 group">
                            <Input 
                                readOnly 
                                value={inviteUrl} 
                                className="pr-10 h-10 text-[13px] bg-muted/50 border-border rounded-lg focus-visible:ring-blue-500"
                            />
                            <button 
                                onClick={handleCopy}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-blue-600 transition-colors"
                            >
                                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <Button 
                            asChild
                            variant="ghost" 
                            className="h-10 text-[13px] rounded-lg bg-muted hover:bg-muted text-muted-foreground border border-border"
                        >
                            <a href={inviteUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-3.5 h-3.5 mr-2" />
                                Mở liên kết
                            </a>
                        </Button>
                        <Button 
                            onClick={() => {
                                if (navigator.share) {
                                    navigator.share({
                                        title: `Tham gia nhóm ${chat?.name}`,
                                        text: `Hãy tham gia nhóm chat "${chat?.name}" của chúng tôi!`,
                                        url: inviteUrl,
                                    }).catch(() => {});
                                } else {
                                    handleCopy();
                                }
                            }}
                            className="h-10 text-[13px] rounded-lg bg-primary hover:bg-primary/90 text-white shadow-md shadow-blue-200"
                        >
                            <Share2 className="w-3.5 h-3.5 mr-2" />
                            Chia sẻ nhóm
                        </Button>
                    </div>
                </div>
            </div>

            {/* Approval List Section */}
            {needsApproval && (
                <div className="space-y-4 pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                        <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            Yêu cầu tham gia
                            <span className="bg-red-500 text-white w-4 h-4 rounded-full text-[10px] flex items-center justify-center">
                                {joinRequests.length}
                            </span>
                        </label>
                    </div>

                    {joinRequests.length === 0 ? (
                        <div className="flex flex-col items-center py-8 bg-muted/50 rounded-lg border border-dashed border-border">
                            <UserPlus className="w-8 h-8 text-muted-foreground mb-2" />
                            <p className="text-[12px] text-muted-foreground italic">Chưa có yêu cầu nào đang chờ</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {joinRequests.map((req: any) => (
                                <div key={req.id} className="flex items-center gap-3 p-3 bg-white border border-border rounded-lg hover:shadow-sm transition-shadow">
                                    <Avatar className="h-9 w-9 rounded-md border border-border">
                                        <AvatarImage src={getAvatarUrl(req.account?.avatar || "", req.account?.name)} />
                                        <AvatarFallback className={cn("rounded-md text-[10px] font-bold", avatarColor(req.account?.name || ""))}>
                                            {getInitials(req.account?.name || "")}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-bold text-foreground truncate">
                                            {req.account?.name || "Người dùng"}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground italic">
                                            Yêu cầu từ nhóm {new Date(req.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button 
                                            onClick={() => handleApproveJoin(req.accountId, false)}
                                            className="p-1.5 rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-all border border-transparent hover:border-red-100"
                                            title="Từ chối"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleApproveJoin(req.accountId, true)}
                                            className="p-1.5 rounded-md text-blue-600 bg-blue-50 hover:bg-primary hover:text-white transition-all border border-blue-100"
                                            title="Đồng ý"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {!needsApproval && !isPrivate && (
                <div className="p-4 bg-amber-50/30 border border-amber-100 rounded-lg text-amber-800">
                    <p className="text-[11px] leading-relaxed">
                        <span className="font-bold">Lưu ý:</span> Bất kỳ ai có liên kết này đều có thể vào nhóm ngay lập tức. Hãy cẩn thận khi chia sẻ liên kết này ở nơi công cộng.
                    </p>
                </div>
            )}
        </div>
    );
}
