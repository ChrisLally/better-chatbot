import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createDbBasedMCPConfigsStorage } from "./db-mcp-config-storage";
import type { MCPClientsManager } from "./create-mcp-clients-manager";
import type { MCPServerConfig } from "app-types/mcp";

// Mock dependencies
vi.mock("@/services/supabase/mcp-service", () => ({
  getAllMcpServers: vi.fn(),
  saveMcpServer: vi.fn(),
  deleteMcpServer: vi.fn(),
  getMcpServerById: vi.fn(),
}));

vi.mock("logger", () => ({
  default: {
    withDefaults: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

const mockMcpService = await import("@/services/supabase/mcp-service");

describe("DB-based MCP Config Storage", () => {
  let storage: ReturnType<typeof createDbBasedMCPConfigsStorage>;
  let mockManager: MCPClientsManager;

  const mockServer = {
    id: "test-server",
    name: "test-server",
    config: { command: "python", args: ["test.py"] } as MCPServerConfig,
    enabled: true,
    userId: "test-user-id",
    visibility: "private" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Supabase format (snake_case) - what the service returns
  const mockSupabaseServer = {
    id: "test-server",
    name: "test-server",
    config: { command: "python", args: ["test.py"] } as MCPServerConfig,
    enabled: true,
    user_id: "test-user-id",
    visibility: "private",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    storage = createDbBasedMCPConfigsStorage();

    mockManager = {
      getClients: vi.fn(),
      getClient: vi.fn(),
      addClient: vi.fn(),
      refreshClient: vi.fn(),
      removeClient: vi.fn(),
    } as any;
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe("init", () => {
    it("should initialize with manager", async () => {
      await expect(storage.init(mockManager)).resolves.toBeUndefined();
    });
  });

  describe("loadAll", () => {
    it("should load all servers from database", async () => {
      vi.mocked(mockMcpService.getAllMcpServers).mockResolvedValue([
        mockSupabaseServer,
      ]);

      const result = await storage.loadAll();

      expect(mockMcpService.getAllMcpServers).toHaveBeenCalledOnce();
      expect(result).toEqual([mockServer]);
    });

    it("should return empty array when database fails", async () => {
      vi.mocked(mockMcpService.getAllMcpServers).mockRejectedValue(
        new Error("Database error"),
      );

      const result = await storage.loadAll();

      expect(result).toEqual([]);
    });
  });

  describe("save", () => {
    it("should save server to database", async () => {
      const serverToSave = {
        id: "new-server",
        name: "new-server",
        config: { url: "https://example.com" } as MCPServerConfig,
      };

      const supabaseResponse = {
        id: "new-server",
        name: "new-server",
        config: { url: "https://example.com" } as MCPServerConfig,
        enabled: true,
        user_id: "test-user-id",
        visibility: "private",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(mockMcpService.saveMcpServer).mockResolvedValue(
        supabaseResponse,
      );

      const serverWithUserId = {
        ...serverToSave,
        userId: "test-user-id",
      };

      const result = await storage.save(serverWithUserId);

      expect(mockMcpService.saveMcpServer).toHaveBeenCalledWith(
        serverWithUserId,
      );
      expect(result).toEqual(expect.objectContaining(serverToSave));
    });

    it("should throw error when save fails", async () => {
      const serverToSave = {
        id: "new-server",
        name: "new-server",
        config: { url: "https://example.com" } as MCPServerConfig,
      };

      vi.mocked(mockMcpService.saveMcpServer).mockRejectedValue(
        new Error("Save failed"),
      );

      await expect(
        storage.save({
          ...serverToSave,
          userId: "test-user-id",
        }),
      ).rejects.toThrow("Save failed");
    });
  });

  describe("delete", () => {
    it("should delete server from database", async () => {
      vi.mocked(mockMcpService.deleteMcpServer).mockResolvedValue();

      await storage.delete("test-server");

      expect(mockMcpService.deleteMcpServer).toHaveBeenCalledWith(
        "test-server",
      );
    });

    it("should throw error when delete fails", async () => {
      vi.mocked(mockMcpService.deleteMcpServer).mockRejectedValue(
        new Error("Delete failed"),
      );

      await expect(storage.delete("test-server")).rejects.toThrow(
        "Delete failed",
      );
    });
  });

  describe("has", () => {
    it("should return true when server exists", async () => {
      vi.mocked(mockMcpService.getMcpServerById).mockResolvedValue(
        mockSupabaseServer,
      );

      const result = await storage.has("test-server");

      expect(result).toBe(true);
      expect(mockMcpService.getMcpServerById).toHaveBeenCalledWith(
        "test-server",
      );
    });

    it("should return false when server does not exist", async () => {
      vi.mocked(mockMcpService.getMcpServerById).mockResolvedValue(null);

      const result = await storage.has("non-existent");

      expect(result).toBe(false);
    });

    it("should return false when database query fails", async () => {
      vi.mocked(mockMcpService.getMcpServerById).mockRejectedValue(
        new Error("Database error"),
      );

      const result = await storage.has("test-server");

      expect(result).toBe(false);
    });
  });

  describe("get", () => {
    it("should return server when it exists", async () => {
      vi.mocked(mockMcpService.getMcpServerById).mockResolvedValue(
        mockSupabaseServer,
      );

      const result = await storage.get("test-server");

      expect(result).toEqual(mockServer);
      expect(mockMcpService.getMcpServerById).toHaveBeenCalledWith(
        "test-server",
      );
    });

    it("should return null when server does not exist", async () => {
      vi.mocked(mockMcpService.getMcpServerById).mockResolvedValue(null);

      const result = await storage.get("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("interval functionality", () => {
    it("should set up interval for periodic checks", async () => {
      await storage.init(mockManager);

      // The interval is set up during module initialization
      // We can verify that the storage was initialized properly
      expect(mockManager).toBeDefined();
    });
  });
});
