"use server";

import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import {
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  updateWorkflowStructure,
  executeWorkflow,
  getExecutableWorkflows,
} from "@/services/supabase/workflow-service";
import { z } from "zod";
import { revalidateTag } from "next/cache";

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
 * Get all executable workflows for the current user
 */
export async function getExecutableWorkflowsAction() {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    return await getExecutableWorkflows(user.id);
  } catch (error) {
    console.error("Error fetching executable workflows:", error);
    throw new Error("Failed to fetch executable workflows");
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

    const newWorkflow = await createWorkflow(user.id, {
      name: validatedData.name,
      description: validatedData.description,
      icon: validatedData.icon,
      visibility: validatedData.visibility,
      isPublished: validatedData.isPublished,
    });
    revalidateTag("workflows");
    return newWorkflow;
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

    const updatedWorkflow = await updateWorkflow(workflowId, validatedUpdates);
    revalidateTag("workflows");
    revalidateTag(`workflow-${workflowId}`);
    return updatedWorkflow;
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
    revalidateTag("workflows");
    revalidateTag(`workflow-${workflowId}`);
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
    revalidateTag(`workflow-structure-${workflowId}`);
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

    return await executeWorkflow(user.id, workflowId, validatedInput.query);
  } catch (error) {
    console.error("Error executing workflow:", error);
    throw error;
  }
}
