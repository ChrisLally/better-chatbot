import MCPEditor from "@/components/mcp-editor";
import { Alert } from "ui/alert";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getMcpServerById } from "@/services/supabase/mcp-service";
import { redirect } from "next/navigation";

export default async function Page({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations();
  const mcpServer = await getMcpServerById(id);

  if (!mcpServer) {
    return redirect("/mcp");
  }

  // Convert from Supabase format to expected format
  const mcpClient = {
    id: mcpServer.id,
    name: mcpServer.name,
    config: mcpServer.config as any,
    enabled: mcpServer.enabled,
    userId: mcpServer.user_id,
    visibility: mcpServer.visibility as "public" | "private",
    createdAt: new Date(mcpServer.created_at),
    updatedAt: new Date(mcpServer.updated_at),
  };

  return (
    <div className="container max-w-3xl mx-4 md:mx-auto py-8">
      <div className="flex flex-col gap-2">
        <Link
          href="/mcp"
          className="flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="size-3" />
          {t("Common.back")}
        </Link>
        <header>
          <h2 className="text-3xl font-semibold my-2">
            {t("MCP.mcpConfiguration")}
          </h2>
          <p className="text text-muted-foreground">
            {t("MCP.configureYourMcpServerConnectionSettings")}
          </p>
        </header>

        <main className="my-8">
          {mcpClient ? (
            <MCPEditor
              initialConfig={mcpClient.config}
              name={mcpClient.name}
              id={mcpClient.id}
            />
          ) : (
            <Alert variant="destructive">MCP client not found</Alert>
          )}
        </main>
      </div>
    </div>
  );
}
