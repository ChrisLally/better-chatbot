import { agentRepository } from "lib/db/repository";
import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import { AgentsList } from "@/components/agent/agents-list";

// Force dynamic rendering to avoid static generation issues with session
export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  // Middleware already handles auth redirect
  const user = await getSupabaseUser();

  // Fetch agents data on the server
  const allAgents = await agentRepository.selectAgents(
    user!.id,
    ["mine", "shared"],
    50,
  );

  // Separate into my agents and shared agents
  const myAgents = allAgents.filter((agent) => agent.userId === user!.id);
  const sharedAgents = allAgents.filter((agent) => agent.userId !== user!.id);

  return (
    <AgentsList
      initialMyAgents={myAgents}
      initialSharedAgents={sharedAgents}
      userId={user!.id}
      userRole={user!.role}
    />
  );
}
