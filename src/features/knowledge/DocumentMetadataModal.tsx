'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useListDepartmentsQuery } from '@/src/redux/feature/departmentApi';
import { useUpdateDocumentMetadataMutation, Document } from '@/src/redux/feature/knowledgeApi';
import {
    Lock,
    Building2,
    UserCheck,
    Loader2,
    Save,
    X,
    ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';

interface DocumentMetadataModalProps {
    isOpen: boolean;
    onClose: () => void;
    document?: Document | null; // If present, edit mode. Otherwise, upload context.
    onConfirm?: (metadata: {
        securityClassification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
        departmentId: string;
        allowedRoles: string;
    }) => void; // Used for upload context config
}

export function DocumentMetadataModal({
    isOpen,
    onClose,
    document: editingDoc,
    onConfirm
}: DocumentMetadataModalProps) {
    const isEditMode = !!editingDoc;
    const { data: departments = [], isLoading: isDeptsLoading } = useListDepartmentsQuery();
    const [updateMetadata, { isLoading: isUpdating }] = useUpdateDocumentMetadataMutation();

    const [securityClassification, setSecurityClassification] = useState<'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED'>('INTERNAL');
    const [departmentId, setDepartmentId] = useState<string>('none');
    const [allowedRoles, setAllowedRoles] = useState<string>('ALL');

    // Initialize state from document if in edit mode
    useEffect(() => {
        if (editingDoc) {
            setSecurityClassification(editingDoc.securityClassification || 'INTERNAL');
            setDepartmentId(editingDoc.departmentId || 'none');
            setAllowedRoles(editingDoc.allowedRoles || 'ALL');
        } else {
            // Defaults for new uploads
            setSecurityClassification('INTERNAL');
            setDepartmentId('none');
            setAllowedRoles('ALL');
        }
    }, [editingDoc, isOpen]);

    const handleSave = async () => {
        const payloadDeptId = departmentId === 'none' ? '' : departmentId;
        
        if (isEditMode && editingDoc) {
            try {
                await updateMetadata({
                    id: editingDoc.id,
                    securityClassification,
                    departmentId: payloadDeptId,
                    allowedRoles
                }).unwrap();
                toast.success('Cập nhật phân quyền tài liệu thành công!');
                onClose();
            } catch (err: any) {
                console.error('Failed to update metadata:', err);
                toast.error(err.data?.message || 'Có lỗi xảy ra khi cập nhật phân quyền');
            }
        } else if (onConfirm) {
            onConfirm({
                securityClassification,
                departmentId: payloadDeptId,
                allowedRoles
            });
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-full sm:max-w-[480px] p-0 overflow-hidden bg-slate-900 border-border shadow-[0_0_50px_rgba(0,0,0,0.5)] text-foreground rounded-lg">
                <DialogHeader className="px-6 py-4.5 border-b border-border bg-slate-950 flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-md bg-primary/10 text-primary border border-primary/20">
                            <Lock className="w-4 h-4" />
                        </div>
                        <div>
                            <DialogTitle className="text-sm font-bold text-white">
                                {isEditMode ? 'Thiết lập phân quyền tài liệu' : 'Cấu hình quyền tài liệu trước tải lên'}
                            </DialogTitle>
                            {isEditMode && editingDoc && (
                                <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[320px] truncate font-mono">
                                    File: {editingDoc.fileName}
                                </p>
                            )}
                        </div>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={onClose}
                        className="rounded-md h-7 w-7 border border-border hover:bg-slate-800 text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-3.5 h-3.5" />
                    </Button>
                </DialogHeader>

                <div className="p-6 space-y-5 bg-slate-950/40">
                    {/* 1. Security Classification */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-muted-foreground" /> Mức độ bảo mật (Security Classification)
                        </Label>
                        <Select
                            value={securityClassification}
                            onValueChange={(val: any) => setSecurityClassification(val)}
                        >
                            <SelectTrigger className="w-full h-9 bg-slate-900 border-border text-xs text-white">
                                <SelectValue placeholder="Chọn mức bảo mật" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-border text-white text-xs">
                                <SelectItem value="PUBLIC" className="cursor-pointer text-xs focus:bg-slate-800">
                                    PUBLIC - Công khai toàn hệ thống
                                </SelectItem>
                                <SelectItem value="INTERNAL" className="cursor-pointer text-xs focus:bg-slate-800">
                                    INTERNAL - Nội bộ công ty
                                </SelectItem>
                                <SelectItem value="CONFIDENTIAL" className="cursor-pointer text-xs focus:bg-slate-800">
                                    CONFIDENTIAL - Mức độ bảo mật cao
                                </SelectItem>
                                <SelectItem value="RESTRICTED" className="cursor-pointer text-xs focus:bg-slate-800">
                                    RESTRICTED - Giới hạn nghiêm ngặt
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">
                            Cấu hình mức bảo mật quy định chính sách xem/tìm kiếm chung đối với tài liệu.
                        </p>
                    </div>

                    {/* 2. Department Owner */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" /> Phòng ban sở hữu (Department Owner)
                        </Label>
                        {isDeptsLoading ? (
                            <div className="flex items-center gap-2 h-9 bg-slate-900 border border-border rounded-md px-3">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                                <span className="text-[11px] text-muted-foreground animate-pulse">Đang tải danh sách phòng ban...</span>
                            </div>
                        ) : (
                            <Select
                                value={departmentId}
                                onValueChange={(val) => setDepartmentId(val)}
                            >
                                <SelectTrigger className="w-full h-9 bg-slate-900 border-border text-xs text-white">
                                    <SelectValue placeholder="Chọn phòng ban sở hữu" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-border text-white text-xs max-h-[200px]">
                                    <SelectItem value="none" className="cursor-pointer text-xs focus:bg-slate-800 font-medium text-emerald-400">
                                        Công ty (Không phân phòng ban - Dùng chung)
                                    </SelectItem>
                                    {departments.map((dept) => (
                                        <SelectItem key={dept.id} value={dept.id} className="cursor-pointer text-xs focus:bg-slate-800">
                                            {dept.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                            Nếu chọn phòng ban cụ thể, tài liệu chỉ hiển thị đối với nhân viên thuộc phòng ban này.
                        </p>
                    </div>

                    {/* 3. Allowed Roles within Department */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-white flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-muted-foreground" /> Chức vụ được phép truy cập (Allowed Roles)
                        </Label>
                        <Select
                            value={allowedRoles}
                            onValueChange={(val) => setAllowedRoles(val)}
                            disabled={departmentId === 'none'}
                        >
                            <SelectTrigger className="w-full h-9 bg-slate-900 border-border text-xs text-white disabled:opacity-50">
                                <SelectValue placeholder="Chọn chức vụ" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-border text-white text-xs">
                                <SelectItem value="ALL" className="cursor-pointer text-xs focus:bg-slate-800">
                                    ALL - Trưởng phòng và Nhân viên đều xem được
                                </SelectItem>
                                <SelectItem value="HEAD" className="cursor-pointer text-xs focus:bg-slate-800">
                                    HEAD - Chỉ Trưởng phòng / Quản lý của phòng ban
                                </SelectItem>
                                <SelectItem value="MEMBER" className="cursor-pointer text-xs focus:bg-slate-800">
                                    MEMBER - Chỉ Nhân viên thường của phòng ban
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        {departmentId === 'none' && (
                            <p className="text-[10px] text-amber-500 font-medium">
                                * Quyền chức vụ chỉ áp dụng khi tài liệu thuộc về một phòng ban cụ thể.
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter className="px-6 py-3 border-t border-border bg-slate-950 flex items-center justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="rounded-md border-border bg-slate-900 text-muted-foreground hover:bg-slate-800 hover:text-white h-8 text-xs px-4"
                        disabled={isUpdating}
                    >
                        Hủy bỏ
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm gap-1.5 h-8 px-5 text-xs"
                        disabled={isUpdating}
                    >
                        {isUpdating ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isEditMode ? (
                            <Save className="w-3.5 h-3.5" />
                        ) : (
                            <ShieldCheck className="w-3.5 h-3.5" />
                        )}
                        {isUpdating ? 'Đang cập nhật...' : isEditMode ? 'Lưu cấu hình' : 'Xác nhận thiết lập'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
