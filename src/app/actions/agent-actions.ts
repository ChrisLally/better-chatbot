"use server";

import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import {
  createAgent,
  getAgent,
  updateAgent,
  deleteAgent,
  checkAgentAccess,
} from "@/services/supabase/users-service";
import { revalidateTag, revalidatePath } from "next/cache";
import { Agent } from "@/types/agent";

/**
 * Server action to get a single agent by ID
 */
export async function getAgentAction(agentId: string): Promise<Agent | null> {
  try {
    const currentUser = await getSupabaseUser();
    if (!currentUser) {
      throw new Error("Unauthorized");
    }

    // Check if user has access to this agent
    const hasAccess = await checkAgentAccess(agentId, currentUser.id);
    if (!hasAccess) {
      throw new Error("Access denied");
    }

    const agent = await getAgent(agentId);
    return agent;
  } catch (error) {
    console.error("Error fetching agent:", error);
    throw new Error("Failed to fetch agent");
  }
}

/**
 * Server action to create a new agent
 */
export async function createAgentAction(agentData: {
  name: string;
  description?: string;
  icon?: any;
  instructions?: any;
  visibility?: "public" | "private" | "readonly";
}): Promise<
  { success: true; agentId: string } | { success: false; error: string }
> {
  const currentUser = await getSupabaseUser();
  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  try {
    const result = await createAgent({
      name: agentData.name,
      description: agentData.description,
      icon: agentData.icon,
      instructions: agentData.instructions,
      visibility: agentData.visibility || "private",
    });

    if (result.success) {
      // Revalidate agent lists
      revalidateTag("agents");
      revalidatePath("/agent");
    }

    return result;
  } catch (error) {
    console.error("Error creating agent:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create agent",
    };
  }
}

/**
 * Server action to update an existing agent
 */
export async function updateAgentAction(
  agentId: string,
  updates: {
    name?: string;
    description?: string | null;
    icon?: any;
    instructions?: any;
    visibility?: "public" | "private" | "readonly";
  },
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await getSupabaseUser();
  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  try {
    // Allow any authenticated user to update agents (until workspaces are added)
    // TODO: Add access control when implementing workspaces/organizations

    await updateAgent(agentId, updates);

    // Revalidate caches
    revalidateTag("agents");
    revalidateTag(`agent-${agentId}`);
    revalidatePath("/agents");
    revalidatePath(`/agent/${agentId}`);

    return { success: true };
  } catch (error) {
    console.error("Error updating agent:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update agent",
    };
  }
}

/**
 * Server action to delete an agent
 */
export async function deleteAgentAction(
  agentId: string,
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await getSupabaseUser();
  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  try {
    // Allow any authenticated user to delete agents (until workspaces are added)
    // TODO: Add access control when implementing workspaces/organizations

    await deleteAgent(agentId);

    // Revalidate caches
    revalidateTag("agents");
    revalidateTag(`agent-${agentId}`);
    revalidatePath("/agents");
    revalidatePath(`/agent/${agentId}`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting agent:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete agent",
    };
  }
}

/**
 * Server action to duplicate an agent
 */
export async function duplicateAgentAction(
  agentId: string,
  newName?: string,
): Promise<
  { success: true; agentId: string } | { success: false; error: string }
> {
  try {
    const currentUser = await getSupabaseUser();
    if (!currentUser) {
      throw new Error("Unauthorized");
    }

    // Allow any authenticated user to duplicate agents (until workspaces are added)
    // TODO: Add access control when implementing workspaces/organizations

    const originalAgent = await getAgent(agentId);
    if (!originalAgent) {
      throw new Error("Agent not found");
    }

    // Create new agent with duplicated data
    const result = await createAgent({
      name: newName || `${originalAgent.name} (Copy)`,
      description: originalAgent.description,
      icon: originalAgent.icon,
      instructions: originalAgent.instructions,
      visibility: "private", // Always make duplicates private
    });

    if (result.success) {
      // Revalidate agent list caches
      revalidateTag("agents");
      revalidatePath("/agents");
    }

    return result;
  } catch (error) {
    console.error("Error duplicating agent:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to duplicate agent",
    };
  }
}

/**
 * Server action for AI-powered agent generation
 */
export async function generateAgentWithAIAction(prompt: string): Promise<
  | {
      success: true;
      agent: {
        name: string;
        description: string;
        instructions: string;
        role: string;
        tools: string[];
      };
    }
  | { success: false; error: string }
> {
  const currentUser = await getSupabaseUser();
  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  try {
    const { generateObject } = await import("ai");
    const { customModelProvider } = await import("@/lib/ai/models");
    const { AgentGenerateSchema } = await import("app-types/agent");

    const model = customModelProvider.getModel({
      provider: "openai",
      model: "chat-model-small",
    });

    const result = await generateObject({
      model,
      schema: AgentGenerateSchema,
      prompt: `Generate an AI agent based on this description: ${prompt}`,
    });

    if (!result.object) {
      return {
        success: false,
        error: "Failed to generate agent",
      };
    }

    return {
      success: true,
      agent: result.object,
    };
  } catch (error) {
    console.error("Error generating agent with AI:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to generate agent",
    };
  }
}
