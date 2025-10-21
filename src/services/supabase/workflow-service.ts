import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import { Tables } from "@/types/supabase";
import {
  DBWorkflow,
  DBNode,
  DBEdge,
  WorkflowSummary,
  WorkflowCreateInput,
  WorkflowUpdateInput,
  WorkflowFilters,
  WorkflowStructure,
  WorkflowExecution,
  WorkflowTool,
} from "@/types/workflow";
import { Visibility } from "@/types/util";

// ============================================================================
// TYPES
// ============================================================================

type WorkflowRow = Tables<"workflow">;
type WorkflowNodeRow = Tables<"workflow_node">;
type WorkflowEdgeRow = Tables<"workflow_edge">;

export type Workflow = DBWorkflow;
export type WorkflowNode = DBNode;
export type WorkflowEdge = DBEdge;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert database row to Workflow type
 */
function rowToWorkflow(row: WorkflowRow): Workflow {
  return {
    id: row.id,
    version: row.version,
    name: row.name,
    description: row.description || undefined,
    icon: row.icon as any,
    isPublished: row.is_published,
    visibility: row.visibility as Visibility,
    userId: row.user_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Convert database row to WorkflowSummary type
 */
function rowToWorkflowSummary(
  row: Partial<WorkflowRow> & {
    id: string;
    name: string;
    user_id: string;
    updated_at: string;
    visibility: string;
    is_published: boolean;
    user_name?: string;
    user_avatar?: string;
    description?: string | null;
    icon?: any;
  },
): WorkflowSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    icon: row.icon as any,
    visibility: row.visibility as Visibility,
    isPublished: row.is_published,
    userId: row.user_id,
    userName: row.user_name || "",
    userAvatar: row.user_avatar || undefined,
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Convert database row to WorkflowNode type
 */
function rowToWorkflowNode(row: WorkflowNodeRow): WorkflowNode {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    kind: row.kind,
    name: row.name,
    description: row.description || undefined,
    nodeConfig: row.node_config as any,
    uiConfig: row.ui_config as any,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Convert database row to WorkflowEdge type
 */
function rowToWorkflowEdge(row: WorkflowEdgeRow): WorkflowEdge {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    source: row.source,
    target: row.target,
    uiConfig: row.ui_config as any,
    createdAt: new Date(row.created_at),
  };
}

// ============================================================================
// WORKFLOW CRUD OPERATIONS
// ============================================================================

/**
 * Get all workflows for a user with optional filters
 */
export async function getWorkflows(
  userId: string,
  filters?: WorkflowFilters,
): Promise<WorkflowSummary[]> {
  const currentUser = await getSupabaseUser();
  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  const supabase = await createClient();

  let query = supabase.from("workflow").select(`
      id, name, description, icon, visibility, is_published, user_id, updated_at,
      user:users!workflow_user_id_users_id_fk(name, image)
    `);

  // Apply visibility filters
  if (filters?.visibility && filters.visibility.length > 0) {
    query = query.in("visibility", filters.visibility);
  }

  // Apply ownership filters
  if (filters?.ownership) {
    if (filters.ownership.includes("mine")) {
      query = query.or(`user_id.eq.${userId}`);
    }
    if (filters.ownership.includes("shared")) {
      query = query.or(`user_id.neq.${userId},visibility.neq.private`);
    }
  } else {
    // Default behavior: show owned + public/shared workflows
    query = query.or(`user_id.eq.${userId},visibility.neq.private`);
  }

  // Apply search filter
  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
    );
  }

  // Apply limit
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  query = query.order("updated_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching workflows:", error);
    throw new Error("Failed to fetch workflows");
  }

  return (data || []).map((row) => {
    const user = Array.isArray(row.user) ? row.user[0] : row.user;
    return rowToWorkflowSummary({
      ...row,
      user_name: user?.name,
      user_avatar: user?.image,
    });
  });
}

/**
 * Get a single workflow by ID
 */
export async function getWorkflow(
  workflowId: string,
): Promise<Workflow | null> {
  const currentUser = await getSupabaseUser();
  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workflow")
    .select("*")
    .eq("id", workflowId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    console.error("Error fetching workflow:", error);
    throw new Error("Failed to fetch workflow");
  }

  return rowToWorkflow(data);
}

/**
 * Create a new workflow
 */
export async function createWorkflow(
  data: WorkflowCreateInput,
): Promise<Workflow> {
  const currentUser = await getSupabaseUser();
  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  const supabase = await createClient();

  const workflowData = {
    name: data.name,
    description: data.description || null,
    icon: data.icon || null,
    visibility: data.visibility || "private",
    is_published: data.isPublished || false,
    user_id: currentUser.id,
    version: "0.1.0",
  };

  const { data: workflow, error } = await supabase
    .from("workflow")
    .insert(workflowData)
    .select("*")
    .single();

  if (error) {
    console.error("Error creating workflow:", error);
    throw new Error("Failed to create workflow");
  }

  return rowToWorkflow(workflow);
}

/**
 * Update an existing workflow
 */
export async function updateWorkflow(
  workflowId: string,
  updates: WorkflowUpdateInput,
): Promise<Workflow> {
  const currentUser = await getSupabaseUser();
  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  const supabase = await createClient();

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined)
    updateData.description = updates.description;
  if (updates.icon !== undefined) updateData.icon = updates.icon;
  if (updates.visibility !== undefined)
    updateData.visibility = updates.visibility;
  if (updates.isPublished !== undefined)
    updateData.is_published = updates.isPublished;

  const { data, error } = await supabase
    .from("workflow")
    .update(updateData)
    .eq("id", workflowId)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating workflow:", error);
    throw new Error("Failed to update workflow");
  }

  return rowToWorkflow(data);
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(workflowId: string): Promise<void> {
  const currentUser = await getSupabaseUser();
  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("workflow")
    .delete()
    .eq("id", workflowId);

  if (error) {
    console.error("Error deleting workflow:", error);
    throw new Error("Failed to delete workflow");
  }
}

/**
 * Check if user has access to a workflow
 */
export async function checkWorkflowAccess(
  workflowId: string,
  userId: string,
  destructive: boolean = false,
): Promise<boolean> {
  const currentUser = await getSupabaseUser();
  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workflow")
    .select("user_id, visibility")
    .eq("id", workflowId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return false; // Not found
    }
    console.error("Error checking workflow access:", error);
    throw new Error("Failed to check workflow access");
  }

  // User owns the workflow
  if (data.user_id === userId) {
    return true;
  }

  // Public workflows are accessible to everyone for read-only access
  if (data.visibility === "public") {
    return true;
  }

  // Read-only workflows allow read access but not destructive operations
  if (data.visibility === "readonly" && !destructive) {
    return true;
  }

  return false;
}

// ============================================================================
// WORKFLOW STRUCTURE OPERATIONS
// ============================================================================

/**
 * Get workflow structure (nodes and edges)
 */
export async function getWorkflowStructure(
  workflowId: string,
): Promise<WorkflowStructure> {
  const currentUser = await getSupabaseUser();
  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  const supabase = await createClient();

  // Get workflow details
  const { data: workflowData, error: workflowError } = await supabase
    .from("workflow")
    .select("*")
    .eq("id", workflowId)
    .single();

  if (workflowError) {
    if (workflowError.code === "PGRST116") {
      throw new Error("Workflow not found");
    }
    console.error("Error fetching workflow:", workflowError);
    throw new Error("Failed to fetch workflow");
  }

  // Get nodes
  const { data: nodesData, error: nodesError } = await supabase
    .from("workflow_node")
    .select("*")
    .eq("workflow_id", workflowId);

  if (nodesError) {
    console.error("Error fetching workflow nodes:", nodesError);
    throw new Error("Failed to fetch workflow nodes");
  }

  // Get edges
  const { data: edgesData, error: edgesError } = await supabase
    .from("workflow_edge")
    .select("*")
    .eq("workflow_id", workflowId);

  if (edgesError) {
    console.error("Error fetching workflow edges:", edgesError);
    throw new Error("Failed to fetch workflow edges");
  }

  return {
    ...rowToWorkflow(workflowData),
    nodes: (nodesData || []).map(rowToWorkflowNode),
    edges: (edgesData || []).map(rowToWorkflowEdge),
  };
}

/**
 * Update workflow structure (nodes and edges)
 */
export async function updateWorkflowStructure(
  workflowId: string,
  structure: {
    nodes?: WorkflowNode[];
    edges?: WorkflowEdge[];
    deleteNodes?: string[];
    deleteEdges?: string[];
  },
): Promise<void> {
  const currentUser = await getSupabaseUser();
  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  const supabase = await createClient();

  // Delete nodes if specified
  if (structure.deleteNodes && structure.deleteNodes.length > 0) {
    const { error: deleteNodesError } = await supabase
      .from("workflow_node")
      .delete()
      .in("id", structure.deleteNodes);

    if (deleteNodesError) {
      console.error("Error deleting workflow nodes:", deleteNodesError);
      throw new Error("Failed to delete workflow nodes");
    }
  }

  // Delete edges if specified
  if (structure.deleteEdges && structure.deleteEdges.length > 0) {
    const { error: deleteEdgesError } = await supabase
      .from("workflow_edge")
      .delete()
      .in("id", structure.deleteEdges);

    if (deleteEdgesError) {
      console.error("Error deleting workflow edges:", deleteEdgesError);
      throw new Error("Failed to delete workflow edges");
    }
  }

  // Upsert nodes if provided
  if (structure.nodes && structure.nodes.length > 0) {
    const { error: upsertNodesError } = await supabase
      .from("workflow_node")
      .upsert(
        structure.nodes.map((node) => ({
          id: node.id,
          workflow_id: workflowId,
          kind: node.kind,
          name: node.name,
          description: node.description,
          ui_config: node.ui_config,
          node_config: node.node_config,
          updated_at: new Date().toISOString(),
        })),
      );

    if (upsertNodesError) {
      console.error("Error upserting workflow nodes:", upsertNodesError);
      throw new Error("Failed to update workflow nodes");
    }
  }

  // Upsert edges if provided
  if (structure.edges && structure.edges.length > 0) {
    const { error: upsertEdgesError } = await supabase
      .from("workflow_edge")
      .upsert(
        structure.edges.map((edge) => ({
          id: edge.id,
          workflow_id: workflowId,
          source: edge.source,
          target: edge.target,
          ui_config: edge.ui_config,
        })),
      );

    if (upsertEdgesError) {
      console.error("Error upserting workflow edges:", upsertEdgesError);
      throw new Error("Failed to update workflow edges");
    }
  }
}

// ============================================================================
// WORKFLOW EXECUTION
// ============================================================================

/**
 * Execute a workflow (placeholder - actual implementation would depend on workflow executor)
 */
export async function executeWorkflow(
  workflowId: string,
  input: any,
): Promise<any> {
  const currentUser = await getSupabaseUser();
  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  // Check access first
  const hasAccess = await checkWorkflowAccess(workflowId, currentUser.id);
  if (!hasAccess) {
    throw new Error("Unauthorized to execute this workflow");
  }

  // Get workflow structure (will be used when execution logic is implemented)
  // const structure = await getWorkflowStructure(workflowId);

  // TODO: Implement workflow execution logic
  // This would integrate with the existing workflow executor
  // For now, return a placeholder response

  console.log("Executing workflow:", workflowId, "with input:", input);

  return {
    success: true,
    workflowId,
    executedAt: new Date(),
    // result: executionResult,
  };
}

/**
 * Get workflow execution history (placeholder)
 */
export async function getWorkflowExecutions(
  _workflowId: string,
): Promise<WorkflowExecution[]> {
  const currentUser = await getSupabaseUser();
  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  // TODO: Implement execution history tracking
  // For now, return empty array

  return [];
}

// ============================================================================
// WORKFLOW TOOLS (for agent tool selector)
// ============================================================================

/**
 * Get workflows that can be used as tools by agents
 */
export async function getWorkflowTools(
  userId: string,
): Promise<WorkflowTool[]> {
  const currentUser = await getSupabaseUser();
  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workflow")
    .select(`
      id, name, description, icon, visibility, is_published, user_id, updated_at,
      user:users!workflow_user_id_users_id_fk(name, image)
    `)
    .eq("is_published", true)
    .or(`user_id.eq.${userId},visibility.neq.private`)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching workflow tools:", error);
    throw new Error("Failed to fetch workflow tools");
  }

  return (data || []).map((row) => {
    const user = Array.isArray(row.user) ? row.user[0] : row.user;
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      icon: row.icon as any,
      visibility: row.visibility as Visibility,
      isPublished: row.is_published,
      userId: row.user_id,
      userName: user?.name || "",
      userAvatar: user?.image || undefined,
      updatedAt: new Date(row.updated_at),
    };
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get workflows by user ID
 */
export async function getWorkflowsByUserId(
  userId: string,
): Promise<Workflow[]> {
  const currentUser = await getSupabaseUser();
  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workflow")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching user workflows:", error);
    throw new Error("Failed to fetch user workflows");
  }

  return (data || []).map(rowToWorkflow);
}

/**
 * Get workflows that are executable by the user (for tool selector)
 */
export async function getExecutableWorkflows(
  userId: string,
): Promise<WorkflowSummary[]> {
  const currentUser = await getSupabaseUser();
  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workflow")
    .select(`
      id, name, description, icon, visibility, is_published, user_id, updated_at,
      user:users!workflow_user_id_users_id_fk(name, image)
    `)
    .eq("is_published", true)
    .or(`user_id.eq.${userId},visibility.neq.private`)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching executable workflows:", error);
    throw new Error("Failed to fetch executable workflows");
  }

  return (data || []).map((row) => {
    const user = Array.isArray(row.user) ? row.user[0] : row.user;
    return rowToWorkflowSummary({
      ...row,
      user_name: user?.name,
      user_avatar: user?.image,
    });
  });
}
