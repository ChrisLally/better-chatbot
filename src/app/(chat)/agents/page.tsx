import { selectAgents } from "@/services/supabase/users-service";
import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { AgentsList } from "@/components/agent/agents-list";

// Force dynamic rendering to avoid static generation issues with session
export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  // Middleware already handles auth redirect
  const user = await getSupabaseUser();

  // Get user details from users table to determine user_type
  const supabase = await createClient();
  const { data: userData } = await supabase
    .from("users")
    .select("user_type")
    .eq("id", user!.id)
    .single();

  // Fetch agents data on the server
  const allAgents = await selectAgents(user!.id, ["mine", "shared"], 50);

  // Separate into my agents and shared agents
  const myAgents = allAgents.filter((agent) => agent.userId === user!.id);
  const sharedAgents = allAgents.filter((agent) => agent.userId !== user!.id);

  return (
    <AgentsList
      initialMyAgents={myAgents}
      initialSharedAgents={sharedAgents}
      userId={user!.id}
      userRole={userData?.user_type || "human"}
    />
  );
}
