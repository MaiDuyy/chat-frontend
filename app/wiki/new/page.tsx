"use client";

import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useGetWikiPagesQuery, useCompileDocumentMutation, useGetWikiPageBySlugQuery } from "@/src/redux/feature/mrpApi";
import { useHasRole } from "@/src/lib/rbac/usePermission";
import { WikiEditor } from "../components/WikiEditor";
import { useSelector } from "react-redux";
import { useGetUserDepartmentsQuery } from "@/src/redux/feature/departmentApi";
import type { RootState } from "@/src/redux/store";

export default function NewWikiPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const suggestEdit = searchParams.get("suggestEdit") === "true";
  const editSlug = searchParams.get("slug") || "";

  const currentWorkspaceId = useSelector((state: any) => state.workspace.currentWorkspaceId);
  const workspaceId = currentWorkspaceId || "default-workspace";
  const user = useSelector((state: RootState) => state.auth.user);
  const { data: userDepts } = useGetUserDepartmentsQuery(user?.id ?? "", { skip: !user?.id });

  const isSuperAdmin = useHasRole("SUPER_ADMIN");
  const isAdmin = useHasRole("ADMIN");
  const isWorkspaceManager = useHasRole("WORKSPACE_MANAGER");
  const canManageWiki = isSuperAdmin || isAdmin || isWorkspaceManager;

  const { data: wikiPagesRaw } = useGetWikiPagesQuery({ workspaceId });
  const wikiPages = Array.isArray(wikiPagesRaw)
    ? wikiPagesRaw
    : (wikiPagesRaw && 'content' in wikiPagesRaw ? wikiPagesRaw.content : undefined);
  const [compileDocument, { isLoading }] = useCompileDocumentMutation();

  // Fetch original page if suggesting an edit
  const { data: editPage, isLoading: isEditPageLoading } = useGetWikiPageBySlugQuery(
    { slug: editSlug, workspaceId },
    { skip: !suggestEdit || !editSlug }
  );

  const [submitted, setSubmitted] = React.useState(false);
  const [createdSlug, setCreatedSlug] = React.useState("");

  const handleSubmit = async (data: {
    title: string;
    content: string;
    pageType: string;
    tags: string;
    note: string;
    departmentId?: string;
    securityClassification?: string;
  }) => {
    console.log("Submitting proposed manual wiki page draft:", data);

    const slug = suggestEdit && editSlug
      ? editSlug
      : data.title
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, "")
          .replace(/[\s_-]+/g, "-")
          .replace(/^-+|-+$/g, "");

    setCreatedSlug(slug);
    setSubmitted(true);
  };

  if (isEditPageLoading) {
    return (
      <div className="font-sans min-h-[400px] flex flex-col items-center justify-center text-center p-6 bg-background">
        <Loader2 className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin rounded-full mb-3" />
        <p className="text-xs font-mono uppercase text-muted-foreground">Đang tải tài liệu gốc...</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="font-sans max-w-xl mx-auto p-6 border border-border bg-card text-center rounded-lg shadow-md my-16 flex flex-col items-center gap-3">
        <CheckCircle2 className="w-12 h-12 text-emerald-600 shrink-0 animate-bounce" />
        <h2 className="text-xl font-bold text-foreground">Gửi đề xuất thành công!</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {suggestEdit
            ? `Đề xuất chỉnh sửa trang Wiki "/wiki/${createdSlug}" đã được gửi lên hệ thống và đang chờ quản trị viên phê duyệt.`
            : `Đề xuất tạo trang Wiki mới "/wiki/${createdSlug}" đã được đưa vào hàng chờ kiểm duyệt. Ban quản trị sẽ tiến hành so sánh, đối soát tri thức và phê duyệt trước khi cập nhật chính thức.`
          }
        </p>
        <div className="flex flex-col sm:flex-row gap-2 w-full mt-4 justify-center">
          <Link
            href={suggestEdit && editSlug ? `/wiki/${editSlug}` : "/wiki"}
            className="px-4 py-2 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground transition-colors rounded-md shadow-sm active:scale-[0.98]"
          >
            Quay lại trang tài liệu
          </Link>
          <Link
            href="/wiki"
            className="px-4 py-2 text-xs font-medium border border-border bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors rounded-md shadow-sm active:scale-[0.98]"
          >
            Về Dashboard Wiki
          </Link>
        </div>
      </div>
    );
  }

  return (
    <WikiEditor
      initialTitle={editPage?.title || ""}
      initialContent={editPage?.content || ""}
      initialTags={editPage?.tags || ""}
      initialPageType={editPage?.pageType || "concept"}
      initialDepartmentId={editPage?.departmentId || ""}
      initialClassification={editPage?.securityClassification || "INTERNAL"}
      slug={editSlug}
      wikiPages={wikiPages}
      userDepartments={userDepts?.map((d) => ({ departmentId: d.id, name: d.name, role: d.userRole })) || []}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      onCancel={() => router.push(suggestEdit && editSlug ? `/wiki/${editSlug}` : "/wiki")}
    />
  );
}
