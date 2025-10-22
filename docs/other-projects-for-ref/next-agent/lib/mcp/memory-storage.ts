/**
 * Simple in-memory storage for MCP server configurations
 */

export interface MCPServerConfig {
  id: string;
  name: string;
  type: "stdio" | "sse";
  command: string;
  args?: string[];
  env?: Record<string, string>;
  disabled?: boolean;
}

class MemoryMCPConfigStorage {
  private configs: Map<string, MCPServerConfig> = new Map();

  async init(): Promise<void> {
    // Initialize with empty state
  }

  async loadAll(): Promise<MCPServerConfig[]> {
    return Array.from(this.configs.values());
  }

  async save(server: MCPServerConfig): Promise<MCPServerConfig> {
    this.configs.set(server.id, server);
    return server;
  }

  async delete(id: string): Promise<void> {
    this.configs.delete(id);
  }

  async has(id: string): Promise<boolean> {
    return this.configs.has(id);
  }

  async get(id: string): Promise<MCPServerConfig | null> {
    return this.configs.get(id) || null;
  }
}

export const createMemoryMCPConfigStorage = () => {
  return new MemoryMCPConfigStorage();
};
