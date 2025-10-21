"use server";

import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import {
  getExecutableWorkflows,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  getWorkflow,
  getWorkflows,
  updateWorkflowStructure,
  executeWorkflow,
} from "@/services/supabase/workflow-service";
import { z } from "zod";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateWorkflowSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().optional(),
  icon: z.any().optional(),
  visibility: z.enum(["public", "private", "readonly"]).default("private"),
  isPublished: z.boolean().default(false),
});

const UpdateWorkflowSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  icon: z.any().optional(),
  visibility: z.enum(["public", "private", "readonly"]).optional(),
  isPublished: z.boolean().optional(),
});

const UpdateWorkflowStructureSchema = z.object({
  nodes: z.array(z.any()).optional(),
  edges: z.array(z.any()).optional(),
  deleteNodes: z.array(z.string()).optional(),
  deleteEdges: z.array(z.string()).optional(),
});

const ExecuteWorkflowSchema = z.object({
  query: z.any(),
});

// ============================================================================
// SERVER ACTIONS
// ============================================================================

/**
 * Get workflows that can be executed as tools
 */
export async function selectExecuteAbilityWorkflowsAction() {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      return [];
    }

    return await getExecutableWorkflows(user.id);
  } catch (error) {
    console.error("Error fetching executable workflows:", error);
    return [];
  }
}

/**
 * Get all workflows for the current user
 */
export async function getWorkflowsAction(filters?: {
  visibility?: ("public" | "private" | "readonly")[];
  ownership?: ("mine" | "shared")[];
  search?: string;
  limit?: number;
}) {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    return await getWorkflows(user.id, filters);
  } catch (error) {
    console.error("Error fetching workflows:", error);
    throw error;
  }
}

/**
 * Get a single workflow by ID
 */
export async function getWorkflowAction(workflowId: string) {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Allow any authenticated user to view workflows (until workspaces are added)
    // TODO: Add access control when implementing workspaces/organizations

    const workflow = await getWorkflow(workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }

    return workflow;
  } catch (error) {
    console.error("Error fetching workflow:", error);
    throw error;
  }
}

/**
 * Create a new workflow
 */
export async function createWorkflowAction(
  data: z.infer<typeof CreateWorkflowSchema>,
) {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Validate data
    const validatedData = CreateWorkflowSchema.parse(data);

    return await createWorkflow({
      name: validatedData.name,
      description: validatedData.description,
      icon: validatedData.icon,
      visibility: validatedData.visibility,
      isPublished: validatedData.isPublished,
    });
  } catch (error) {
    console.error("Error creating workflow:", error);
    throw error;
  }
}

/**
 * Update an existing workflow
 */
export async function updateWorkflowAction(
  workflowId: string,
  updates: z.infer<typeof UpdateWorkflowSchema>,
) {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Allow any authenticated user to update workflows (until workspaces are added)
    // TODO: Add access control when implementing workspaces/organizations

    // Validate updates
    const validatedUpdates = UpdateWorkflowSchema.parse(updates);

    return await updateWorkflow(workflowId, validatedUpdates);
  } catch (error) {
    console.error("Error updating workflow:", error);
    throw error;
  }
}

/**
 * Delete a workflow
 */
export async function deleteWorkflowAction(workflowId: string) {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Allow any authenticated user to delete workflows (until workspaces are added)
    // TODO: Add access control when implementing workspaces/organizations

    await deleteWorkflow(workflowId);
    return { success: true };
  } catch (error) {
    console.error("Error deleting workflow:", error);
    throw error;
  }
}

/**
 * Update workflow structure
 */
export async function updateWorkflowStructureAction(
  workflowId: string,
  structure: z.infer<typeof UpdateWorkflowStructureSchema>,
) {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Allow any authenticated user to update workflow structure (until workspaces are added)
    // TODO: Add access control when implementing workspaces/organizations

    // Validate structure
    const validatedStructure = UpdateWorkflowStructureSchema.parse(structure);

    await updateWorkflowStructure(workflowId, validatedStructure);
    return { success: true };
  } catch (error) {
    console.error("Error updating workflow structure:", error);
    throw error;
  }
}

/**
 * Execute a workflow
 */
export async function executeWorkflowAction(
  workflowId: string,
  input: z.infer<typeof ExecuteWorkflowSchema>,
) {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Allow any authenticated user to execute workflows (until workspaces are added)
    // TODO: Add access control when implementing workspaces/organizations

    // Validate input
    const validatedInput = ExecuteWorkflowSchema.parse(input);

    return await executeWorkflow(workflowId, validatedInput.query);
  } catch (error) {
    console.error("Error executing workflow:", error);
    throw error;
  }
}
