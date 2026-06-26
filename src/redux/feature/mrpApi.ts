// src/redux/feature/mrpApi.ts
// Redux Toolkit Query endpoints for upgraded MRP Pipeline & Wiki Page Review and Drafts workflow.

import { apiSlice } from '../api/baseApi';

export interface SourceCompilationPlan {
  id: number;
  sourceDocumentId: number;
  sourceDocumentName?: string;
  planJson: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'DONE' | string;
  reviewedBy?: string;
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WikiPage {
  id: number;
  title: string;
  slug: string;
  content: string;
  workspaceId: string;
  tags?: string;
  pageType?: string;
  summary?: string;
  sourceDocumentId?: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  links?: string[];
  departmentId?: string;
  allowedRoles?: string;
  securityClassification?: string;
}

export interface WikiPageDraft {
  id: number;
  wikiPageId?: number;
  slug: string;
  title: string;
  pageType?: string;
  content: string;
  summary?: string;
  tags?: string;
  workspaceId: string;
  authorId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION' | 'WITHDRAWN';
  note?: string;
  reviewerNote?: string;
  baseVersion?: number;
  revisionRound: number;
  departmentId?: string;
  allowedRoles?: string;
  securityClassification?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

// --- Wiki Graph Community Types ---
export interface WikiGraphCommunity {
  id: number;
  pageSlugs: string[];
  cohesion: number;
  topHub: string;
  lowCohesion: boolean;
}

export interface WikiGraphCommunityDto {
  communities: WikiGraphCommunity[];
  bridgeNodes: WikiPageRef[];
}

export interface WikiPageRef {
  slug: string;
  title: string;
  pageType?: string;
  updatedAt?: string;
}

export interface WikiBrokenLink {
  fromSlug: string;
  toSlug: string;
}

export interface WikiHealthSummary {
  totalPages: number;
  orphanCount: number;
  brokenLinkCount: number;
  staleCount: number;
  healthScore: number;
}

export interface WikiHealthDto {
  orphanPages: WikiPageRef[];
  brokenLinks: WikiBrokenLink[];
  stalePages: WikiPageRef[];
  summary: WikiHealthSummary;
}

export interface WikiIndexEntry {
  slug: string;
  title: string;
  summary: string;
  parent_slug?: string;
  category_path?: string[];
  wiki_path?: string;
  depth?: number;
  sort_order?: number;
}

export interface WikiIndexGroup {
  type: string;
  total: number;
  items: WikiIndexEntry[];
  next_cursor?: string;
}

export interface WikiIndexResponse {
  intro: string;
  version: number;
  groups: WikiIndexGroup[];
}

export interface ReindexResult {
  reindexed: number;
  errors: number;
  durationMs: number;
  total: number;
}

export interface WikiStatsDto {
  totalPages: number;
  pendingDrafts: number;
  activeCompilations: number;
  finalizingDocs: number;
  isIndexing: boolean;
}

export interface WikiActivityEntry {
  action: string;
  pageId?: number;
  draftId?: number;
  title: string;
  slug?: string;
  pageType?: string;
  authorId?: string;
  timestamp: string;
  version?: number;
  revisionRound?: number;
  reviewerNote?: string;
}

export interface WikiIssue {
  id: number;
  wikiPageSlug: string;
  issueType: 'MIXED_ENTITIES' | 'CONTRADICTORY_FACTS' | 'OUT_OF_DATE' | 'MISSING_LINKS' | 'POOR_QUALITY' | 'HALLUCINATION';
  status: 'OPEN' | 'IN_PROGRESS' | 'FIXED' | 'IGNORED';
  workspaceId: string;
  description: string;
  evidence: string;
  suggestedFix: string;
  detectedBy: string;
  resolvedBy: string;
  resolvedNote: string;
  resolvedAt: string;
  createdAt: string;
}

export interface CreateWikiIssueRequest {
  wikiPageSlug: string;
  issueType: WikiIssue['issueType'];
  workspaceId: string;
  description: string;
  evidence?: string;
  suggestedFix?: string;
}

export interface UpdateWikiIssueRequest {
  status?: WikiIssue['status'];
  resolvedNote?: string;
  resolvedBy?: string;
}

const normalizeWikiPage = (page: WikiPage): WikiPage => {
  if (!page) return page;
  return {
    ...page,
    workspaceId: (page.workspaceId === 'GLOBAL' || page.workspaceId === 'ALL') ? 'default-workspace' : page.workspaceId,
  };
};

const normalizeWikiDraft = (draft: WikiPageDraft): WikiPageDraft => {
  if (!draft) return draft;
  return {
    ...draft,
    workspaceId: (draft.workspaceId === 'GLOBAL' || draft.workspaceId === 'ALL') ? 'default-workspace' : draft.workspaceId,
  };
};

export const mrpApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    // Khởi tạo quy trình compile MRP
    compileDocument: builder.mutation<SourceCompilationPlan, { documentId: number; workspaceId?: string | null; autoApprove?: boolean }>({
      query: ({ documentId, workspaceId, autoApprove = false }) => ({
        url: `/mrp/compile?documentId=${documentId}${workspaceId ? `&workspaceId=${workspaceId}` : ''}&autoApprove=${autoApprove}`,
        method: 'POST',
      }),
      invalidatesTags: ['Documents', 'Tasks'],
    }),

    // Phê duyệt Kế hoạch biên soạn
    approvePlan: builder.mutation<{ message: string }, { planId: number; workspaceId: string; runAutoApproveDrafts?: boolean }>({
      query: ({ planId, workspaceId, runAutoApproveDrafts = false }) => ({
        url: `/mrp/plan/${planId}/approve?workspaceId=${workspaceId}&runAutoApproveDrafts=${runAutoApproveDrafts}`,
        method: 'POST',
      }),
      invalidatesTags: ['Documents', 'Tasks'],
    }),

    // Lấy tất cả bản thảo đang chờ duyệt (Hỗ trợ phân trang server-side)
    getPendingDrafts: builder.query<PaginatedResponse<WikiPageDraft> | WikiPageDraft[], { page?: number; size?: number } | void>({
      query: (params) => {
        let url = '/mrp/drafts';
        if (params && params.page !== undefined && params.size !== undefined) {
          url += `?page=${params.page}&size=${params.size}`;
        }
        return url;
      },
      transformResponse: (response: PaginatedResponse<WikiPageDraft> | WikiPageDraft[]) => {
        if (!response) return response;
        if (Array.isArray(response)) {
          return response.map(normalizeWikiDraft);
        }
        if ('content' in response && Array.isArray(response.content)) {
          return {
            ...response,
            content: response.content.map(normalizeWikiDraft)
          };
        }
        return response;
      },
      providesTags: ['Tasks'],
    }),

    // Lấy bản thảo theo trạng thái và phạm vi
    getDraftsByStatus: builder.query<WikiPageDraft[], { status?: string; mine?: boolean; limit?: number }>({
      query: ({ status = 'pending', mine = false, limit = 200 }) => {
        const params = new URLSearchParams();
        params.set('status', status);
        params.set('limit', String(limit));
        if (mine) params.set('mine', 'true');
        return `/mrp/drafts?${params.toString()}`;
      },
      transformResponse: (response: WikiPageDraft[]) => {
        if (!response) return response;
        return response.map(normalizeWikiDraft);
      },
      providesTags: ['Tasks'],
    }),

    // Lấy chi tiết một bản thảo theo ID
    getDraftById: builder.query<WikiPageDraft, number>({
      query: (draftId) => `/mrp/drafts/${draftId}`,
      transformResponse: (response: WikiPageDraft) => normalizeWikiDraft(response),
      providesTags: (_r, _e, id) => [{ type: 'Tasks', id }],
    }),

    // Lấy bản thảo theo workspace
    getDraftsByWorkspace: builder.query<WikiPageDraft[], string>({
      query: (workspaceId) => `/mrp/drafts/workspace/${workspaceId}`,
      transformResponse: (response: WikiPageDraft[]) => {
        if (!response) return response;
        return response.map(normalizeWikiDraft);
      },
      providesTags: ['Tasks'],
    }),

    // Phê duyệt bản thảo
    approveDraft: builder.mutation<WikiPageDraft, number>({
      query: (draftId) => ({
        url: `/mrp/drafts/${draftId}/approve`,
        method: 'POST',
      }),
      transformResponse: (response: WikiPageDraft) => normalizeWikiDraft(response),
      invalidatesTags: ['Tasks', 'Documents'],
    }),

    // Từ chối bản thảo
    rejectDraft: builder.mutation<WikiPageDraft, { draftId: number; note: string }>({
      query: ({ draftId, note }) => ({
        url: `/mrp/drafts/${draftId}/reject`,
        method: 'POST',
        body: { note },
      }),
      transformResponse: (response: WikiPageDraft) => normalizeWikiDraft(response),
      invalidatesTags: ['Tasks'],
    }),

    // Yêu cầu sửa đổi bản thảo
    requestChangesOnDraft: builder.mutation<WikiPageDraft, { draftId: number; note: string }>({
      query: ({ draftId, note }) => ({
        url: `/mrp/drafts/${draftId}/request-changes`,
        method: 'POST',
        body: { note },
      }),
      transformResponse: (response: WikiPageDraft) => normalizeWikiDraft(response),
      invalidatesTags: ['Tasks'],
    }),

    // Rút lại bản thảo (tác giả)
    withdrawDraft: builder.mutation<WikiPageDraft, number>({
      query: (draftId) => ({
        url: `/mrp/drafts/${draftId}/withdraw`,
        method: 'POST',
      }),
      transformResponse: (response: WikiPageDraft) => normalizeWikiDraft(response),
      invalidatesTags: ['Tasks'],
    }),

    // Phê duyệt hàng loạt bản thảo
    bulkApproveDrafts: builder.mutation<{
      approved: number;
      skipped: number;
      errored: number;
      results: Array<{ draft_id: number; status: string; message: string | null }>;
    }, { draft_ids: number[]; allow_conflict?: boolean }>({
      query: (body) => ({
        url: '/mrp/drafts/bulk-approve',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Tasks', 'Documents'],
    }),

    // Lấy danh sách trang Wiki chính thức (Hỗ trợ phân trang server-side)
    getWikiPages: builder.query<PaginatedResponse<WikiPage> | WikiPage[], { workspaceId?: string; page?: number; size?: number }>({
      query: ({ workspaceId = 'default-workspace', page, size } = {}) => {
        let url = `/mrp/wiki?workspaceId=${workspaceId}`;
        if (page !== undefined && size !== undefined) {
          url += `&page=${page}&size=${size}`;
        }
        return url;
      },
      transformResponse: (response: PaginatedResponse<WikiPage> | WikiPage[]) => {
        if (!response) return response;
        if (Array.isArray(response)) {
          return response.map(normalizeWikiPage);
        }
        if ('content' in response && Array.isArray(response.content)) {
          return {
            ...response,
            content: response.content.map(normalizeWikiPage)
          };
        }
        return response;
      },
      providesTags: ['Documents'],
    }),

    // Lấy danh sách metadata siêu nhẹ của toàn bộ Wiki (Dành cho Tree, Graph, Stats)
    getWikiPagesMetadata: builder.query<WikiPage[], { workspaceId?: string }>({
      query: ({ workspaceId = 'default-workspace' } = {}) => `/mrp/wiki/metadata?workspaceId=${workspaceId}`,
      transformResponse: (response: WikiPage[]) => {
        if (!response) return response;
        return response.map(normalizeWikiPage);
      },
      providesTags: ['Documents'],
    }),

    // Lấy đồ thị liên kết tri thức (Wiki Graph) của Workspace
    getWikiGraph: builder.query<{ nodes: Array<{ slug: string; title: string; pageType: string }>; edges: Array<{ from: string; to: string }> }, { workspaceId?: string }>({
      query: ({ workspaceId = 'default-workspace' } = {}) => `/mrp/wiki/graph?workspaceId=${workspaceId}`,
      providesTags: ['Documents'],
    }),

    // Lấy trang Wiki theo slug
    getWikiPageBySlug: builder.query<WikiPage, { slug: string; workspaceId?: string }>({
      query: ({ slug, workspaceId = 'default-workspace' }) => `/mrp/wiki/slug/${slug}?workspaceId=${workspaceId}`,
      transformResponse: (response: WikiPage) => normalizeWikiPage(response),
      providesTags: (_r, _e, { slug }) => [{ type: 'Documents', id: slug }],
    }),

    // Lấy trang Wiki theo ID
    getWikiPageById: builder.query<WikiPage, number>({
      query: (id) => `/mrp/wiki/id/${id}`,
      transformResponse: (response: WikiPage) => normalizeWikiPage(response),
      providesTags: (_r, _e, id) => [{ type: 'Documents', id }],
    }),

    // Lấy danh sách tất cả các kế hoạch biên soạn theo workspace (Hỗ trợ phân trang server-side)
    getCompilationPlans: builder.query<PaginatedResponse<SourceCompilationPlan> | SourceCompilationPlan[], { workspaceId?: string; page?: number; size?: number } | void>({
      query: (params) => {
        let url = '/mrp/plans';
        const queryParts: string[] = [];
        if (params) {
          if (params.workspaceId) {
            queryParts.push(`workspaceId=${encodeURIComponent(params.workspaceId)}`);
          }
          if (params.page !== undefined && params.size !== undefined) {
            queryParts.push(`page=${params.page}&size=${params.size}`);
          }
        }
        return queryParts.length ? `${url}?${queryParts.join('&')}` : url;
      },
      providesTags: ['Tasks'],
    }),

    // Lấy chi tiết một kế hoạch biên soạn
    getPlanById: builder.query<SourceCompilationPlan, number>({
      query: (planId) => `/mrp/plans/${planId}`,
      providesTags: (_r, _e, planId) => [{ type: 'Tasks', id: planId }],
    }),

    // Giải mã tham chiếu hình ảnh wiki (image://<uuid>)
    resolveWikiImages: builder.mutation<{ resolved: Record<string, string>; denied: string[] }, { ids: string[] }>({
      query: (body) => ({
        url: '/wiki/images/resolve',
        method: 'POST',
        body,
      }),
    }),
fetchWikiImageRaw: builder.query<string, string>({
  queryFn: async (imageId, api, _extraOptions, baseQuery) => {
    try {
      const result = await baseQuery({
        url: `/wiki/images/raw/${imageId}`,
        method: 'GET',
        responseHandler: async (response: Response) => {
          if (!response.ok) {
            try {
              return await response.json();
            } catch {
              return await response.text();
            }
          }
          return response.blob();
        },
      });

      if (result.error) return { error: result.error };

      const blob = result.data as unknown as Blob;
      const blobUrl = URL.createObjectURL(blob);
      return { data: blobUrl };
    } catch (err) {
      return {
        error: {
          status: 'CUSTOM_ERROR' as const,
          error: 'Failed to fetch wiki image',
          data: err,
        },
      };
    }
  },
  // BÍ KÍP Ở ĐÂY: Quản lý vòng đời của Blob URL theo vòng đời của Cache
  onCacheEntryAdded: async (
    _arg,
    { cacheDataLoaded, cacheEntryRemoved }
  ) => {
    let url = '';
    try {
      // Đợi cache có data (fetch thành công)
      const { data } = await cacheDataLoaded;
      url = data;
    } catch {
      // Bỏ qua nếu fetch lỗi
    }

    // Đợi cho đến khi RTK Query quyết định xóa cache này (ví dụ: component unmount được 60s)
    await cacheEntryRemoved;

    // Lúc này mới dọn dẹp bộ nhớ
    if (url) {
      URL.revokeObjectURL(url);
    }
  },
}),

    // --- Wiki Graph Communities ---
    getWikiGraphCommunities: builder.query<WikiGraphCommunityDto, { workspaceId: string }>({
      query: ({ workspaceId }) => `/mrp/wiki/graph/communities?workspaceId=${workspaceId}`,
    }),

    // --- Wiki Health ---
    getWikiHealth: builder.query<WikiHealthDto, { workspaceId: string }>({
      query: ({ workspaceId }) => `/mrp/wiki/health?workspaceId=${workspaceId}`,
    }),

    // --- Wiki Reindex ---
    reindexWikiPages: builder.mutation<ReindexResult, { workspaceId: string }>({
      query: ({ workspaceId }) => ({
        url: `/mrp/wiki/reindex?workspaceId=${workspaceId}`,
        method: 'POST',
      }),
    }),

    // --- Wiki Stats (compilation status polling) ---
    getWikiStats: builder.query<WikiStatsDto, { workspaceId: string }>({
      query: ({ workspaceId }) => `/mrp/wiki/stats?workspaceId=${workspaceId}`,
      providesTags: ['Documents', 'Tasks'],
    }),

    // --- Wiki Activity Log ---
    getWikiActivity: builder.query<WikiActivityEntry[], { workspaceId: string; limit?: number }>({
      query: ({ workspaceId, limit = 20 }) => `/mrp/wiki/activity?workspaceId=${workspaceId}&limit=${limit}`,
      providesTags: ['Documents', 'Tasks'],
    }),

    // --- Wiki Index View ---
    getWikiIndex: builder.query<WikiIndexResponse, { workspaceId?: string; types?: string[]; limit?: number; cursor?: string }>({
      query: ({ workspaceId = 'default-workspace', types, limit, cursor }) => {
        const params = new URLSearchParams();
        params.set('workspaceId', workspaceId);
        if (types && types.length > 0) {
          params.set('types', types.join(','));
        }
        if (limit !== undefined) {
          params.set('limit', String(limit));
        }
        if (cursor) {
          params.set('cursor', cursor);
        }
        return `/mrp/wiki/index?${params.toString()}`;
      },
      providesTags: ['Documents'],
    }),

    // --- Wiki Issues ---
    getWikiIssues: builder.query({
      query: ({ slug, workspaceId }) =>
        '/mrp/wiki/issues?slug=' + encodeURIComponent(slug) + '&workspaceId=' + encodeURIComponent(workspaceId),
      providesTags: ['Documents'],
    }),

    getWikiIssueCount: builder.query({
      query: ({ slug }) => '/mrp/wiki/issues/count?slug=' + encodeURIComponent(slug),
      providesTags: ['Documents'],
    }),

    getAllWikiIssues: builder.query({
      query: ({ workspaceId, status }) => {
        const params = new URLSearchParams({ workspaceId });
        if (status) params.set('status', status);
        return '/mrp/wiki/issues/all?' + params.toString();
      },
      providesTags: ['Documents'],
    }),

    createWikiIssue: builder.mutation({
      query: (body) => ({
        url: '/mrp/wiki/issues',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Documents'],
    }),

    updateWikiIssue: builder.mutation({
      query: ({ id, ...body }) => ({
        url: '/mrp/wiki/issues/' + id,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Documents'],
    }),

    deleteWikiIssue: builder.mutation({
      query: (id) => ({
        url: '/mrp/wiki/issues/' + id,
        method: 'DELETE',
      }),
      invalidatesTags: ['Documents'],
    }),
  }),
});

export const {
  useCompileDocumentMutation,
  useApprovePlanMutation,
  useGetPendingDraftsQuery,
  useGetDraftsByWorkspaceQuery,
  useGetDraftsByStatusQuery,
  useGetDraftByIdQuery,
  useApproveDraftMutation,
  useRejectDraftMutation,
  useRequestChangesOnDraftMutation,
  useWithdrawDraftMutation,
  useBulkApproveDraftsMutation,
  useGetWikiPagesQuery,
  useGetWikiPagesMetadataQuery,
  useGetWikiGraphQuery,
  useGetWikiPageBySlugQuery,
  useGetWikiPageByIdQuery,
  useGetCompilationPlansQuery,
  useGetPlanByIdQuery,
  useResolveWikiImagesMutation,
  useFetchWikiImageRawQuery,
  useLazyFetchWikiImageRawQuery,
  useGetWikiGraphCommunitiesQuery,
  useGetWikiHealthQuery,
  useReindexWikiPagesMutation,
  useGetWikiIndexQuery,
  useLazyGetWikiIndexQuery,
  useGetWikiStatsQuery,
  useGetWikiActivityQuery,
  useGetWikiIssuesQuery,
  useGetWikiIssueCountQuery,
  useGetAllWikiIssuesQuery,
  useCreateWikiIssueMutation,
  useUpdateWikiIssueMutation,
  useDeleteWikiIssueMutation,
} = mrpApi;
