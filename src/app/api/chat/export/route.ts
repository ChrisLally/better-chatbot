import { ChatExportByThreadIdSchema } from "app-types/chat-export";
import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import { chatExportRepository, chatRepository } from "lib/db/repository";

export async function POST(req: Request) {
  const { threadId, expiresAt } = await ChatExportByThreadIdSchema.parse(
    await req.json(),
  );
  const user = await getSupabaseUser();
  if (!user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const isAccess = await chatRepository.checkAccess(threadId, user.id);
  if (!isAccess) {
    return new Response("Unauthorized", { status: 401 });
  }

  await chatExportRepository.exportChat({
    threadId,
    exporterId: user.id,
    expiresAt: expiresAt ?? undefined,
  });

  return Response.json({
    message: "Chat exported successfully",
  });
}
