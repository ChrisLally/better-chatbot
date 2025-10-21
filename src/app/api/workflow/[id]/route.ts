import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import {
  checkWorkflowAccess,
  getWorkflow,
  updateWorkflow,
  deleteWorkflow,
} from "@/services/supabase/workflow-service";
import { canEditWorkflow, canDeleteWorkflow } from "@/lib/auth/permissions";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getSupabaseUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const hasAccess = await checkWorkflowAccess(id, user.id);
  if (!hasAccess) {
    return new Response("Unauthorized", { status: 401 });
  }
  const workflow = await getWorkflow(id);
  return Response.json(workflow);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { visibility, isPublished } = await request.json();

  const user = await getSupabaseUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Check if user has permission to edit workflows
  const canEdit = await canEditWorkflow();
  if (!canEdit) {
    return Response.json(
      { error: "Only editors and admins can edit workflows" },
      { status: 403 },
    );
  }
  const hasAccess = await checkWorkflowAccess(id, user.id, false);
  if (!hasAccess) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get existing workflow
  const existingWorkflow = await getWorkflow(id);
  if (!existingWorkflow) {
    return new Response("Workflow not found", { status: 404 });
  }

  // Update only the specified fields
  const updatedWorkflow = await updateWorkflow(id, {
    visibility: visibility ?? existingWorkflow.visibility,
    isPublished: isPublished ?? existingWorkflow.isPublished,
  });

  return Response.json(updatedWorkflow);
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getSupabaseUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Check if user has permission to delete workflows
  const canDelete = await canDeleteWorkflow();
  if (!canDelete) {
    return Response.json(
      { error: "Only editors and admins can delete workflows" },
      { status: 403 },
    );
  }
  const hasAccess = await checkWorkflowAccess(id, user.id, false);
  if (!hasAccess) {
    return new Response("Unauthorized", { status: 401 });
  }
  await deleteWorkflow(id);
  return Response.json({ message: "Workflow deleted" });
}
