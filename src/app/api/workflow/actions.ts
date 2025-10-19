"use server";
import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import { workflowRepository } from "lib/db/repository";

export async function selectExecuteAbilityWorkflowsAction() {
  const user = await getSupabaseUser();
  if (!user) {
    return [];
  }
  const workflows = await workflowRepository.selectExecuteAbility(user.id);
  return workflows;
}
