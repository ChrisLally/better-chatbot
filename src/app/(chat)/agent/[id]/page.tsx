import EditAgent from "@/components/agent/edit-agent";
import { agentRepository } from "lib/db/repository";
import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import { notFound } from "next/navigation";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Middleware already handles auth redirect
  const user = await getSupabaseUser();

  // For new agents, pass no initial data
  if (id === "new") {
    return <EditAgent userId={user!.id} />;
  }

  // Fetch the agent data on the server
  const agent = await agentRepository.selectAgentById(id, user!.id);

  if (!agent) {
    notFound();
  }

  const isOwner = agent.userId === user!.id;
  const hasEditAccess = isOwner || agent.visibility === "public";

  return (
    <EditAgent
      key={id}
      initialAgent={agent}
      userId={user!.id}
      isOwner={isOwner}
      hasEditAccess={hasEditAccess}
      isBookmarked={agent.isBookmarked || false}
    />
  );
}
