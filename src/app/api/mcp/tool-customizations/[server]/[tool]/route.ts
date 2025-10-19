import { McpToolCustomizationZodSchema } from "app-types/mcp";
import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import { serverCache } from "lib/cache";
import { CacheKeys } from "lib/cache/cache-keys";
import { mcpMcpToolCustomizationRepository } from "lib/db/repository";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ server: string; tool: string }> },
) {
  const { server, tool } = await params;
  const user = await getSupabaseUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await mcpMcpToolCustomizationRepository.select({
    mcpServerId: server,
    userId: user.id,
    toolName: tool,
  });
  return Response.json(result ?? {});
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ server: string; tool: string }> },
) {
  const { server, tool } = await params;
  const user = await getSupabaseUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();

  const { mcpServerId, toolName, prompt } = McpToolCustomizationZodSchema.parse(
    {
      ...body,
      mcpServerId: server,
      toolName: tool,
    },
  );

  const result =
    await mcpMcpToolCustomizationRepository.upsertToolCustomization({
      userId: user.id,
      mcpServerId,
      toolName,
      prompt,
    });
  const key = CacheKeys.mcpServerCustomizations(user.id);
  void serverCache.delete(key);

  return Response.json(result);
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ server: string; tool: string }> },
) {
  const { server, tool } = await params;
  const user = await getSupabaseUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  await mcpMcpToolCustomizationRepository.deleteToolCustomization({
    mcpServerId: server,
    userId: user.id,
    toolName: tool,
  });
  const key = CacheKeys.mcpServerCustomizations(user.id);
  void serverCache.delete(key);

  return Response.json({ success: true });
}
