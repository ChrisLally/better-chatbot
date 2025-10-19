import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import { chatRepository } from "lib/db/repository";

export async function GET() {
  const user = await getSupabaseUser();

  if (!user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const threads = await chatRepository.selectThreadsByUserId(user.id);
  return Response.json(threads);
}
