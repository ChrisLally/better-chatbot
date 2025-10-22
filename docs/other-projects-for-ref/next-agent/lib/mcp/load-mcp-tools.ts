/**
 * Load MCP tools and convert them to Vercel AI SDK Tool format
 */

import { Tool } from "ai";
import { mcpManager } from "./mcp-manager";
import { updateActiveObservation, updateActiveTrace } from "@langfuse/tracing";

export interface MCPToolMeta {
  _mcpServerId: string;
  _mcpServerName: string;
  _originToolName: string;
}

export type MCPTool = Tool & MCPToolMeta;

/**
 * Load all tools from configured MCP servers
 */
export async function loadMCPTools(options?: {
  serverIds?: string[];
}): Promise<Record<string, MCPTool>> {
  const tools: Record<string, MCPTool> = {};

  try {
    const servers = await mcpManager.listServers();

    for (const server of servers) {
      if (server.disabled) {
        continue;
      }

      // Filter by specific server IDs if provided
      if (options?.serverIds && !options.serverIds.includes(server.id)) {
        continue;
      }

      try {
        const serverTools = await mcpManager.getServerTools(server.id);

        if (!serverTools || typeof serverTools !== "object") {
          continue;
        }

        // Convert MCP tools to Vercel AI SDK tools
        for (const [toolName, toolDef] of Object.entries(serverTools)) {
          const toolId = `${server.id}:${toolName}`;

          const tool: MCPTool = {
            description: (toolDef as any)?.description || `Tool: ${toolName}`,
            parameters: (toolDef as any)?.inputSchema || {},
            execute: async (input: unknown) => {
              try {
                // Log tool call to Langfuse
                updateActiveObservation({
                  metadata: {
                    mcpServerName: server.name,
                    mcpServerId: server.id,
                    toolName: toolName,
                    toolId: toolId,
                    input: input,
                  },
                });

                console.log(
                  `[MCP Tool] Calling ${server.name}:${toolName}`,
                  input,
                );

                const result = await mcpManager.callTool(
                  server.id,
                  toolName,
                  input,
                );

                // Log result to Langfuse
                updateActiveObservation({
                  metadata: {
                    mcpServerName: server.name,
                    mcpServerId: server.id,
                    toolName: toolName,
                    toolId: toolId,
                    result: result,
                  },
                });

                console.log(
                  `[MCP Tool] Result from ${server.name}:${toolName}`,
                  result,
                );

                return result;
              } catch (error) {
                // Log error to Langfuse
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                updateActiveObservation({
                  output: `Tool error in ${toolId}: ${errorMessage}`,
                  level: "ERROR",
                  metadata: {
                    mcpServerName: server.name,
                    mcpServerId: server.id,
                    toolName: toolName,
                    toolId: toolId,
                    error: errorMessage,
                  },
                });

                console.error(
                  `[MCP Tool] Error in ${server.name}:${toolName}`,
                  error,
                );

                throw error;
              }
            },
            // MCP metadata for tracking
            _mcpServerId: server.id,
            _mcpServerName: server.name,
            _originToolName: toolName,
          };

          tools[toolId] = tool;
        }
      } catch (error) {
        console.error(
          `Error loading tools from MCP server ${server.name}:`,
          error,
        );
      }
    }
  } catch (error) {
    console.error("Error loading MCP tools:", error);
  }

  return tools;
}

/**
 * Get tools from a specific MCP server
 */
export async function loadMCPToolsFromServer(
  serverId: string,
): Promise<Record<string, MCPTool>> {
  return loadMCPTools({ serverIds: [serverId] });
}
