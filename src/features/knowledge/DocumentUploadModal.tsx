'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    useUploadDocumentMutation,
} from '@/src/redux/feature/knowledgeApi';
import { useGetUserWorkspacesQuery } from '@/src/redux/feature/workspaceApi';
import { useListDepartmentsQuery, useGetUserDepartmentsQuery } from '@/src/redux/feature/departmentApi';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/redux/store';
import {
    Upload,
    FileText,
    FileSpreadsheet,
    FileType,
    Image,
    Music,
    X,
    Loader2,
    Sparkles,
    Cpu,
    Shield,
    Building2,
    FolderOpen,
    ChevronRight,
    CheckCircle2,
    AlertCircle,
    Zap,
    Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const FILE_TYPE_CONFIG: Record<string, { icon: typeof FileText; color: string; label: string }> = {
    pdf:  { icon: FileText, color: 'text-red-500 bg-red-50 border-red-200', label: 'PDF' },
    docx: { icon: FileText, color: 'text-blue-500 bg-blue-50 border-blue-200', label: 'DOCX' },
    doc:  { icon: FileText, color: 'text-blue-500 bg-blue-50 border-blue-200', label: 'DOC' },
    txt:  { icon: FileType, color: 'text-gray-500 bg-gray-50 border-gray-200', label: 'TXT' },
    md:   { icon: FileType, color: 'text-purple-500 bg-purple-50 border-purple-200', label: 'Markdown' },
    xlsx: { icon: FileSpreadsheet, color: 'text-green-500 bg-green-50 border-green-200', label: 'Excel' },
    xls:  { icon: FileSpreadsheet, color: 'text-green-500 bg-green-50 border-green-200', label: 'Excel' },
    pptx: { icon: FileText, color: 'text-orange-500 bg-orange-50 border-orange-200', label: 'PowerPoint' },
    html: { icon: FileType, color: 'text-cyan-500 bg-cyan-50 border-cyan-200', label: 'HTML' },
    png:  { icon: Image, color: 'text-pink-500 bg-pink-50 border-pink-200', label: 'PNG' },
    jpg:  { icon: Image, color: 'text-pink-500 bg-pink-50 border-pink-200', label: 'JPG' },
    mp3:  { icon: Music, color: 'text-violet-500 bg-violet-50 border-violet-200', label: 'MP3' },
    wav:  { icon: Music, color: 'text-violet-500 bg-violet-50 border-violet-200', label: 'WAV' },
};

const ACCEPTED_EXTENSIONS = '.pdf,.docx,.doc,.txt,.md,.xlsx,.xls,.pptx,.html,.png,.jpg,.jpeg,.tiff,.gif,.mp3,.wav,.m4a,.tex,.latex';
const MAX_FILE_SIZE = 50 * 1024 * 1024;

interface DocumentUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (result: { documentId: number; fileName: string; markdownContent?: string }) => void;
    defaultWorkspaceId?: string;
}

export function DocumentUploadModal({ isOpen, onClose, onSuccess, defaultWorkspaceId }: DocumentUploadModalProps) {
    const [step, setStep] = useState<'upload' | 'config'>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [parserMethod, setParserMethod] = useState<'gemini' | 'tika'>('gemini');
    const [previewMode, setPreviewMode] = useState(true);
    const [securityClassification, setSecurityClassification] = useState<string>('INTERNAL');
    const [departmentId, setDepartmentId] = useState<string>('');
    const [allowedRoles, setAllowedRoles] = useState<string>('ALL');
    const [workspaceId, setWorkspaceId] = useState<string>(defaultWorkspaceId || '');
    const [folderPath, setFolderPath] = useState<string>('');
    const [tags, setTags] = useState<string>('');

    const [uploadDocument, { isLoading }] = useUploadDocumentMutation();

    const currentWorkspaceId = useSelector((state: RootState) => state.workspace.currentWorkspaceId);
    const { data: workspacesData } = useGetUserWorkspacesQuery(undefined, { skip: !isOpen });
    const { data: departmentsData } = useGetUserDepartmentsQuery(undefined, { skip: !isOpen });

    const workspaces = Array.isArray(workspacesData) ? workspacesData : [];
    const departments = Array.isArray(departmentsData) ? departmentsData : [];

    const getFileExt = (name: string) => name.split('.').pop()?.toLowerCase() || '';
    const getFileConfig = (name: string) => FILE_TYPE_CONFIG[getFileExt(name)] || FILE_TYPE_CONFIG.txt;

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const validateFile = (f: File): string | null => {
        if (f.size > MAX_FILE_SIZE) return `Kích thước tệp vượt quá giới hạn ${formatSize(MAX_FILE_SIZE)}`;
        const ext = getFileExt(f.name);
        if (!ACCEPTED_EXTENSIONS.includes(`.${ext}`)) return `Định dạng .${ext} không được hỗ trợ`;
        return null;
    };

    const handleFileSelect = useCallback((f: File) => {
        const error = validateFile(f);
        if (error) {
            toast.error(error);
            return;
        }
        setFile(f);
        setStep('config');
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) handleFileSelect(droppedFile);
    }, [handleFileSelect]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) handleFileSelect(f);
    };

    const handleUpload = async () => {
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        const resolvedWsId = workspaceId || currentWorkspaceId || 'default-workspace';

        try {
            const result = await uploadDocument({
                formData,
                preview: previewMode,
                parser: parserMethod,
                workspaceId: resolvedWsId,
                departmentId: departmentId || undefined,
                allowedRoles: allowedRoles || 'ALL',
                securityClassification: securityClassification || 'INTERNAL',
                folderPath: folderPath || undefined,
            }).unwrap();

            toast.success(`Tải lên thành công: ${result.fileName}`);
            onSuccess?.({
                documentId: result.documentId,
                fileName: result.fileName,
                markdownContent: result.markdownContent,
            });
            handleReset();
            onClose();
        } catch (err: unknown) {
            const error = err as { data?: { message?: string } };
            toast.error(error?.data?.message || 'Lỗi khi tải lên tài liệu');
        }
    };

    const handleReset = () => {
        setFile(null);
        setStep('upload');
        setParserMethod('gemini');
        setPreviewMode(true);
        setSecurityClassification('INTERNAL');
        setDepartmentId('');
        setAllowedRoles('ALL');
        setFolderPath('');
        setTags('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { handleReset(); onClose(); } }}>
            <DialogContent className="sm:max-w-[580px] p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30">
                    <DialogTitle className="text-sm font-bold flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                            <Upload className="w-4 h-4" />
                        </div>
                        Tải lên tài liệu
                        {step === 'config' && (
                            <Badge variant="outline" className="text-[9px] ml-2 bg-blue-50 text-blue-600 border-blue-200">
                                Bước 2/2 — Cấu hình
                            </Badge>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="px-6 py-5">
                    {step === 'upload' ? (
                        <div className="space-y-4">
                            {/* Drag & Drop Zone */}
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    "relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200",
                                    isDragging
                                        ? "border-primary bg-primary/5 scale-[1.02]"
                                        : "border-border hover:border-primary/50 hover:bg-muted/30"
                                )}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept={ACCEPTED_EXTENSIONS}
                                    onChange={handleInputChange}
                                    className="hidden"
                                />
                                <div className="flex flex-col items-center gap-3">
                                    <div className={cn(
                                        "w-14 h-14 rounded-xl flex items-center justify-center transition-colors",
                                        isDragging ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                    )}>
                                        <Upload className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">
                                            Kéo thả tệp vào đây hoặc <span className="text-primary">nhấp để chọn</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Tối đa {formatSize(MAX_FILE_SIZE)} — PDF, DOCX, TXT, MD, Excel, PowerPoint, HTML, Ảnh, Audio
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Supported File Types Grid */}
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Định dạng được hỗ trợ
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {Object.entries(FILE_TYPE_CONFIG).slice(0, 10).map(([ext, config]) => {
                                        const Icon = config.icon;
                                        return (
                                            <span key={ext} className={cn("inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md border", config.color)}>
                                                <Icon className="w-3 h-3" />
                                                .{ext}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* Selected File Preview */}
                            {file && (() => {
                                const config = getFileConfig(file.name);
                                const FileIcon = config.icon;
                                return (
                                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
                                        <div className={cn("p-2 rounded-md border", config.color)}>
                                            <FileIcon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
                                            <p className="text-xs text-muted-foreground">{formatSize(file.size)} — {config.label}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { setFile(null); setStep('upload'); }}>
                                            <X className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                );
                            })()}

                            {/* Pipeline Configuration */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
                                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Cấu hình pipeline
                                    </h3>
                                </div>

                                {/* Parser + Preview Row */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold flex items-center gap-1.5">
                                            <Zap className="w-3 h-3 text-amber-500" />
                                            Parser Engine
                                        </Label>
                                        <Select value={parserMethod} onValueChange={(v) => setParserMethod(v as 'gemini' | 'tika')}>
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="gemini">
                                                    <span className="flex items-center gap-1.5">
                                                        <Sparkles className="w-3 h-3 text-blue-500" /> Gemini AI
                                                    </span>
                                                </SelectItem>
                                                <SelectItem value="tika">
                                                    <span className="flex items-center gap-1.5">
                                                        <Cpu className="w-3 h-3 text-gray-500" /> Apache Tika
                                                    </span>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold">Chế độ xem trước</Label>
                                        <div className="flex items-center gap-2 h-8">
                                            <Switch checked={previewMode} onCheckedChange={setPreviewMode} />
                                            <span className="text-xs text-muted-foreground">
                                                {previewMode ? 'Bật — duyệt MD trước' : 'Tắt — tự động xử lý'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Security + Access */}
                                <div className="flex items-center gap-2">
                                    <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Bảo mật & phạm vi
                                    </h3>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold">Phân loại bảo mật</Label>
                                        <Select value={securityClassification} onValueChange={setSecurityClassification}>
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PUBLIC">Công khai</SelectItem>
                                                <SelectItem value="INTERNAL">Nội bộ</SelectItem>
                                                <SelectItem value="CONFIDENTIAL">Bí mật</SelectItem>
                                                <SelectItem value="RESTRICTED">Hạn chế</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold">Quyền truy cập</Label>
                                        <Select value={allowedRoles} onValueChange={setAllowedRoles}>
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ALL">Tất cả</SelectItem>
                                                <SelectItem value="HEAD">Chỉ Trưởng phòng</SelectItem>
                                                <SelectItem value="MEMBER">Thành viên</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold flex items-center gap-1.5">
                                            <Building2 className="w-3 h-3" /> Phòng ban
                                        </Label>
                                        <Select value={departmentId} onValueChange={setDepartmentId}>
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="Chọn phòng ban" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ALL">Tất cả phòng ban</SelectItem>
                                                {departments.map((dept: { id: string; name: string }) => (
                                                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold flex items-center gap-1.5">
                                            <FolderOpen className="w-3 h-3" /> Thư mục
                                        </Label>
                                        <Input
                                            value={folderPath}
                                            onChange={(e) => setFolderPath(e.target.value)}
                                            placeholder="/path/to/folder"
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Pipeline Preview */}
                            <div className="bg-muted/30 rounded-lg p-3 border border-border">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                    Pipeline xử lý
                                </p>
                                <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                                    <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-600 border-blue-200 px-1.5 py-0">Upload</Badge>
                                    <ChevronRight className="w-3 h-3" />
                                    <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-600 border-amber-200 px-1.5 py-0">
                                        {parserMethod === 'gemini' ? 'Gemini AI' : 'Tika'} Parse
                                    </Badge>
                                    <ChevronRight className="w-3 h-3" />
                                    {previewMode && (
                                        <>
                                            <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-600 border-purple-200 px-1.5 py-0">Xem trước MD</Badge>
                                            <ChevronRight className="w-3 h-3" />
                                        </>
                                    )}
                                    <Badge variant="outline" className="text-[9px] bg-green-50 text-green-600 border-green-200 px-1.5 py-0">Chunking</Badge>
                                    <ChevronRight className="w-3 h-3" />
                                    <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-600 border-emerald-200 px-1.5 py-0">Vector + Wiki</Badge>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="px-6 py-3 border-t border-border bg-muted/20">
                    <div className="flex items-center justify-between w-full">
                        <div>
                            {step === 'config' && (
                                <Button variant="ghost" size="sm" onClick={() => setStep('upload')} className="text-xs">
                                    ← Chọn tệp khác
                                </Button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => { handleReset(); onClose(); }} disabled={isLoading} className="text-xs">
                                Hủy
                            </Button>
                            {step === 'config' && (
                                <Button size="sm" onClick={handleUpload} disabled={!file || isLoading} className="text-xs gap-1.5">
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            Đang tải lên...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-3.5 h-3.5" />
                                            Tải lên & Xử lý
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
