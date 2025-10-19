import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import { workflowRepository } from "lib/db/repository";

export async function GET() {
  const user = await getSupabaseUser();
  if (!user) {
    return Response.json([]);
  }
  const workflows = await workflowRepository.selectExecuteAbility(user.id);
  return Response.json(workflows);
}
