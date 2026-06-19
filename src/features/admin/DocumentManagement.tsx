'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/redux/store';
import {
    useGetDocumentsQuery,
    useDeleteDocumentMutation,
    useApproveDocumentMutation,
    useUploadDocumentMutation,
    Document,
} from '@/src/redux/feature/knowledgeApi';
import {
    useGetAdminDocumentsQuery,
    useDeleteAdminDocumentMutation,
    useUploadAdminDocumentMutation,
} from '@/src/redux/feature/adminApi';
import { useCompileDocumentMutation } from '@/src/redux/feature/mrpApi';
import { useGetUserWorkspacesQuery } from '@/src/redux/feature/workspaceApi';
import { MarkdownEditorModal } from '@/src/features/knowledge/MarkdownEditorModal';
import { DocumentMetadataModal } from '@/src/features/knowledge/DocumentMetadataModal';
import { ChunkInspectorModal } from './ChunkInspectorModal';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    FileText,
    MoreHorizontal,
    Trash2,
    CheckCircle,
    Clock,
    AlertCircle,
    Loader2,
    Search,
    Filter,
    Download,
    FileUp,
    RefreshCw,
    Eye,
    Sparkles,
    Cpu,
    Database,
    Building2,
    Globe,
    X,
    Lock,
    Folder,
    FolderOpen,
    ChevronRight,
    ChevronDown,
} from 'lucide-react';
import { parseDocumentsToTree, TreeNode } from './FolderTreeParser';
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn, formatFileSize } from '@/lib/utils';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { WikiPagination } from '@/app/wiki/components/WikiPagination';
import { useListDepartmentsQuery, useGetUserDepartmentsQuery } from '@/src/redux/feature/departmentApi';

const statusConfig = {
    PENDING: { icon: Clock, color: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-250/30 dark:border-amber-900/30', label: 'Pending' },
    PREVIEW: { icon: Eye, color: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-250/30 dark:border-emerald-900/30', label: 'Chờ duyệt' },
    PROCESSING: { icon: Loader2, color: 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-250/30 dark:border-blue-900/30', label: 'Processing' },
    COMPLETED: { icon: CheckCircle, color: 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-250/30 dark:border-green-900/30', label: 'Completed' },
    FAILED: { icon: AlertCircle, color: 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-250/30 dark:border-rose-900/30', label: 'Failed' },
};

export function DocumentManagement() {
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [filterWorkspaceId, setFilterWorkspaceId] = useState<string>('default-workspace');
    const [filterPendingOnly, setFilterPendingOnly] = useState(false);
    const currentWorkspaceId = useSelector((state: RootState) => state.workspace.currentWorkspaceId);

    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    const { data: workspaces = [] } = useGetUserWorkspacesQuery();
    const { data: departments = [] } = useListDepartmentsQuery();

    const user = useSelector((state: RootState) => state.auth.user);
    const globalRoles = useSelector((state: RootState) => state.auth.roles) || [];
    const userId = user?.id || '';
    const { data: userDepts = [] } = useGetUserDepartmentsQuery(userId, { skip: !userId });

    const isGlobalAdmin = globalRoles.some(r => r.includes('ADMIN') || r.includes('SUPER_ADMIN'));
    const isLeader = isGlobalAdmin || userDepts.some(d => d.userRole === 'HEAD' || d.userRole === 'MANAGER');

    // Group workspaces client-side for visual categorization (Hierarchical Model)
    const groupedWorkspaces = useMemo(() => {
        const depts: any[] = [];
        const projs: any[] = [];
        workspaces.forEach((ws: any) => {
            if (ws.departmentId) {
                depts.push(ws);
            } else {
                projs.push(ws);
            }
        });
        return { departments: depts, projects: projs };
    }, [workspaces]);

    // Expand workspaces and departments by default when loaded
    useEffect(() => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            next.add("workspace:workspace-default"); // always expand global shared folder
            workspaces.forEach((ws: any) => next.add(`workspace:${ws.id}`));
            departments.forEach((dept: any) => next.add(`dept:${dept.id}`));
            return next;
        });
    }, [workspaces, departments]);

    // Handle filter default depending on role clearance
    useEffect(() => {
        if (isLeader) {
            setFilterWorkspaceId('all');
        } else {
            setFilterWorkspaceId('default-workspace');
        }
    }, [isLeader]);

    // Debounce search term to protect performance and reset page to 0 immediately
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setPage(0);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // workspaceIdForQuery is used for scoped (non-admin) queries only
    const workspaceIdForQuery = useMemo(() => {
        return filterWorkspaceId;
    }, [filterWorkspaceId]);

    // Global admins always use the admin query so they see ALL documents system-wide.
    // This mirrors the wiki fix — no longer tied to filterWorkspaceId === 'all'.
    const isAdminQuery = isGlobalAdmin;

    const { data: userData, isLoading: isUserLoading, refetch: refetchUser } = useGetDocumentsQuery(
        { workspaceId: workspaceIdForQuery },
        { skip: isAdminQuery }
    );

    const { data: adminData, isLoading: isAdminLoading, refetch: refetchAdmin } = useGetAdminDocumentsQuery(
        undefined,
        { skip: !isAdminQuery }
    );

    const data = isAdminQuery ? adminData : userData;
    const isLoading = isAdminQuery ? isAdminLoading : isUserLoading;
    const refetch = isAdminQuery ? refetchAdmin : refetchUser;

    const [deleteUserDocument, { isLoading: isDeletingUser }] = useDeleteDocumentMutation();
    const [deleteAdminDocument, { isLoading: isDeletingAdmin }] = useDeleteAdminDocumentMutation();
    const isDeleting = isDeletingUser || isDeletingAdmin;
    const [approveDocument, { isLoading: isApproving }] = useApproveDocumentMutation();
    const [uploadDocument, { isLoading: isUploadingUser }] = useUploadDocumentMutation();
    const [uploadAdminDocument, { isLoading: isUploadingAdmin }] = useUploadAdminDocumentMutation();
    const isUploading = isGlobalAdmin ? isUploadingAdmin : isUploadingUser;
    const [compileDocument, { isLoading: isCompiling }] = useCompileDocumentMutation();
    const [previewMode, setPreviewMode] = useState(true);
    const [parserMethod, setParserMethod] = useState<'gemini' | 'tika'>('gemini');
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingDoc, setEditingDoc] = useState<Document | null>(null);
    const [chunkInspectorOpen, setChunkInspectorOpen] = useState(false);
    const [inspectingDoc, setInspectingDoc] = useState<Document | null>(null);
    const [metadataOpen, setMetadataOpen] = useState(false);
    const [metadataDoc, setMetadataDoc] = useState<Document | null>(null);
    const [uploadPendingFile, setUploadPendingFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleStartMRP = async (doc: Document) => {
        try {
            const targetWorkspaceId = doc.departmentId && !doc.workspaceId
                ? null
                : (doc.workspaceId || (workspaceIdForQuery && workspaceIdForQuery !== 'all' ? workspaceIdForQuery : null) || currentWorkspaceId || 'default-workspace');
            await compileDocument({ documentId: doc.id, workspaceId: targetWorkspaceId, autoApprove: false }).unwrap();
            toast.success('Kích hoạt quy trình biên soạn MRP thành công! Kế hoạch mới đang chờ duyệt.');
        } catch (error: any) {
            console.error('MRP compilation error:', error);
            toast.error(error.data?.message || 'Lỗi khi khởi chạy quy trình MRP compilation');
        }
    };

    // Parse response — admin endpoint always returns Document[] (already normalized)
    // User endpoint may return Document[] or PagedResponse<Document>
    const allDocs = useMemo(() => {
        if (!data) return [];
        if (isAdminQuery) {
            // After transformResponse, admin endpoint always returns Document[]
            return Array.isArray(data) ? data : [];
        }
        // User endpoint: check for paged response
        if (Array.isArray(data)) return data as Document[];
        if (typeof data === 'object' && data !== null && 'content' in data) {
            return (data as any).content as Document[];
        }
        return [];
    }, [data, isAdminQuery]);

    // Build the hierarchical tree structure
    const treeData = useMemo(() => {
        let docs = allDocs;
        if (filterPendingOnly) {
            docs = docs.filter((doc: Document) => doc.status === 'PENDING');
        }
        if (debouncedSearchTerm.trim()) {
            const q = debouncedSearchTerm.toLowerCase();
            docs = docs.filter((doc: Document) =>
                doc.fileName.toLowerCase().includes(q) ||
                doc.userId.toLowerCase().includes(q)
            );
        }
        
        // Workspace filter matches by workspaceId, legacy tag, or department-wide documents belonging to the workspace's department
        if (filterWorkspaceId !== 'all') {
            const isFilterDefault = filterWorkspaceId === 'default-workspace' || filterWorkspaceId === 'workspace-default';
            docs = docs.filter((doc: Document) => {
                if (doc.workspaceId === filterWorkspaceId) return true;
                
                const isDocWorkspaceEmpty = !doc.workspaceId || 
                                           doc.workspaceId === '' || 
                                           doc.workspaceId === 'default-workspace' || 
                                           doc.workspaceId === 'workspace-default';

                if (isFilterDefault && isDocWorkspaceEmpty) {
                    return true;
                }

                if (doc.tags?.some(t => t === `ws:${filterWorkspaceId}` || t.includes(filterWorkspaceId))) return true;

                if (isDocWorkspaceEmpty) {
                    const ws = workspaces.find((w: any) => w.id === filterWorkspaceId);
                    if (ws && ws.departmentId && doc.departmentId === ws.departmentId) {
                        return true;
                    }
                }
                return false;
            });
        }

        return parseDocumentsToTree(docs, workspaces, departments);
    }, [allDocs, workspaces, departments, debouncedSearchTerm, filterWorkspaceId, filterPendingOnly]);

    interface FlatNode {
        node: TreeNode;
        depth: number;
        parentIds: string[];
    }

    // Flatten tree nodes for table rendering based on expanded state
    const flatTreeNodes = useMemo(() => {
        const list: FlatNode[] = [];
        const isSearchActive = !!debouncedSearchTerm.trim();

        const traverse = (nodes: TreeNode[], depth: number = 0, parentIds: string[] = []) => {
            nodes.forEach(node => {
                list.push({ node, depth, parentIds });
                const isExpanded = isSearchActive || expandedNodes.has(node.id);
                if (isExpanded && node.children && node.children.length > 0) {
                    traverse(node.children, depth + 1, [...parentIds, node.id]);
                }
            });
        };
        traverse(treeData);
        return list;
    }, [treeData, expandedNodes, debouncedSearchTerm]);

    // Compute paginated subset and counts
    const totalElements = flatTreeNodes.length;
    const totalPages = Math.ceil(totalElements / size);
    
    const paginatedTreeNodes = useMemo(() => {
        return flatTreeNodes.slice(page * size, (page + 1) * size);
    }, [flatTreeNodes, page, size]);

    // Edge Case 1: Auto-decrement page if the current page becomes empty
    useEffect(() => {
        const maxPage = Math.max(0, totalPages - 1);
        if (page > maxPage && !isLoading) {
            setPage(maxPage);
        }
    }, [totalPages, page, isLoading]);

    const toggleNode = (nodeId: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    };

    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
        setPage(0);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Bạn có chắc muốn xóa tài liệu này không?')) return;
        try {
            // Global admins always use the admin delete endpoint
            if (isGlobalAdmin) {
                await deleteAdminDocument(id).unwrap();
            } else {
                await deleteUserDocument(id.toString()).unwrap();
            }
            toast.success('Đã xóa tài liệu thành công');
        } catch (error: any) {
            toast.error(error.data?.message || 'Lỗi khi xóa tài liệu');
        }
    };

    const handleApprove = async (id: number) => {
        try {
            await approveDocument(id.toString()).unwrap();
            toast.success('Document approved successfully');
        } catch (error) {
            toast.error('Failed to approve document');
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadPendingFile(file);
        setMetadataDoc(null);
        setMetadataOpen(true);
    };

    const handleMetadataConfirm = async (meta: {
        securityClassification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
        departmentId: string;
        allowedRoles: string;
        uploadScope: 'DEPARTMENT' | 'WORKSPACE' | 'GLOBAL';
        workspaceId?: string;
        folderPath?: string;
    }) => {
        if (!uploadPendingFile) return;

        const formData = new FormData();
        formData.append('file', uploadPendingFile);

        const targetUploadWorkspaceId = meta.uploadScope === 'GLOBAL'
            ? 'default-workspace'
            : (meta.uploadScope === 'DEPARTMENT'
                ? ''
                : (meta.workspaceId && meta.workspaceId !== 'none' ? meta.workspaceId : 'default-workspace'));
        try {
            // Global admins use the dedicated admin upload endpoint to bypass workspace validation
            const uploadFn = isGlobalAdmin ? uploadAdminDocument : uploadDocument;
            const result = await uploadFn({
                formData,
                preview: previewMode,
                parser: parserMethod,
                workspaceId: targetUploadWorkspaceId,
                departmentId: meta.departmentId,
                allowedRoles: meta.allowedRoles,
                securityClassification: meta.securityClassification,
                folderPath: meta.folderPath
            }).unwrap();
            toast.success(`Tải lên thành công: ${result.fileName}`);
            
            if (previewMode && result.markdownContent) {
                setEditingDoc({
                    id: result.documentId,
                    fileName: result.fileName,
                    status: result.status as any,
                    markdownContent: result.markdownContent,
                } as any);
                setEditorOpen(true);
            }
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(error.data?.message || 'Lỗi khi tải lên tài liệu');
        } finally {
            setUploadPendingFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
                <p className="text-xs text-muted-foreground animate-pulse font-medium">Đang tải danh sách tài liệu...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".pdf,.docx,.txt"
            />
            <div className="flex flex-wrap gap-2 items-center justify-between bg-muted/50 dark:bg-slate-900/10 p-2.5 rounded-lg border border-border">
                <div className="flex-1 min-w-[260px] flex items-center gap-2">
                    {isAdminQuery && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md whitespace-nowrap shrink-0">
                            <Globe className="w-2.5 h-2.5" /> ADMIN · GLOBAL ({allDocs.length})
                        </span>
                    )}
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                            placeholder={isAdminQuery ? "Tìm kiếm trong toàn hệ thống..." : "Tìm kiếm tài liệu..."}
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="pl-8 h-8 text-xs rounded-md border-border shadow-sm focus-visible:ring-1 bg-background"
                        />
                    </div>
                </div>

                {/* Workspace filter row — client-side filter applied on top of loaded docs */}
                {/* <div className="flex items-center gap-2 flex-wrap w-full">
                    <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    
                    <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto no-scrollbar max-w-[85%]">
                        {isLeader && (
                            <button
                                type="button"
                                onClick={() => setFilterWorkspaceId('all')}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all whitespace-nowrap cursor-pointer ${
                                    filterWorkspaceId === 'all'
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border bg-background text-muted-foreground hover:bg-accent'
                                }`}
                            >
                                <Globe className="w-3 h-3" /> Tất cả không gian
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setFilterWorkspaceId('default-workspace')}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all whitespace-nowrap cursor-pointer ${
                                filterWorkspaceId === 'default-workspace'
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border bg-background text-muted-foreground hover:bg-accent'
                            }`}
                        >
                            <Database className="w-3 h-3 text-emerald-500" /> Không gian mặc định
                        </button>

                        <button
                            type="button"
                            onClick={() => setFilterPendingOnly(!filterPendingOnly)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all whitespace-nowrap cursor-pointer ${
                                filterPendingOnly
                                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                                    : 'border-border bg-background text-muted-foreground hover:bg-accent'
                            }`}
                        >
                            <Clock className="w-3.5 h-3.5 text-amber-500" /> Chờ duyệt ({allDocs.filter((d: any) => d.status === 'PENDING').length})
                        </button>

                    
                        {groupedWorkspaces.departments.map((ws: any) => (
                            <button
                                key={ws.id}
                                type="button"
                                onClick={() => setFilterWorkspaceId(filterWorkspaceId === ws.id ? 'all' : ws.id)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold border transition-all whitespace-nowrap cursor-pointer ${
                                    filterWorkspaceId === ws.id
                                        ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                                        : 'border-border bg-background text-muted-foreground hover:bg-accent'
                                }`}
                            >
                                <Building2 className="w-3 h-3 text-blue-500 shrink-0" /> {ws.name}
                            </button>
                        ))}

                        {groupedWorkspaces.projects.map((ws: any) => (
                            <button
                                key={ws.id}
                                type="button"
                                onClick={() => setFilterWorkspaceId(filterWorkspaceId === ws.id ? 'all' : ws.id)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold border transition-all whitespace-nowrap cursor-pointer ${
                                    filterWorkspaceId === ws.id
                                        ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                                        : 'border-border bg-background text-muted-foreground hover:bg-accent'
                                }`}
                            >
                                <Cpu className="w-3 h-3 text-emerald-500 shrink-0" /> {ws.name}
                            </button>
                        ))}
                    </div>

         
                    {filterWorkspaceId !== 'all' && (
                        <button
                            type="button"
                            onClick={() => setFilterWorkspaceId('all')}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 cursor-pointer hover:bg-rose-100 transition-colors ml-auto"
                        >
                            <X className="w-3 h-3" /> Xóa bộ lọc
                        </button>
                    )}
                </div> */}
                <div className="flex flex-wrap gap-2 items-center">
                    {/* Segmented Control for Parser Selection */}
                    <div className="flex bg-muted/60 dark:bg-slate-800/40 p-0.5 rounded-md border border-border">
                        <button
                            type="button"
                            onClick={() => setParserMethod('gemini')}
                            className={cn(
                                "flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer",
                                parserMethod === 'gemini' 
                                    ? "bg-background text-primary shadow-sm border border-border" 
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Sparkles className="w-3 h-3 text-emerald-500" />
                            <span>Gemini AI</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setParserMethod('tika')}
                            className={cn(
                                "flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer",
                                parserMethod === 'tika' 
                                    ? "bg-background text-primary shadow-sm border border-border" 
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Cpu className="w-3 h-3 text-sky-500" />
                            <span>Tika Local</span>
                        </button>
                    </div>

                    <label className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground bg-background border border-border px-2.5 py-1 h-8 rounded-md cursor-pointer hover:bg-muted dark:hover:bg-slate-800/55 transition-all shadow-sm">
                        <input
                            type="checkbox"
                            checked={previewMode}
                            onChange={(e) => setPreviewMode(e.target.checked)}
                            className="rounded border-border text-primary focus:ring-primary w-3 h-3 cursor-pointer"
                        />
                        <span>Xem trước & Duyệt</span>
                    </label>
                    <Button variant="outline" className="rounded-md h-8 text-xs border-border px-3" onClick={() => refetch()}>
                        <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isLoading && "animate-spin")} />
                        Làm mới
                    </Button>
                    <Button 
                        className="rounded-md h-8 text-xs px-3 bg-primary text-primary-foreground hover:bg-primary/90" 
                        onClick={handleUploadClick}
                        disabled={isUploading}
                    >
                        {isUploading ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                            <FileUp className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        {isUploading ? 'Đang tải...' : 'Tải tài liệu'}
                    </Button>
                </div>
            </div>

            <Card className="border border-border shadow-sm rounded-lg overflow-hidden bg-card">
                <CardContent className="p-0">
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent">
                        <Table>
                        <TableHeader className="bg-muted/60 dark:bg-slate-900/40 border-b border-border">
                            <TableRow className="hover:bg-transparent border-border">
                                <TableHead className="font-bold text-xs text-foreground pl-4 py-2">Tài liệu</TableHead>
                                <TableHead className="font-bold text-xs text-foreground py-2">Kích thước</TableHead>
                                <TableHead className="font-bold text-xs text-foreground py-2">Phân loại</TableHead>
                                <TableHead className="font-bold text-xs text-foreground py-2">Không gian (Workspace)</TableHead>
                                <TableHead className="font-bold text-xs text-foreground py-2">Trạng thái</TableHead>
                                <TableHead className="font-bold text-xs text-foreground py-2">Ngày tải</TableHead>
                                <TableHead className="w-[80px] pr-4 py-2"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {flatTreeNodes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                                        <FileText className="w-10 h-10 mx-auto mb-3 opacity-15" />
                                        <p className="text-xs font-semibold">Không tìm thấy tài liệu nào</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedTreeNodes.map(({ node, depth }) => {
                                    if (node.type === 'file') {
                                        const doc = node.document!;
                                        const status = statusConfig[doc.status as keyof typeof statusConfig] || statusConfig.PREVIEW;
                                        const StatusIcon = status.icon;

                                        return (
                                            <TableRow key={node.id} className="hover:bg-muted/30 dark:hover:bg-slate-800/10 transition-colors border-border group">
                                                <TableCell className="pl-4 py-1.5">
                                                    <div 
                                                        className="flex items-center gap-2.5"
                                                        style={{ paddingLeft: `${depth * 16}px` }}
                                                    >
                                                        <div className="p-1.5 rounded-md bg-muted dark:bg-slate-800 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
                                                            <FileText className="w-4 h-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold text-foreground leading-snug truncate" title={doc.fileName}>{doc.fileName}</p>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider">{doc.documentType}</span>
                                                                <span className="text-muted-foreground dark:text-muted-foreground text-[9px]">•</span>
                                                                <span className={cn(
                                                                    "text-[8px] font-bold px-1 py-0.2 rounded uppercase tracking-wider border flex items-center gap-0.5",
                                                                    doc.parserMethod === 'tika'
                                                                        ? "bg-sky-50 dark:bg-sky-950/20 text-sky-650 dark:text-sky-400 border-sky-100 dark:border-sky-900/30"
                                                                        : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30"
                                                                )}>
                                                                    {doc.parserMethod === 'tika' ? (
                                                                        <>
                                                                            <Cpu className="w-2 h-2 text-sky-500" />
                                                                            Tika Local
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Sparkles className="w-2 h-2 text-emerald-500" />
                                                                            Gemini AI
                                                                        </>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs font-medium text-muted-foreground py-1.5">
                                                    {formatFileSize(doc.fileSize)}
                                                </TableCell>
                                                <TableCell className="py-1.5">
                                                    <div className="flex flex-col gap-0.5">
                                                        <Badge variant="outline" className="rounded-md text-[9px] font-bold uppercase tracking-tight bg-muted dark:bg-slate-800/40 border-border px-1.5 py-0.5 w-fit">
                                                            {doc.securityClassification || 'INTERNAL'}
                                                        </Badge>
                                                        {doc.departmentId && (
                                                            <span className="text-[8px] font-bold text-blue-550 dark:text-blue-400 flex items-center gap-0.5 mt-0.5">
                                                                <Building2 className="w-2.5 h-2.5" />
                                                                {departments.find((d: any) => d.id === doc.departmentId)?.name || 'Phòng ban'} ({doc.allowedRoles || 'ALL'})
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-1.5 text-xs font-semibold text-muted-foreground">
                                                    {doc.workspaceId ? (
                                                        <span className="flex items-center gap-1.5">
                                                            <Database className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                            {workspaces.find((ws: any) => ws.id === doc.workspaceId)?.name || doc.workspaceId}
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1.5 text-slate-550 dark:text-slate-400">
                                                            <Globe className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                                                            Dùng chung
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-1.5">
                                                    <Badge className={cn('rounded-md text-[9px] font-bold px-2 py-0.5 shadow-sm', status.color)}>
                                                        <StatusIcon className={cn("w-2.5 h-2.5 mr-1", doc.status === 'PROCESSING' && "animate-spin")} />
                                                        {status.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-[10px] text-muted-foreground font-medium py-1.5">
                                                    {format(new Date(doc.createdAt), 'dd/MM/yyyy HH:mm')}
                                                </TableCell>
                                                <TableCell className="pr-4 py-1.5">
                                                    <div className="flex items-center gap-1.5 justify-end">
                                                        {doc.status === 'PENDING' && isLeader && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleApprove(doc.id)}
                                                                disabled={isApproving}
                                                                className="rounded-md h-7 text-[10px] font-semibold text-emerald-650 hover:text-emerald-700 border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all shadow-sm cursor-pointer flex items-center gap-1"
                                                            >
                                                                {isApproving ? (
                                                                    <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
                                                                ) : (
                                                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                                                )}
                                                                Duyệt
                                                            </Button>
                                                        )}
                                                        {doc.status === 'PREVIEW' && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setEditingDoc(doc);
                                                                    setEditorOpen(true);
                                                                }}
                                                                className="rounded-md h-7 text-[10px] font-semibold text-primary hover:text-primary border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all shadow-sm"
                                                            >
                                                                <Eye className="w-3.5 h-3.5 mr-1" /> Duyệt & Lưu
                                                            </Button>
                                                        )}
                                                        {doc.status === 'COMPLETED' && (
                                                            <div className="flex gap-1">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setInspectingDoc(doc);
                                                                        setChunkInspectorOpen(true);
                                                                    }}
                                                                    className="rounded-md h-7 text-[10px] font-semibold text-muted-foreground hover:text-foreground border-border bg-background hover:bg-muted dark:hover:bg-slate-800/60 transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                                                                >
                                                                    <Database className="w-3 h-3 text-muted-foreground" /> Phân mảnh
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleStartMRP(doc)}
                                                                    disabled={isCompiling}
                                                                    className="rounded-md h-7 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                                                                >
                                                                    <Cpu className={cn("w-3 h-3", isCompiling && "animate-spin")} /> Biên soạn MRP
                                                                </Button>
                                                            </div>
                                                        )}
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="rounded-md p-1 shadow-lg border-border bg-popover text-popover-foreground">
                                                                {doc.status === 'PREVIEW' && (
                                                                    <DropdownMenuItem 
                                                                        onClick={() => {
                                                                            setEditingDoc(doc);
                                                                            setEditorOpen(true);
                                                                        }} 
                                                                        className="rounded-md text-xs gap-1.5 cursor-pointer text-emerald-600 dark:text-emerald-450 focus:text-emerald-600"
                                                                    >
                                                                        <Eye className="w-3.5 h-3.5" />
                                                                        Biên tập & Duyệt
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {doc.status === 'COMPLETED' && (
                                                                    <>
                                                                        <DropdownMenuItem 
                                                                            onClick={() => {
                                                                                setInspectingDoc(doc);
                                                                                setChunkInspectorOpen(true);
                                                                            }}
                                                                            className="rounded-md text-xs gap-1.5 cursor-pointer text-foreground font-semibold"
                                                                        >
                                                                            <Database className="w-3.5 h-3.5 text-muted-foreground" />
                                                                            Xem phân mảnh (Chunks)
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem 
                                                                            onClick={() => handleStartMRP(doc)}
                                                                            disabled={isCompiling}
                                                                            className="rounded-md text-xs gap-1.5 cursor-pointer text-emerald-600 dark:text-emerald-400 focus:text-emerald-600 dark:focus:text-emerald-450 font-semibold"
                                                                        >
                                                                            <Cpu className="w-3.5 h-3.5" />
                                                                            Khởi chạy biên soạn MRP
                                                                        </DropdownMenuItem>
                                                                    </>
                                                                )}
                                                                {doc.status === 'PENDING' && (
                                                                    <DropdownMenuItem onClick={() => handleApprove(doc.id)} className="rounded-md text-xs gap-1.5 cursor-pointer">
                                                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                                                        Duyệt tài liệu
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuItem 
                                                                    onClick={() => {
                                                                        setMetadataDoc(doc);
                                                                        setMetadataOpen(true);
                                                                    }}
                                                                    className="rounded-md text-xs gap-1.5 cursor-pointer text-blue-650 dark:text-blue-400 focus:text-blue-600 dark:focus:text-blue-450 font-semibold"
                                                                >
                                                                    <Lock className="w-3.5 h-3.5" />
                                                                    Phân quyền tài liệu
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem className="rounded-md text-xs gap-1.5 cursor-pointer">
                                                                    <Download className="w-3.5 h-3.5" />
                                                                    Tải về
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => handleDelete(doc.id)}
                                                                    className="text-rose-600 dark:text-rose-455 rounded-md text-xs gap-1.5 cursor-pointer focus:bg-rose-50 dark:focus:bg-rose-950/20 focus:text-rose-600"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                    Xóa
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    } else {
                                        // Folder / Workspace / Department row
                                        const isExpanded = expandedNodes.has(node.id);
                                        const hasChildren = node.children && node.children.length > 0;
                                        
                                        const renderFolderIcon = () => {
                                            switch (node.type) {
                                                case 'workspace':
                                                    return <Database className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
                                                case 'department':
                                                    return <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
                                                case 'folder':
                                                    return isExpanded 
                                                        ? <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                                        : <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
                                                default:
                                                    return null;
                                            }
                                        };

                                        return (
                                            <TableRow 
                                                key={node.id} 
                                                className="hover:bg-muted/20 dark:hover:bg-slate-800/5 transition-colors border-border font-medium bg-muted/30 dark:bg-slate-900/5 select-none"
                                            >
                                                <TableCell className="pl-4 py-2" colSpan={7}>
                                                    <div 
                                                        className="flex items-center gap-2 cursor-pointer w-full"
                                                        style={{ paddingLeft: `${depth * 16}px` }}
                                                        onClick={() => toggleNode(node.id)}
                                                    >
                                                        {hasChildren ? (
                                                            <span className="p-0.5 text-muted-foreground shrink-0">
                                                                {isExpanded ? (
                                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                                ) : (
                                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                                )}
                                                            </span>
                                                        ) : (
                                                            <span className="w-4.5 shrink-0" />
                                                        )}
                                                        {renderFolderIcon()}
                                                        <span className={cn(
                                                            "text-xs truncate max-w-[400px]",
                                                            node.type === 'workspace' 
                                                                ? 'font-mono font-extrabold uppercase text-foreground/80 tracking-wide' 
                                                                : node.type === 'department'
                                                                ? 'font-mono font-bold text-foreground/75'
                                                                : 'text-foreground/85 font-semibold'
                                                        )} title={node.name}>
                                                            {node.name}
                                                        </span>
                                                        {node.children && (
                                                            <span className="text-[10px] text-muted-foreground font-normal ml-1.5 shrink-0">
                                                                ({node.children.length})
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    }
                                })
                            )}
                        </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <WikiPagination
                page={page}
                size={size}
                totalPages={totalPages}
                totalElements={totalElements}
                setPage={setPage}
                setSize={setSize}
            />

            <MarkdownEditorModal
                isOpen={editorOpen}
                onClose={() => {
                    setEditorOpen(false);
                    setEditingDoc(null);
                }}
                initialMarkdown={editingDoc?.markdownContent || ''}
                documentId={editingDoc?.id || 0}
                fileName={editingDoc?.fileName || ''}
                onSuccess={() => refetch()}
            />

            <DocumentMetadataModal
                isOpen={metadataOpen}
                onClose={() => {
                    setMetadataOpen(false);
                    setMetadataDoc(null);
                    setUploadPendingFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                document={metadataDoc}
                onConfirm={handleMetadataConfirm}
            />

            <ChunkInspectorModal
                isOpen={chunkInspectorOpen}
                onClose={() => {
                    setChunkInspectorOpen(false);
                    setInspectingDoc(null);
                }}
                documentId={inspectingDoc?.id || 0}
                fileName={inspectingDoc?.fileName || ''}
            />
        </div>
    );
}
