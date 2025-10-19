import {
  convertDBEdgeToUIEdge,
  convertDBNodeToUINode,
} from "lib/ai/workflow/shared.workflow";
import Workflow from "@/components/workflow/workflow";
import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import { workflowRepository } from "lib/db/repository";
import { notFound } from "next/navigation";

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Middleware already handles auth redirect
  const user = await getSupabaseUser();

  const hasAccess = await workflowRepository.checkAccess(id, user!.id);
  if (!hasAccess) {
    notFound();
  }

  const workflow = await workflowRepository.selectStructureById(id);
  if (!workflow) {
    notFound();
  }
  const hasEditAccess = await workflowRepository.checkAccess(
    id,
    user!.id,
    false,
  );
  const initialNodes = workflow.nodes.map(convertDBNodeToUINode);
  const initialEdges = workflow.edges.map(convertDBEdgeToUIEdge);
  return (
    <Workflow
      key={id}
      workflowId={id}
      initialNodes={initialNodes}
      initialEdges={initialEdges}
      hasEditAccess={hasEditAccess}
    />
  );
}
