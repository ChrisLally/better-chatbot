import type { MCPConfigStorage } from "./create-mcp-clients-manager";
import {
  getAllMcpServers,
  saveMcpServer,
  deleteMcpServer,
  getMcpServerById,
} from "@/services/supabase/mcp-service";
import defaultLogger from "logger";

import { colorize } from "consola/utils";

const logger = defaultLogger.withDefaults({
  message: colorize("gray", ` MCP Config Storage: `),
});

export function createDbBasedMCPConfigsStorage(): MCPConfigStorage {
  // Initializes the manager with configs from the database
  async function init(): Promise<void> {}

  return {
    init,
    async loadAll() {
      try {
        const servers = await getAllMcpServers();
        // Convert from Supabase format to expected format
        return servers.map((s) => ({
          id: s.id,
          name: s.name,
          config: s.config as any,
          enabled: s.enabled,
          userId: s.user_id,
          visibility: s.visibility as "public" | "private",
          createdAt: new Date(s.created_at),
          updatedAt: new Date(s.updated_at),
        }));
      } catch (error) {
        logger.error("Failed to load MCP configs from database:", error);
        return [];
      }
    },
    async save(server) {
      try {
        const saved = await saveMcpServer(server);
        // Convert from Supabase format to expected format
        return {
          id: saved.id,
          name: saved.name,
          config: saved.config as any,
          enabled: saved.enabled,
          userId: saved.user_id,
          visibility: saved.visibility as "public" | "private",
          createdAt: new Date(saved.created_at),
          updatedAt: new Date(saved.updated_at),
        };
      } catch (error) {
        logger.error(
          `Failed to save MCP config "${server.name}" to database:`,
          error,
        );
        throw error;
      }
    },
    async delete(id) {
      try {
        await deleteMcpServer(id);
      } catch (error) {
        logger.error(
          `Failed to delete MCP config "${id}" from database:",`,
          error,
        );
        throw error;
      }
    },
    async has(id: string): Promise<boolean> {
      try {
        const server = await getMcpServerById(id);
        return !!server;
      } catch (error) {
        logger.error(`Failed to check MCP config "${id}" in database:`, error);
        return false;
      }
    },
    async get(id) {
      const server = await getMcpServerById(id);
      if (!server) return null;
      // Convert from Supabase format to expected format
      return {
        id: server.id,
        name: server.name,
        config: server.config as any,
        enabled: server.enabled,
        userId: server.user_id,
        visibility: server.visibility as "public" | "private",
        createdAt: new Date(server.created_at),
        updatedAt: new Date(server.updated_at),
      };
    },
  };
}
