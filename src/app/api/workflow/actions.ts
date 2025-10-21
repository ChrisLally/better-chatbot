"use server";
import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import { getExecutableWorkflows } from "@/services/supabase/workflow-service";

export async function selectExecuteAbilityWorkflowsAction() {
  const user = await getSupabaseUser();
  if (!user) {
    return [];
  }
  const workflows = await getExecutableWorkflows(user.id);
  return workflows;
}
