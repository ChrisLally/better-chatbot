import { pgChatRepository } from "./pg/repositories/chat-repository.pg";
// import { pgUserRepository } from "./pg/repositories/user-repository.pg"; // Not using this repository anymore
import { pgMcpRepository } from "./pg/repositories/mcp-repository.pg";
import { pgMcpMcpToolCustomizationRepository } from "./pg/repositories/mcp-tool-customization-repository.pg";
import { pgMcpServerCustomizationRepository } from "./pg/repositories/mcp-server-customization-repository.pg";
import { pgWorkflowRepository } from "./pg/repositories/workflow-repository.pg";
// import { supabaseAgentRepository } from "./repositories/agent-repository.supabase";
import { pgArchiveRepository } from "./pg/repositories/archive-repository.pg";
import { pgMcpOAuthRepository } from "./pg/repositories/mcp-oauth-repository.pg";
import { pgBookmarkRepository } from "./pg/repositories/bookmark-repository.pg";
import { pgChatExportRepository } from "./pg/repositories/chat-export-repository.pg";

export const chatRepository = pgChatRepository;
// export const userRepository = pgUserRepository; // Not using this repository anymore
export const mcpRepository = pgMcpRepository;
export const mcpMcpToolCustomizationRepository =
  pgMcpMcpToolCustomizationRepository;
export const mcpServerCustomizationRepository =
  pgMcpServerCustomizationRepository;
export const mcpOAuthRepository = pgMcpOAuthRepository;

export const workflowRepository = pgWorkflowRepository;
// export const agentRepository = supabaseAgentRepository;
export const archiveRepository = pgArchiveRepository;
export const bookmarkRepository = pgBookmarkRepository;
export const chatExportRepository = pgChatExportRepository;
