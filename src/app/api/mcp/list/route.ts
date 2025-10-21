import { MCPServerInfo } from "app-types/mcp";
import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";
import { getMcpServersForUser } from "@/services/supabase/mcp-service";
import { getCurrentUser } from "lib/auth/permissions";

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser || !currentUser.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [servers, memoryClients] = await Promise.all([
    getMcpServersForUser(currentUser.id),
    mcpClientsManager.getClients(),
  ]);

  // Convert from Supabase format to expected format
  const convertedServers = servers.map((s) => ({
    id: s.id,
    name: s.name,
    config: s.config as any,
    enabled: s.enabled,
    userId: s.user_id,
    visibility: s.visibility as "public" | "private",
    createdAt: new Date(s.created_at),
    updatedAt: new Date(s.updated_at),
    userName: s.userName,
    userAvatar: s.userAvatar,
  }));

  const memoryMap = new Map(
    memoryClients.map(({ id, client }) => [id, client] as const),
  );

  const addTargets = convertedServers.filter(
    (server) => !memoryMap.has(server.id),
  );

  const serverIds = new Set(convertedServers.map((s) => s.id));
  const removeTargets = memoryClients.filter(({ id }) => !serverIds.has(id));

  if (addTargets.length > 0) {
    // no need to wait for this
    Promise.allSettled(
      addTargets.map((server) => mcpClientsManager.refreshClient(server.id)),
    );
  }
  if (removeTargets.length > 0) {
    // no need to wait for this
    Promise.allSettled(
      removeTargets.map((client) =>
        mcpClientsManager.disconnectClient(client.id),
      ),
    );
  }

  const result = convertedServers.map((server) => {
    const mem = memoryMap.get(server.id);
    const info = mem?.getInfo();
    const mcpInfo: MCPServerInfo = {
      ...server,
      enabled: info?.enabled ?? true,
      status: info?.status ?? "connected",
      error: info?.error,
      toolInfo: info?.toolInfo ?? [],
    };
    return mcpInfo;
  });

  return Response.json(result);
}
