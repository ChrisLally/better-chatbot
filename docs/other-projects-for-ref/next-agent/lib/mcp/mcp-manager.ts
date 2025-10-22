/**
 * Simplified MCP Manager for next-agent
 * Uses the MCP SDK to connect to MCP servers
 */

import {
  createMemoryMCPConfigStorage,
  type MCPServerConfig,
} from "./memory-storage";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

declare global {
  // eslint-disable-next-line no-var
  var __nextAgentMCPManager__: SimpleMCPManager;
}

export class SimpleMCPManager {
  private clients: Map<
    string,
    {
      serverConfig: MCPServerConfig;
      isConnected: boolean;
    }
  > = new Map();

  private storage = createMemoryMCPConfigStorage();

  constructor() {
    // Initialize storage
    this.storage.init();
  }

  /**
   * Add an MCP server configuration
   */
  async addServer(config: MCPServerConfig): Promise<MCPServerConfig> {
    const saved = await this.storage.save(config);
    this.clients.set(config.id, {
      serverConfig: saved,
      isConnected: false,
    });
    return saved;
  }

  /**
   * Get all configured MCP servers
   */
  async listServers(): Promise<MCPServerConfig[]> {
    return this.storage.loadAll();
  }

  /**
   * Get a specific MCP server config
   */
  async getServer(id: string): Promise<MCPServerConfig | null> {
    return this.storage.get(id);
  }

  /**
   * Create MCP client for a server
   */
  private async createMCPClient(serverId: string) {
    const serverConfig = await this.getServer(serverId);
    if (!serverConfig) {
      throw new Error(`MCP server ${serverId} not found`);
    }

    const client = new Client({
      name: serverConfig.name,
      version: "1.0.0",
    });

    if (serverConfig.type === "stdio") {
      const transport = new StdioClientTransport({
        command: serverConfig.command,
        args: serverConfig.args || [],
        env: serverConfig.env,
      });
      await client.connect(transport);
    } else if (serverConfig.type === "sse") {
      const transport = new SSEClientTransport(serverConfig.command); // URL for SSE
      await client.connect(transport);
    } else {
      throw new Error(`Unsupported MCP transport type: ${serverConfig.type}`);
    }

    return client;
  }

  /**
   * Get tools from an MCP server
   */
  async getServerTools(serverId: string) {
    let client: Client | null = null;
    try {
      client = await this.createMCPClient(serverId);

      // Use the client's listTools method
      const toolsResponse = await client.listTools();

      // Convert MCP tools to a record
      const tools: Record<string, any> = {};
      if (
        toolsResponse &&
        toolsResponse.tools &&
        Array.isArray(toolsResponse.tools)
      ) {
        toolsResponse.tools.forEach((tool: any) => {
          tools[tool.name] = {
            description: tool.description,
            inputSchema: tool.inputSchema,
          };
        });
      }

      return tools;
    } catch (error) {
      console.error(`Error getting tools from MCP server ${serverId}:`, error);
      return {};
    } finally {
      if (client) {
        try {
          await client.close();
        } catch (err) {
          console.error(`Error closing MCP client for ${serverId}:`, err);
        }
      }
    }
  }

  /**
   * Call a tool on an MCP server
   */
  async callTool(serverId: string, toolName: string, input: unknown) {
    let client: Client | null = null;
    try {
      client = await this.createMCPClient(serverId);

      // Call the tool using the client's callTool method
      const response = await client.callTool({
        name: toolName,
        arguments: input as Record<string, unknown>,
      });

      return response;
    } catch (error) {
      console.error(
        `Error calling tool ${toolName} on MCP server ${serverId}:`,
        error,
      );
      throw error;
    } finally {
      if (client) {
        try {
          await client.close();
        } catch (err) {
          console.error(`Error closing MCP client for ${serverId}:`, err);
        }
      }
    }
  }

  /**
   * Cleanup all connections
   */
  async cleanup(): Promise<void> {
    for (const [, clientInfo] of this.clients) {
      try {
        if (clientInfo.isConnected) {
          // Cleanup logic here if needed
          clientInfo.isConnected = false;
        }
      } catch (error) {
        console.error("Error during MCP cleanup:", error);
      }
    }
    this.clients.clear();
  }
}

// Singleton instance
if (!globalThis.__nextAgentMCPManager__) {
  globalThis.__nextAgentMCPManager__ = new SimpleMCPManager();
}

export const mcpManager = globalThis.__nextAgentMCPManager__;

export const initMCPManager = async () => {
  // Initialize with default servers if needed
  // For now, just return the manager
  return mcpManager;
};
