import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import { mcpMcpToolCustomizationRepository } from "lib/db/repository";

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
    await mcpMcpToolCustomizationRepository.selectByUserIdAndMcpServerId({
      mcpServerId: server,
      userId: user.id,
    });

  return NextResponse.json(mcpServerCustomization);
}
