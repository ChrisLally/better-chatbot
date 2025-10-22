import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { Tables } from "@/types/supabase";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Agent, AgentSummary } from "app-types/agent";

export type User = Tables<"users">;

// Helper to get all user fields including agent-specific ones
const USER_FIELDS =
  "id, name, email, image, user_type, preferences, created_at, updated_at, description, icon, instructions, visibility";

/**
 * Convert user row to Agent type
 * Agents are users with user_type='agent' plus agent-specific fields
 */
function userToAgent(user: User): Agent {
  return {
    id: user.id,
    name: user.name,
    description: (user as any).description ?? undefined,
    icon: (user as any).icon as any,
    instructions: (user as any).instructions as any,
    userId: user.id, // For agents, userId is the same as id
    visibility: ((user as any).visibility || "private") as
      | "public"
      | "private"
      | "readonly",
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.updated_at),
  };
}

/**
 * Convert user row to AgentSummary type (without instructions)
 */
function userToAgentSummary(user: any): AgentSummary {
  return {
    id: user.id,
    name: user.name,
    description: user.description ?? undefined,
    icon: user.icon as any,
    userId: user.id,
    visibility: (user.visibility || "private") as
      | "public"
      | "private"
      | "readonly",
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.updated_at),
  };
}

// ============================================================================
// USER FUNCTIONS
// ============================================================================

export async function getUsers(): Promise<User[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select(USER_FIELDS)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching users:", error);
    throw new Error("Failed to fetch users");
  }

  return data || [];
}

export async function getUsersByType(
  userType: "human" | "agent",
  supabaseClient?: any,
): Promise<User[]> {
  const supabase = supabaseClient || (await createClient());

  const { data, error } = await supabase
    .from("users")
    .select(USER_FIELDS)
    .eq("user_type", userType)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching users by type:", error);
    throw new Error("Failed to fetch users by type");
  }

  return data || [];
}

export async function getUser(
  userId: string,
  supabaseClient?: any,
): Promise<User | null> {
  const supabase = supabaseClient || (await createClient());

  const { data, error } = await supabase
    .from("users")
    .select(USER_FIELDS)
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // No matching row found
    }
    console.error("Error fetching user:", error);
    throw new Error("Failed to fetch user");
  }

  return data;
}

// ============================================================================
// AGENT FUNCTIONS (agents are users with user_type='agent')
// ============================================================================

/**
 * Create a new agent user using Supabase Admin API
 * Agents are users with user_type='agent' and programmatic auth
 */
export async function createAgent(options: {
  name?: string;
  description?: string;
  icon?: any;
  instructions?: any;
  visibility?: "public" | "private" | "readonly";
}): Promise<
  { success: true; agentId: string } | { success: false; error: string }
> {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Create agent in auth.users
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: `agent-${Date.now()}@unison.agents`,
        password: crypto.randomUUID(),
        email_confirm: true,
        user_metadata: {
          user_type: "agent",
          name: options.name || "Unison Agent",
          description: options.description,
          icon: options.icon,
          instructions: options.instructions,
          visibility: options.visibility || "private",
        },
      });

    if (authError || !authUser.user) {
      return {
        success: false,
        error: `Failed to create auth user: ${authError?.message}`,
      };
    }

    // Update the user row in public.users table with agent-specific fields
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        name: options.name || "Unison Agent",
        description: options.description || null,
        icon: options.icon || null,
        instructions: options.instructions || null,
        visibility: options.visibility || "private",
        user_type: "agent",
      })
      .eq("id", authUser.user.id);

    if (updateError) {
      console.error("Error updating agent in public.users:", updateError);
      return {
        success: false,
        error: `Failed to save agent details: ${updateError.message}`,
      };
    }

    return { success: true, agentId: authUser.user.id };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Get agent by ID (returns Agent type with all fields)
 */
export async function getAgent(agentId: string): Promise<Agent | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select(USER_FIELDS)
    .eq("id", agentId)
    .eq("user_type", "agent")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching agent:", error);
    throw new Error("Failed to fetch agent");
  }

  return userToAgent(data);
}

/**
 * Get all agents (users with user_type='agent')
 */
export async function getAgents(
  filters: {
    visibility?: "public" | "private" | "readonly";
    ownerId?: string;
    limit?: number;
  } = {},
): Promise<AgentSummary[]> {
  const supabase = await createClient();

  let query = supabase
    .from("users")
    .select(
      "id, name, email, image, user_type, created_at, updated_at, description, icon, visibility",
    )
    .eq("user_type", "agent");

  if (filters.visibility) {
    query = query.eq("visibility", filters.visibility);
  }

  if (filters.ownerId) {
    query = query.eq("id", filters.ownerId);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching agents:", error);
    throw new Error("Failed to fetch agents");
  }

  return (data || []).map(userToAgentSummary);
}

/**
 * Get agents with advanced filtering
 */
export async function selectAgents(
  _userId: string,
  _filters: ("all" | "mine" | "shared" | "bookmarked")[] = ["mine", "shared"],
  limit?: number,
): Promise<AgentSummary[]> {
  const supabase = await createClient();

  let query = supabase
    .from("users")
    .select(
      "id, name, email, image, user_type, created_at, updated_at, description, icon, visibility",
    )
    .eq("user_type", "agent");

  // TODO: Temporarily show all agents for development - proper filtering not yet implemented
  // Apply filters
  // if (filters.includes("mine")) {
  //   query = query.eq("id", userId); // Assuming 'id' is the owner ID for agents
  // }
  // TODO: Implement 'shared' and 'bookmarked' filters when relevant relationships are established

  if (limit) {
    query = query.limit(limit);
  }

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching agents:", error);
    throw new Error("Failed to fetch agents");
  }

  return (data || []).map(userToAgentSummary);
}

/**
 * Update an agent
 */
export async function updateAgent(
  agentId: string,
  updates: {
    name?: string;
    description?: string | null;
    icon?: any;
    instructions?: any;
    visibility?: "public" | "private" | "readonly";
  },
): Promise<Agent> {
  const supabase = await createClient();

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined)
    updateData.description = updates.description;
  if (updates.icon !== undefined) updateData.icon = updates.icon;
  if (updates.instructions !== undefined)
    updateData.instructions = updates.instructions;
  if (updates.visibility !== undefined)
    updateData.visibility = updates.visibility;

  const { data, error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", agentId)
    .eq("user_type", "agent")
    .select(USER_FIELDS)
    .single();

  if (error) {
    console.error("Error updating agent:", error);
    throw new Error("Failed to update agent");
  }

  return userToAgent(data);
}

/**
 * Delete an agent
 */
export async function deleteAgent(agentId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("users")
    .delete()
    .eq("id", agentId)
    .eq("user_type", "agent");

  if (error) {
    console.error("Error deleting agent:", error);
    throw new Error("Failed to delete agent");
  }
}

/**
 * Check if user has access to an agent
 */
export async function checkAgentAccess(
  agentId: string,
  userId: string,
  _destructive: boolean = false,
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, visibility")
    .eq("id", agentId)
    .eq("user_type", "agent")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return false; // Agent not found
    }
    console.error("Error checking agent access:", error);
    throw new Error("Failed to check agent access");
  }

  // User owns the agent
  if (data.id === userId) {
    return true;
  }

  // Public agents are accessible to everyone
  if ((data as any).visibility === "public") {
    return true;
  }

  return false;
}

/**
 * Get cached agent JWT from database or generate new one if expired
 */
export async function getCachedAgentJWT(
  agentId: string,
): Promise<string | null> {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const adminClient = createSupabaseClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Check if we have a valid cached JWT
    const { data: agent, error: fetchError } = await adminClient
      .from("users")
      .select("agent_jwt, agent_jwt_expires_at, agent_email")
      .eq("id", agentId)
      .eq("user_type", "agent")
      .single();

    if (fetchError) {
      console.error("Error fetching agent JWT cache:", fetchError);
      return null;
    }

    const now = new Date();
    const expiresAt = agent.agent_jwt_expires_at
      ? new Date(agent.agent_jwt_expires_at)
      : null;

    // Check if we have a valid cached JWT (expires in more than 5 minutes)
    if (
      agent.agent_jwt &&
      expiresAt &&
      expiresAt.getTime() > now.getTime() + 5 * 60 * 1000
    ) {
      console.log("Using cached agent JWT for agent:", agentId);
      return agent.agent_jwt;
    }

    // Generate new JWT
    console.log("Generating new agent JWT for agent:", agentId);

    // Use agent email or generate one
    const agentEmail = agent.agent_email || `agent-${Date.now()}@team.gen`;

    // Generate magic link
    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: agentEmail,
      });

    if (linkError || !linkData) {
      console.error("Failed to generate magic link:", linkError);
      return null;
    }

    // Create regular client for verification
    const regularClient = createSupabaseClient(
      SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    // Verify the OTP to get agent session
    const { data: sessionData, error: sessionError } =
      await regularClient.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: "email",
      });

    if (sessionError || !sessionData.session) {
      console.error("Failed to create agent session:", sessionError);
      return null;
    }

    const jwt = sessionData.session.access_token;
    const expiresAtTimestamp = sessionData.session.expires_at
      ? new Date(sessionData.session.expires_at * 1000)
      : null;

    // Cache the JWT in the database
    await adminClient
      .from("users")
      .update({
        agent_jwt: jwt,
        agent_jwt_expires_at: expiresAtTimestamp?.toISOString(),
        agent_email: agentEmail,
      })
      .eq("id", agentId);

    console.log(
      "Cached new agent JWT for agent:",
      agentId,
      "expires at:",
      expiresAtTimestamp?.toISOString(),
    );

    return jwt;
  } catch (error) {
    console.error("Error in getCachedAgentJWT:", error);
    return null;
  }
}

// ============================================================================
// DEPRECATED / LEGACY FUNCTIONS
// ============================================================================

export async function getUsersByTeam(_teamId: string): Promise<User[]> {
  console.warn("Team functionality not supported in current schema");
  return [];
}

export async function getUsersByWorkspace(
  _workspaceId: string,
): Promise<User[]> {
  console.warn("Workspace functionality not supported in current schema");
  return [];
}

export async function findAgents(
  level: "workspace" | "team" | "project" | "chat",
  _scopeId: string,
  _supabaseClient?: any,
): Promise<User[]> {
  console.warn(`Agent discovery for ${level} not supported in current schema`);
  return [];
}

// ============================================================================
// USER PROFILE
// ============================================================================

export type UserFullProfile = User & {
  permissions?: {
    chats_create?: boolean;
    chats_add_members?: boolean;
    chats_remove_members?: boolean;
    teams_create?: boolean;
    teams_add_members?: boolean;
    teams_remove_members?: boolean;
    teams_delete?: boolean;
    projects_create?: boolean;
    projects_update?: boolean;
    projects_delete?: boolean;
    tasks_create?: boolean;
    tasks_update?: boolean;
    tasks_delete?: boolean;
    tasks_assign?: boolean;
    workspace_update?: boolean;
    workspace_manage_members?: boolean;
    agent_users_create?: boolean;
    agent_users_configure?: boolean;
    tools_create?: boolean;
    tools_execute_sandbox?: boolean;
    tools_manage?: boolean;
  } | null;
  tools?: Array<{
    id: string;
    name: string;
    description: string | null;
    requires_sandbox: boolean;
  }> | null;
  recent_messages?: Array<{
    id: string;
    content: string;
    created_at: string;
    chat_id: string;
    chat_name?: string | null;
  }> | null;
  recent_tasks?: Array<{
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string | null;
    created_at: string;
    project_id: string;
    project_name?: string | null;
  }> | null;
};

export async function getUserFullProfile(
  userId: string,
  options?: {
    includeActivity?: boolean;
    activityLimit?: number;
  },
  supabaseClient?: any,
): Promise<UserFullProfile | null> {
  const supabase = supabaseClient || (await createClient());
  const includeActivity = options?.includeActivity ?? true;

  const user = await getUser(userId, supabase);
  if (!user) {
    return null;
  }

  const permissions = null;
  const tools = null;
  const recentMessages = null;
  const recentTasks = null;

  if (includeActivity) {
    console.warn("User activity tracking not supported in current schema");
  }

  return {
    ...user,
    permissions,
    tools,
    recent_messages: recentMessages,
    recent_tasks: recentTasks,
  };
}
