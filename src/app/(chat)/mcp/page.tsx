import MCPDashboard from "@/components/mcp-dashboard";
import { IS_VERCEL_ENV } from "lib/const";
import { getTranslations } from "next-intl/server";
import { getBasicUser } from "@/lib/supabase/auth-helpers";

// Force dynamic rendering to avoid static generation issues with session
export const dynamic = "force-dynamic";

export default async function Page() {
  // Middleware already handles auth redirect
  const user = await getBasicUser();

  // Should not happen due to middleware, but handle gracefully
  if (!user) {
    return <div>Unauthorized</div>;
  }

  const isAddingDisabled = process.env.NOT_ALLOW_ADD_MCP_SERVERS;

  const t = await getTranslations("Info");
  let message: string | undefined;

  if (isAddingDisabled) {
    message = t("mcpAddingDisabled");
  } else if (IS_VERCEL_ENV) {
    message = t("vercelSyncDelay");
  }

  return <MCPDashboard message={message} user={user} />;
}
