import { Document } from '@/src/redux/feature/knowledgeApi';

export interface TreeNode {
    id: string; // "workspace:{id}", "dept:{wsId}:{deptId}", "folder:{parentId}:{segment}", "file:{id}"
    name: string;
    type: 'workspace' | 'department' | 'folder' | 'file';
    path: string;
    children: TreeNode[];
    document?: Document;
}

/**
 * Parses a flat list of Documents along with workspaces and departments
 * into a hierarchical tree structure with Zero-Trust pruning.
 *
 * Admin mode: documents may belong to workspaces not in the user's workspace list.
 * These are handled by creating virtual workspace nodes from the workspaceId directly.
 */
export function parseDocumentsToTree(
    documents: Document[],
    workspaces: { id: string; name: string; departmentId?: string }[],
    departments: { id: string; name: string }[]
): TreeNode[] {
    const rootNodes: TreeNode[] = [];
    const deptNodeMap = new Map<string, TreeNode>();
    const wsNodeMap = new Map<string, TreeNode>();

    // 1. Initialize Department Nodes (as root level)
    departments.forEach(dept => {
        const deptNode: TreeNode = {
            id: `dept:${dept.id}`,
            name: `Phòng ban: ${dept.name}`,
            type: 'department',
            path: dept.id,
            children: []
        };
        deptNodeMap.set(dept.id, deptNode);
        rootNodes.push(deptNode);
    });

    // 2. Initialize Workspace Nodes (from known workspaces)
    workspaces.forEach(ws => {
        const wsNode: TreeNode = {
            id: `workspace:${ws.id}`,
            name: ws.name,
            type: 'workspace',
            path: ws.id,
            children: []
        };
        wsNodeMap.set(ws.id, wsNode);

        // Mount workspace under department if it belongs to one
        if (ws.departmentId && deptNodeMap.has(ws.departmentId)) {
            const deptNode = deptNodeMap.get(ws.departmentId);
            deptNode?.children.push(wsNode);
        } else {
            // Otherwise, mount at root level (e.g. workspace without department)
            rootNodes.push(wsNode);
        }
    });

    // Ensure virtual default global workspace exists under BOTH aliases at root level
    const globalWsNode: TreeNode = {
        id: 'workspace:workspace-default',
        name: 'Thư mục dùng chung (Toàn công ty)',
        type: 'workspace',
        path: 'workspace-default',
        children: []
    };
    wsNodeMap.set('workspace-default', globalWsNode);
    wsNodeMap.set('default-workspace', globalWsNode); // alias
    rootNodes.push(globalWsNode);

    // Helper: get or create a virtual workspace node for unknown workspace IDs (admin mode)
    function getOrCreateWsNode(wsId: string): TreeNode {
        if (wsNodeMap.has(wsId)) return wsNodeMap.get(wsId)!;
        // Create virtual node for unknown workspace (admin sees docs from all workspaces)
        const shortId = wsId.length > 20 ? wsId.slice(0, 16) + '…' : wsId;
        const virtualNode: TreeNode = {
            id: `workspace:${wsId}`,
            name: `Không gian: ${shortId}`,
            type: 'workspace',
            path: wsId,
            children: []
        };
        wsNodeMap.set(wsId, virtualNode);
        rootNodes.push(virtualNode);
        return virtualNode;
    }

    // Helper function to insert a document into a parent node (Workspace, Department, or Global)
    function insertDocIntoNode(doc: Document, parentNode: TreeNode) {
        let currentParent = parentNode;

        // Parse folder path segments
        const cleanPath = doc.folderPath ? doc.folderPath.replace(/^\/+|\/+$/g, '') : '';
        const segments = cleanPath ? cleanPath.split('/') : [];

        segments.forEach(segment => {
            let nextNode = currentParent.children.find(c => c.name === segment && c.type === 'folder');
            if (!nextNode) {
                nextNode = {
                    id: `folder:${currentParent.id}:${segment}`,
                    name: segment,
                    type: 'folder',
                    path: `${currentParent.path}/${segment}`,
                    children: []
                };
                currentParent.children.push(nextNode);
            }
            currentParent = nextNode;
        });

        // Insert File Node
        currentParent.children.push({
            id: `file:${parentNode.id}:${doc.id}`,
            name: doc.fileName,
            type: 'file',
            path: doc.folderPath || '',
            children: [],
            document: doc
        });
    }

    // 3. Insert documents into workspaces & departments
    documents.forEach(doc => {
        // Normalize workspaceId
        let originalWsId = doc.workspaceId;
        if (originalWsId === '' || originalWsId === 'all' || originalWsId === 'GLOBAL') {
            originalWsId = undefined;
        }

        if (originalWsId && originalWsId !== 'default-workspace' && originalWsId !== 'workspace-default') {
            // Workspace-specific document — get or create the workspace node
            // getOrCreateWsNode handles unknown workspaceIds in admin mode
            const wsNode = getOrCreateWsNode(originalWsId);
            insertDocIntoNode(doc, wsNode);
        } else {
            // Global or Department-wide document
            if (doc.departmentId && doc.departmentId !== '') {
                // Find department node and insert directly under it
                const deptNode = deptNodeMap.get(doc.departmentId);
                if (deptNode) {
                    insertDocIntoNode(doc, deptNode);
                } else {
                    // Fallback to global shared if department doesn't exist
                    const globalWs = wsNodeMap.get('workspace-default');
                    if (globalWs) {
                        insertDocIntoNode(doc, globalWs);
                    }
                }
            } else {
                // Global document
                const globalWs = wsNodeMap.get('workspace-default');
                if (globalWs) {
                    insertDocIntoNode(doc, globalWs);
                }
            }
        }
    });

    // 4. Recursively prune empty nodes (Zero Trust cleaning)
    function pruneTree(nodes: TreeNode[]): TreeNode[] {
        return nodes
            .map(node => ({
                ...node,
                children: pruneTree(node.children)
            }))
            .filter(node => {
                if (node.type === 'workspace' && node.path === 'workspace-default') {
                    return true;
                }
                if (node.type === 'file') {
                    return true;
                }
                return node.children.length > 0;
            });
    }

    return pruneTree(rootNodes);
}
