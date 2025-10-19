import { McpServerCustomizationZodSchema } from "app-types/mcp";
import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import { serverCache } from "lib/cache";
import { CacheKeys } from "lib/cache/cache-keys";
import { mcpServerCustomizationRepository } from "lib/db/repository";

import { NextResponse } from "next/server";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ server: string }> },
) {
  const { server } = await params;
  const user = await getSupabaseUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const mcpServerCustomization =
    await mcpServerCustomizationRepository.selectByUserIdAndMcpServerId({
      mcpServerId: server,
      userId: user.id,
    });

  return NextResponse.json(mcpServerCustomization ?? {});
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ server: string }> },
) {
  const { server } = await params;
  const user = await getSupabaseUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const { mcpServerId, prompt } = McpServerCustomizationZodSchema.parse({
    ...body,
    mcpServerId: server,
  });

  const result =
    await mcpServerCustomizationRepository.upsertMcpServerCustomization({
      userId: user.id,
      mcpServerId,
      prompt,
    });
  const key = CacheKeys.mcpServerCustomizations(user.id);
  void serverCache.delete(key);

  return NextResponse.json(result);
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ server: string }> },
) {
  const { server } = await params;
  const user = await getSupabaseUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  await mcpServerCustomizationRepository.deleteMcpServerCustomizationByMcpServerIdAndUserId(
    {
      mcpServerId: server,
      userId: user.id,
    },
  );
  const key = CacheKeys.mcpServerCustomizations(user.id);
  void serverCache.delete(key);

  return NextResponse.json({ success: true });
}
