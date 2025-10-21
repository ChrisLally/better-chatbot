import {
  convertDBEdgeToUIEdge,
  convertDBNodeToUINode,
} from "lib/ai/workflow/shared.workflow";
import Workflow from "@/components/workflow/workflow";
import { getWorkflowStructure } from "@/services/supabase/workflow-service";
import { notFound } from "next/navigation";

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Middleware already handles auth redirect

  const workflow = await getWorkflowStructure(id);
  if (!workflow) {
    notFound();
  }

  // Allow any authenticated user to edit workflows (until workspaces are added)
  // TODO: Add access control when implementing workspaces/organizations
  const hasEditAccess = true;

  const initialNodes = (workflow.nodes || []).map(convertDBNodeToUINode);
  const initialEdges = (workflow.edges || []).map(convertDBEdgeToUIEdge);
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
