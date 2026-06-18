"use client";

import React, { useMemo } from "react";
import { Document } from "@/src/redux/feature/knowledgeApi";
import {
  FileText,
  Download,
  Eye,
  Database,
  Calendar,
  Weight,
  FolderOpen,
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// ─── Types ──────────────────────────────────────────────────────────────────────
interface EmployeeDocumentPanelProps {
  documents: Document[];
  nodeLabel?: string;
  isLoading?: boolean;
}

const statusConfig = {
  PENDING: {
    icon: Clock,
    label: "Đang chờ",
    className: "bg-muted text-muted-foreground border-border",
  },
  PROCESSING: {
    icon: Loader2,
    label: "Đang xử lý",
    className: "border-blue-200 text-blue-600 bg-blue-50/60 dark:bg-blue-950/20 dark:text-blue-400",
  },
  PREVIEW: {
    icon: Eye,
    label: "Xem trước",
    className: "border-amber-200 text-amber-600 bg-amber-50/60 dark:bg-amber-950/20 dark:text-amber-400",
  },
  COMPLETED: {
    icon: CheckCircle2,
    label: "Hoàn thành",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400",
  },
  FAILED: {
    icon: XCircle,
    label: "Thất bại",
    className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400",
  },
} as const;

const fileColorMap: Record<string, string> = {
  pdf: "text-red-500",
  docx: "text-blue-500",
  doc: "text-blue-500",
  txt: "text-muted-foreground",
  csv: "text-emerald-500",
  xlsx: "text-emerald-600",
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function EmployeeDocumentPanel({
  documents,
  nodeLabel,
  isLoading = false,
}: EmployeeDocumentPanelProps) {
  const router = useRouter();

  // Only show COMPLETED documents to employees
  const visibleDocuments = useMemo(
    () => documents.filter((d) => d.status === "COMPLETED"),
    [documents]
  );

  const handleDownload = (doc: Document) => {
    const link = window.document.createElement("a");
    link.href = `/api/documents/${doc.id}/raw`;
    link.setAttribute("download", doc.fileName);
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success(`Đang tải xuống: ${doc.fileName}`);
  };

  const handleView = (doc: Document) => {
    router.push(`/knowledge/${doc.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-20 space-y-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <Database className="w-4 h-4 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Đang tải tài liệu...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-w-0 gap-4">
      {/* Panel header */}
      <div className="flex items-center gap-2.5">
        <FolderOpen className="w-5 h-5 text-primary shrink-0" />
        <h2 className="text-base font-semibold text-foreground truncate">
          {nodeLabel ?? "Select a folder to view documents"}
        </h2>
        {visibleDocuments.length > 0 && (
          <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 rounded-md font-semibold ml-auto shrink-0">
            {visibleDocuments.length} documents
          </Badge>
        )}
      </div>

      {/* Content */}
      {visibleDocuments.length === 0 ? (
        <Card className="flex flex-col items-center justify-center flex-1 min-h-[300px] border-dashed border-border/60 bg-card shadow-none rounded-lg gap-4 py-16">
          <div className="p-4 rounded-lg bg-muted/30 border border-border/40">
            <FileText className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <div className="text-center space-y-1.5">
            <p className="text-sm font-semibold text-foreground">
              No documents available
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              {nodeLabel
                ? `The folder "${nodeLabel}" has no documents shared with you yet.`
                : "Select a folder or department to browse documents."}
            </p>
          </div>
        </Card>
      ) : (
        <Card className="rounded-lg border-border/80 shadow-sm overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/60 border-b border-border/80">
                  <th className="text-left text-muted-foreground font-bold py-2.5 px-4 text-[10px] uppercase tracking-wider w-[45%]">
                    Tên tài liệu
                  </th>
                  <th className="text-left text-muted-foreground font-bold py-2.5 px-4 text-[10px] uppercase tracking-wider">
                    Phân loại
                  </th>
                  <th className="text-left text-muted-foreground font-bold py-2.5 px-4 text-[10px] uppercase tracking-wider">
                    Kích thước
                  </th>
                  <th className="text-left text-muted-foreground font-bold py-2.5 px-4 text-[10px] uppercase tracking-wider">
                    Ngày tải lên
                  </th>
                  <th className="text-right text-muted-foreground font-bold py-2.5 px-4 pr-4 text-[10px] uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleDocuments.map((doc) => {
                  const ext = doc.documentType?.toLowerCase() ?? "txt";
                  const iconColor = fileColorMap[ext] ?? "text-muted-foreground";
                  const status = statusConfig[doc.status as keyof typeof statusConfig] ?? statusConfig.PENDING;
                  const StatusIcon = status.icon;

                  return (
                    <tr
                      key={doc.id}
                      className="group border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      {/* File name */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("p-1.5 rounded-md bg-muted border border-border/30", iconColor)}>
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span
                              className="font-semibold text-foreground text-[13px] truncate hover:text-primary cursor-pointer transition-colors"
                              onClick={() => handleView(doc)}
                            >
                              {doc.fileName}
                            </span>
                            <span className="text-[9px] uppercase tracking-wider font-extrabold text-muted-foreground font-mono mt-0.5">
                              {doc.documentType}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Classification */}
                      <td className="py-2.5 px-4">
                        {doc.securityClassification && doc.securityClassification !== "PUBLIC" ? (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 h-4 rounded-[3px] font-bold uppercase tracking-tight bg-muted border-border"
                          >
                            {doc.securityClassification}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 h-4 rounded-[3px] font-bold uppercase tracking-tight bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400"
                          >
                            PUBLIC
                          </Badge>
                        )}
                      </td>

                      {/* Size */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1 text-muted-foreground text-xs">
                          <Weight className="w-3 h-3 opacity-50" />
                          {formatSize(doc.fileSize)}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3 opacity-50" />
                          <span>{format(new Date(doc.createdAt), "dd/MM/yyyy")}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 pr-4">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs rounded-md border border-border/60 hover:bg-muted gap-1"
                            onClick={() => handleView(doc)}
                          >
                            <Eye className="w-3 h-3" />
                            Xem
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs rounded-md border border-border/60 hover:bg-primary/5 hover:text-primary gap-1"
                            onClick={() => handleDownload(doc)}
                          >
                            <Download className="w-3 h-3" />
                            Tải về
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Footer stats */}
      {visibleDocuments.length > 0 && (
        <div className="flex items-center justify-between px-1 select-none">
          <p className="text-xs text-muted-foreground">
            Showing{" "}
            <span className="text-foreground font-semibold">{visibleDocuments.length}</span> documents
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Read-only
          </div>
        </div>
      )}
    </div>
  );
}
