import EditAgent from "@/components/agent/edit-agent";
import { getAgent } from "@/services/supabase/users-service";
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
  const agent = await getAgent(id);

  if (!agent) {
    notFound();
  }

  // Allow any authenticated user to edit agents (until workspaces are added)
  const isOwner = agent.userId === user!.id;
  const hasEditAccess = true; // Allow all authenticated users to edit for now

  return (
    <EditAgent
      key={id}
      initialAgent={agent}
      userId={user!.id}
      isOwner={isOwner}
      hasEditAccess={hasEditAccess}
      isBookmarked={false}
    />
  );
}
