import "server-only";

import { createClient } from "@/lib/supabase/server";
import { Tables, Database } from "@/types/supabase";
import type { MCPServerConfig } from "app-types/mcp";

/**
 * MCP Service
 * Handles MCP server, OAuth session, and customization operations
 * Pattern 2: Creates client internally, does not accept client as parameter
 */

// Type exports
export type McpServerRow = Tables<"mcp_server">;
export type McpOAuthSessionRow = Tables<"mcp_oauth_session">;
export type McpServerCustomInstructionsRow =
  Tables<"mcp_server_custom_instructions">;
export type McpToolCustomInstructionsRow =
  Tables<"mcp_server_tool_custom_instructions">;

export type McpServerInsert =
  Database["public"]["Tables"]["mcp_server"]["Insert"];
export type McpServerUpdate =
  Database["public"]["Tables"]["mcp_server"]["Update"];

// Extended type with user info for display
export interface McpServerWithUser extends McpServerRow {
  userName?: string | null;
  userAvatar?: string | null;
}

// ============================================
// MCP SERVER OPERATIONS
// ============================================

/**
 * Save (create or update) an MCP server
 */
export async function saveMcpServer(server: {
  id?: string;
  name: string;
  config: MCPServerConfig;
  userId: string;
  visibility?: string;
  enabled?: boolean;
}): Promise<McpServerRow> {
  const supabase = await createClient();

  const serverData = {
    id: server.id,
    name: server.name,
    config: server.config as any,
    user_id: server.userId,
    visibility: server.visibility ?? "private",
    enabled: server.enabled ?? true,
  };

  if (server.id) {
    // Update existing server
    const { data, error } = await supabase
      .from("mcp_server")
      .update({
        config: serverData.config,
        updated_at: new Date().toISOString(),
      })
      .eq("id", server.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // Insert new server
    const { data, error } = await supabase
      .from("mcp_server")
      .insert(serverData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

/**
 * Get MCP server by ID
 */
export async function getMcpServerById(
  id: string,
): Promise<McpServerRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("mcp_server")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }

  return data;
}

/**
 * Get all MCP servers
 */
export async function getAllMcpServers(): Promise<McpServerRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("mcp_server")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get all MCP servers for a specific user (includes own + public)
 */
export async function getMcpServersForUser(
  userId: string,
): Promise<McpServerWithUser[]> {
  const supabase = await createClient();

  // Get user's own MCP servers and public ones
  const { data, error } = await supabase
    .from("mcp_server")
    .select(`
      *,
      user:users!mcp_server_user_id_users_id_fk (
        name,
        image
      )
    `)
    .or(`user_id.eq.${userId},visibility.eq.public`)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Transform the data to include user info at the top level
  return data.map((server: any) => ({
    ...server,
    userName: server.user?.name,
    userAvatar: server.user?.image,
    user: undefined, // Remove nested user object
  }));
}

/**
 * Update MCP server visibility
 */
export async function updateMcpServerVisibility(
  id: string,
  visibility: "public" | "private",
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("mcp_server")
    .update({
      visibility,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Delete MCP server by ID
 */
export async function deleteMcpServer(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("mcp_server").delete().eq("id", id);

  if (error) throw error;
}

/**
 * Get MCP server by name
 */
export async function getMcpServerByName(
  name: string,
): Promise<McpServerRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("mcp_server")
    .select("*")
    .eq("name", name)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }

  return data;
}

/**
 * Check if MCP server exists by name
 */
export async function mcpServerExistsByName(name: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("mcp_server")
    .select("id")
    .eq("name", name)
    .single();

  if (error) {
    if (error.code === "PGRST116") return false; // Not found
    throw error;
  }

  return !!data;
}

// ============================================
// MCP OAUTH SESSION OPERATIONS
// ============================================

/**
 * Get authenticated OAuth session (with tokens) for MCP server
 */
export async function getAuthenticatedMcpOAuthSession(
  mcpServerId: string,
): Promise<McpOAuthSessionRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("mcp_oauth_session")
    .select("*")
    .eq("mcp_server_id", mcpServerId)
    .not("tokens", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }

  return data;
}

/**
 * Get OAuth session by state (for callback handling)
 */
export async function getMcpOAuthSessionByState(
  state: string,
): Promise<McpOAuthSessionRow | null> {
  if (!state) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("mcp_oauth_session")
    .select("*")
    .eq("state", state)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }

  return data;
}

/**
 * Create new OAuth session
 */
export async function createMcpOAuthSession(
  mcpServerId: string,
  sessionData: {
    serverUrl: string;
    state?: string | null;
    codeVerifier?: string | null;
    clientInfo?: any;
    tokens?: any;
  },
): Promise<McpOAuthSessionRow> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("mcp_oauth_session")
    .insert({
      mcp_server_id: mcpServerId,
      server_url: sessionData.serverUrl,
      state: sessionData.state ?? null,
      code_verifier: sessionData.codeVerifier ?? null,
      client_info: sessionData.clientInfo ?? null,
      tokens: sessionData.tokens ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update OAuth session by state
 */
export async function updateMcpOAuthSessionByState(
  state: string,
  updates: {
    serverUrl?: string;
    codeVerifier?: string | null;
    clientInfo?: any;
    tokens?: any;
  },
): Promise<McpOAuthSessionRow> {
  const supabase = await createClient();

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.serverUrl !== undefined)
    updateData.server_url = updates.serverUrl;
  if (updates.codeVerifier !== undefined)
    updateData.code_verifier = updates.codeVerifier;
  if (updates.clientInfo !== undefined)
    updateData.client_info = updates.clientInfo;
  if (updates.tokens !== undefined) updateData.tokens = updates.tokens;

  const { data, error } = await supabase
    .from("mcp_oauth_session")
    .update(updateData)
    .eq("state", state)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Save tokens and cleanup old sessions
 */
export async function saveMcpOAuthTokensAndCleanup(
  state: string,
  mcpServerId: string,
  updates: {
    tokens: any;
    clientInfo?: any;
  },
): Promise<McpOAuthSessionRow> {
  const supabase = await createClient();

  // Update session with tokens
  const { data, error } = await supabase
    .from("mcp_oauth_session")
    .update({
      tokens: updates.tokens,
      client_info: updates.clientInfo ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("state", state)
    .select()
    .single();

  if (error) throw error;

  // Clean up old sessions without tokens for this server (except current one)
  await supabase
    .from("mcp_oauth_session")
    .delete()
    .eq("mcp_server_id", mcpServerId)
    .is("tokens", null)
    .neq("state", state);

  return data;
}

/**
 * Delete OAuth session by state
 */
export async function deleteMcpOAuthSessionByState(
  state: string,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("mcp_oauth_session")
    .delete()
    .eq("state", state);

  if (error) throw error;
}

// ============================================
// MCP SERVER CUSTOM INSTRUCTIONS
// ============================================

/**
 * Get server custom instructions
 */
export async function getMcpServerCustomInstructions(
  mcpServerId: string,
  userId: string,
): Promise<McpServerCustomInstructionsRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("mcp_server_custom_instructions")
    .select("*")
    .eq("mcp_server_id", mcpServerId)
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }

  return data;
}

/**
 * Upsert server custom instructions
 */
export async function upsertMcpServerCustomInstructions(
  mcpServerId: string,
  userId: string,
  prompt: string | null,
): Promise<McpServerCustomInstructionsRow> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("mcp_server_custom_instructions")
    .upsert(
      {
        mcp_server_id: mcpServerId,
        user_id: userId,
        prompt,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,mcp_server_id",
      },
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete server custom instructions
 */
export async function deleteMcpServerCustomInstructions(
  mcpServerId: string,
  userId: string,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("mcp_server_custom_instructions")
    .delete()
    .eq("mcp_server_id", mcpServerId)
    .eq("user_id", userId);

  if (error) throw error;
}

// ============================================
// MCP TOOL CUSTOM INSTRUCTIONS
// ============================================

/**
 * Get all tool customizations for a server and user
 */
export async function getMcpToolCustomInstructions(
  mcpServerId: string,
  userId: string,
): Promise<McpToolCustomInstructionsRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("mcp_server_tool_custom_instructions")
    .select("*")
    .eq("mcp_server_id", mcpServerId)
    .eq("user_id", userId);

  if (error) throw error;
  return data;
}

/**
 * Get specific tool customization
 */
export async function getMcpToolCustomInstruction(
  mcpServerId: string,
  userId: string,
  toolName: string,
): Promise<McpToolCustomInstructionsRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("mcp_server_tool_custom_instructions")
    .select("*")
    .eq("mcp_server_id", mcpServerId)
    .eq("user_id", userId)
    .eq("tool_name", toolName)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }

  return data;
}

/**
 * Upsert tool custom instructions
 */
export async function upsertMcpToolCustomInstructions(
  mcpServerId: string,
  userId: string,
  toolName: string,
  prompt: string | null,
): Promise<McpToolCustomInstructionsRow> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("mcp_server_tool_custom_instructions")
    .upsert(
      {
        mcp_server_id: mcpServerId,
        user_id: userId,
        tool_name: toolName,
        prompt,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,tool_name,mcp_server_id",
      },
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete tool custom instructions
 */
export async function deleteMcpToolCustomInstructions(
  mcpServerId: string,
  userId: string,
  toolName: string,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("mcp_server_tool_custom_instructions")
    .delete()
    .eq("mcp_server_id", mcpServerId)
    .eq("user_id", userId)
    .eq("tool_name", toolName);

  if (error) throw error;
}
