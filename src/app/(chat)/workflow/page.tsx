import WorkflowListPage from "@/components/workflow/workflow-list-page";
import { getSupabaseUser } from "@/lib/supabase/auth-helpers";

// Force dynamic rendering to avoid static generation issues with session
export const dynamic = "force-dynamic";

export default async function Page() {
  // Middleware already handles auth redirect
  const user = await getSupabaseUser();
  return <WorkflowListPage userRole={user!.role} />;
}
