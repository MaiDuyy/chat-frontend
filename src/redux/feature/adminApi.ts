import { apiSlice } from '../api/baseApi';
import type { Document, DocumentUploadResponse } from './knowledgeApi';
import type { WikiPage } from './mrpApi';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  phone?: string;
  status?: string;
  isOnline: boolean;
  isActive: boolean;
  lastSeen?: string;
  department?: string;
  position?: string;
  role?: string;
  isSuspended?: boolean;
  suspendedAt?: string;
  suspendedBy?: string;
  suspendReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role?: string;
  department?: string;
  invitedBy: string;
  inviterName?: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string;
}

export interface OrgSettings {
  id: string;
  name: string;
  logo?: string;
  domain?: string;
  defaultRole?: string;
  allowSignup: boolean;
  requireEmailVerification: boolean;
  sessionTimeout: number;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
  };
  mfaRequired: boolean;
  allowedEmailDomains?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain: string;
  maxWorkspaces: number;
  maxMembers: number;
  plan: string;
  _count?: {
    members: number;
  };
  createdAt: string;
}

// Request types
export interface UserFilters {
  search?: string;
  department?: string;
  role?: string;
  isActive?: boolean;
  cursor?: string;
  limit?: number;
  page?: number;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  password?: string;
  phone?: string;
  department?: string;
  position?: string;
  roleId?: string;
}

export interface UpdateUserRequest {
  name?: string;
  phone?: string;
  department?: string;
  position?: string;
  isActive?: boolean;
}

export interface InviteUserRequest {
  email: string;
  role?: string;
  department?: string;
  departmentRole?: 'HEAD' | 'MANAGER' | 'MEMBER' | 'GUEST';
  message?: string;
}

export interface UpdateOrgSettingsRequest {
  name?: string;
  logo?: string;
  domain?: string;
  defaultRole?: string;
  allowSignup?: boolean;
  requireEmailVerification?: boolean;
  sessionTimeout?: number;
  passwordPolicy?: Partial<OrgSettings['passwordPolicy']>;
  mfaRequired?: boolean;
  allowedEmailDomains?: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  total: number;
}

// AI Knowledge Settings types
export interface LlmModel {
  id: string;
  provider: string;
  label: string;
  description: string;
  recommended: boolean;
}

export interface AiConfig {
  // LLM
  llm_provider?: string | null;
  llm_api_key?: string | null;
  llm_api_key_configured?: boolean;
  llm_model?: string | null;
  llm_base_url?: string | null;
  // Embedding
  embedding_provider?: string | null;
  embedding_api_key?: string | null;
  embedding_api_key_configured?: boolean;
  embedding_model?: string | null;
  // RAG
  mrp_auto_approve?: string | null;
  chunk_size?: string | null;
  chunk_overlap?: string | null;
  [key: string]: string | boolean | null | undefined;
}

// Admin API using apiSlice.injectEndpoints
export const adminApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    // ============= USER MANAGEMENT =============

    // List users
    listUsers: builder.query<PaginatedResponse<User>, UserFilters | void>({
      query: (filters) => ({
        url: '/users',
        params: filters || {},
      }),
      transformResponse: (response: { 
        success: boolean; 
        users: User[]; 
        total: number; 
        page?: number; 
        totalPages?: number 
      }) => ({
        items: response.users || [],
        total: response.total || 0,
        nextCursor: undefined, // Backend uses page-based pagination
      }),
      providesTags: ['Users'],
    }),

    // Get user by ID
    getUserById: builder.query<{ user: User }, string>({
      query: (id) => `/users/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Users', id }],
    }),

    // Create user
    createUser: builder.mutation<{ user: User }, CreateUserRequest>({
      query: (body) => ({
        url: '/users',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Users'],
    }),

    // Update user
    updateUser: builder.mutation<{ user: User }, { id: string; data: UpdateUserRequest }>({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Users', id }, 'Users'],
    }),

    // Delete user
    deleteUser: builder.mutation<{ message: string }, { id: string; anonymize?: boolean }>({
      query: ({ id, anonymize }) => ({
        url: `/users/${id}`,
        method: 'DELETE',
        params: anonymize ? { anonymize: 'true' } : {},
      }),
      invalidatesTags: ['Users'],
    }),

    // Update user role
    updateUserRole: builder.mutation<{ message: string }, { userId: string; role: string }>({
      query: ({ userId, role }) => ({
        url: `/users/${userId}/role`,
        method: 'PUT',
        body: { role },
      }),
      invalidatesTags: ['Users', 'Roles'],
    }),

    // Suspend user
    suspendUser: builder.mutation<{ success: boolean; message: string }, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/users/${id}/suspend`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: ['Users'],
    }),

    // Unsuspend user
    unsuspendUser: builder.mutation<{ success: boolean; message: string }, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/users/${id}/unsuspend`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: ['Users'],
    }),


    // ============= ORG SETTINGS =============
    getOrgSettings: builder.query<{ success: boolean; settings: any }, void>({
      query: () => '/org-settings',
      providesTags: ['OrgSettings'],
    }),

    updateOrgSettings: builder.mutation<{ success: boolean; settings: any; message: string }, any>({
      query: (body) => ({
        url: '/org-settings',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['OrgSettings'],
    }),

    // ============= INVITATIONS =============


    // List invitations
    listInvitations: builder.query<{ invitations: Invitation[] }, { status?: string } | void>({
      query: (params) => ({
        url: '/invitations',
        params: params || {},
      }),
      providesTags: ['Invitations'],
    }),

    // Invite user
    inviteUser: builder.mutation<{ invitation: Invitation }, InviteUserRequest>({
      query: (body) => ({
        url: '/invitations',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Invitations'],
    }),

    // Provision user (Flow A)
    provisionUser: builder.mutation<any, { email: string; name: string; role: string; departmentId?: string; departmentRole?: string }>({
      query: (body) => ({
        url: '/users/provision',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Users'],
    }),

    // Resend invitation
    resendInvitation: builder.mutation<{ invitation: Invitation }, string>({
      query: (id) => ({
        url: `/invitations/${id}/resend`,
        method: 'POST',
      }),
      invalidatesTags: ['Invitations'],
    }),

    // Cancel invitation
    cancelInvitation: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/invitations/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Invitations'],
    }),

    // ============= ORG SETTINGS =============
    // ============= STATISTICS =============

    // Get admin dashboard stats
    getAdminStats: builder.query<{
      totalUsers: number;
      activeUsers: number;
      pendingInvitations: number;
      totalMessages: number;
      totalWorkspaces: number;
      fileStorageUsage: number;
      roleDistribution: Array<{ role: string; count: number }>;
      departmentDistribution: Array<{ department: string; count: number }>;
      userGrowth: Array<{ date: string; count: number }>;
      messageActivity: Array<{ date: string; count: number }>;
      recentActivity: Array<{
        type: string;
        description: string;
        timestamp: string;
      }>;
    }, void>({
      query: () => '/admin/stats',
      providesTags: ['AdminStats'],
    }),
    
    // Send global broadcast
    sendBroadcast: builder.mutation<{ success: boolean; message: string }, { title: string; body: string; type?: string }>({
      query: (data) => ({
        url: '/admin/broadcast',
        method: 'POST',
        body: data,
      }),
    }),
    
    // ============= ORGANIZATION MANAGEMENT =============
    
    // List organizations
    listOrganizations: builder.query<PaginatedResponse<Organization>, { page?: number; limit?: number; search?: string } | void>({
      query: (params) => ({
        url: '/admin/organizations',
        params: params || {},
      }),
      transformResponse: (response: { 
        success: boolean; 
        organizations: Organization[]; 
        total: number; 
      }) => ({
        items: response.organizations || [],
        total: response.total || 0,
      }),
      providesTags: ['Organizations'],
    }),

    // Update organization quota
    updateOrgQuota: builder.mutation<{ success: boolean; message: string }, { orgId: string; maxWorkspaces: number }>({
      query: ({ orgId, maxWorkspaces }) => ({
        url: `/admin/organizations/${orgId}/quota`,
        method: 'PATCH',
        body: { maxWorkspaces },
      }),
      invalidatesTags: ['Organizations'],
    }),
    
    // Update user quota
    updateUserQuota: builder.mutation<{ success: boolean; message: string }, { userId: string; maxWorkspaces: number }>({
      query: ({ userId, maxWorkspaces }) => ({
        url: `/admin/users/${userId}/quota`,
        method: 'PATCH',
        body: { maxWorkspaces },
      }),
      invalidatesTags: ['Users'],
    }),

    // ============= AI KNOWLEDGE SETTINGS =============

    // Get all AI config (sensitive values are masked by backend)
    getAiSettings: builder.query<AiConfig, void>({
      query: () => '/settings',
      providesTags: ['AISettings'],
    }),

    // Batch update AI config
    updateAiSettings: builder.mutation<AiConfig & { _saveResults: Record<string, boolean> }, { settings: Record<string, string> }>({
      query: (body) => ({
        url: '/settings',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['AISettings'],
    }),

    // Get LLM model catalog
    getLlmCatalog: builder.query<LlmModel[], void>({
      query: () => '/settings/llm/catalog',
      providesTags: ['AISettings'],
    }),

    // Switch active LLM model
    switchLlmModel: builder.mutation<{ message: string; activeModel: string; provider: string }, { modelId: string; provider: string }>({
      query: (body) => ({
        url: '/settings/llm/switch',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AISettings'],
    }),

    // Get all documents system-wide (Admin only)
    getAdminDocuments: builder.query<Document[], { page?: number; size?: number } | void>({
      query: (params) => {
        if (params && (params.page !== undefined || params.size !== undefined)) {
          const q = new URLSearchParams();
          if (params.page !== undefined) q.append('page', String(params.page));
          if (params.size !== undefined) q.append('size', String(params.size));
          return `/admin/documents?${q.toString()}`;
        }
        return '/admin/documents';
      },
      transformResponse: (response: Document[] | { content: Document[] }) => {
        const normalizeDoc = (doc: Document): Document => ({
          ...doc,
          workspaceId: (doc.workspaceId === 'GLOBAL' || doc.workspaceId === 'ALL') ? 'default-workspace' : doc.workspaceId,
        });
        if (Array.isArray(response)) return response.map(normalizeDoc);
        if ('content' in response && Array.isArray(response.content)) return response.content.map(normalizeDoc);
        return [];
      },
      providesTags: ['Documents'],
    }),

    // Get details of any document system-wide (Admin only)
    getAdminDocument: builder.query<Document, number | string>({
      query: (id) => `/admin/documents/${id}`,
      transformResponse: (response: Document): Document => ({
        ...response,
        workspaceId: (response.workspaceId === 'GLOBAL' || response.workspaceId === 'ALL') ? 'default-workspace' : response.workspaceId,
      }),
      providesTags: (_r, _e, id) => [{ type: 'Documents', id }],
    }),

    // Delete any document system-wide (Admin only)
    deleteAdminDocument: builder.mutation<{ message: string }, number | string>({
      query: (id) => ({
        url: `/admin/documents/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Documents'],
    }),

    // Admin upload: upload a document without workspace scope restriction
    // Builds URL string manually (same pattern as knowledgeApi.uploadDocument) for reliable multipart forwarding
    uploadAdminDocument: builder.mutation<
      DocumentUploadResponse,
      {
        formData: FormData;
        preview?: boolean;
        parser?: 'gemini' | 'tika';
        workspaceId?: string;
        departmentId?: string;
        allowedRoles?: string;
        securityClassification?: string;
        folderPath?: string;
      }
    >({
      query: ({ formData, preview, parser, workspaceId, departmentId, allowedRoles, securityClassification, folderPath }) => {
        let url = `/admin/documents/upload?preview=${preview ?? false}&parser=${parser || 'gemini'}`;
        if (workspaceId) url += `&workspaceId=${encodeURIComponent(workspaceId)}`;
        if (departmentId) url += `&departmentId=${encodeURIComponent(departmentId)}`;
        if (allowedRoles) url += `&allowedRoles=${encodeURIComponent(allowedRoles)}`;
        if (securityClassification) url += `&securityClassification=${encodeURIComponent(securityClassification)}`;
        if (folderPath) url += `&folderPath=${encodeURIComponent(folderPath)}`;
        return { url, method: 'POST', body: formData };
      },
      invalidatesTags: ['Documents'],
    }),

    // Get all wiki pages system-wide (Admin only)
    getAdminWikiPages: builder.query<any, { page?: number; size?: number } | void>({
      query: (params) => ({
        url: '/admin/mrp/wiki',
        params: params || {},
      }),
      providesTags: ['Documents'],
    }),

    // Get lightweight wiki metadata system-wide (Admin only)
    getAdminWikiMetadata: builder.query<WikiPage[], void>({
      query: () => '/admin/mrp/wiki/metadata',
      providesTags: ['Documents'],
    }),

    // Get wiki link graph system-wide (Admin only)
    getAdminWikiGraph: builder.query<{ nodes: Array<{ slug: string; title: string; pageType: string }>; edges: Array<{ from: string; to: string }> }, void>({
      query: () => '/admin/mrp/wiki/graph',
      providesTags: ['Documents'],
    }),

    // Rebuild all wiki graph links and index page for a workspace (Admin only)
    rebuildWikiLinks: builder.mutation<{ pagesRefreshed: number; pagesTotal: number; errors: number; workspaceId: string }, { workspaceId?: string; departmentId?: string }>({
      query: ({ workspaceId, departmentId } = {}) => {
        const params = new URLSearchParams();
        if (workspaceId) params.set('workspaceId', workspaceId);
        if (departmentId) params.set('departmentId', departmentId);
        const qs = params.toString();
        return { url: `/admin/mrp/wiki/rebuild-links${qs ? `?${qs}` : ''}`, method: 'POST' };
      },
      invalidatesTags: ['Documents'],
    }),

    // Get a single wiki page by slug across all workspaces (Admin only)
    // Optional workspaceId to prefer a specific workspace when slug conflicts exist
    getAdminWikiPageBySlug: builder.query<WikiPage, { slug: string; workspaceId?: string }>({
      query: ({ slug, workspaceId }) => {
        const params = workspaceId && workspaceId !== 'all' ? `?workspaceId=${encodeURIComponent(workspaceId)}` : '';
        return `/admin/mrp/wiki/slug/${slug}${params}`;
      },
      providesTags: (_r, _e, { slug }) => [{ type: 'Documents', id: `admin-slug-${slug}` }],
    }),
  }),
});

export const {
  // Users
  useListUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useUpdateUserRoleMutation,
  useSuspendUserMutation,
  useUnsuspendUserMutation,
  // Invitations
  useListInvitationsQuery,
  useInviteUserMutation,
  useProvisionUserMutation,
  useResendInvitationMutation,
  useCancelInvitationMutation,
  // Org Settings
  useGetOrgSettingsQuery,
  useUpdateOrgSettingsMutation,
  // Stats
  useGetAdminStatsQuery,
  // Broadcast
  useSendBroadcastMutation,
  // Organizations
  useListOrganizationsQuery,
  useUpdateOrgQuotaMutation,
  useUpdateUserQuotaMutation,
  // AI Knowledge Settings
  useGetAiSettingsQuery,
  useUpdateAiSettingsMutation,
  useGetLlmCatalogQuery,
  useSwitchLlmModelMutation,
  // Admin Document & Wiki endpoints
  useGetAdminDocumentsQuery,
  useGetAdminDocumentQuery,
  useDeleteAdminDocumentMutation,
  useUploadAdminDocumentMutation,
  useGetAdminWikiPagesQuery,
  useGetAdminWikiMetadataQuery,
  useGetAdminWikiGraphQuery,
  useRebuildWikiLinksMutation,
  useGetAdminWikiPageBySlugQuery,
  useLazyGetAdminWikiPageBySlugQuery,
  // Lazy
  useLazyListUsersQuery,
  useLazyGetUserByIdQuery,
} = adminApi;
