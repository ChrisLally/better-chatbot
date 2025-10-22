# MCP Tool Development Rules & Best Practices

*Strict guidelines for developing, maintaining, and deploying MCP (Model Context Protocol) tools in the Unison agent system*

## Core Philosophy

**Principle**: MCP tools are the bridge between AI agents and system capabilities. They must be explicit, secure, reliable, and follow consistent patterns for predictable agent behavior.

## 0. Dynamic Tool Architecture Overview

### ✓ **Database-Driven Tool System**

Unison uses a **dynamic, database-driven MCP tool system** where tools are stored in the database and loaded at runtime. This eliminates code deployments for tool changes and enables per-agent tool access control.

**Key Architecture Points:**

```
┌─────────────────────────────────────────────────────────────┐
│ TypeScript Development → Database Storage → Runtime Execution │
└─────────────────────────────────────────────────────────────┘

1. Developer writes tool in TypeScript (src/lib/supabase/_tools/)
2. `pnpm sb:tools:push` compiles TS→JS and saves to database
3. Agent requests tools via HTTP: GET /api/mcp?agentId=...
4. MCP endpoint queries database for agent's tools
5. Tools dynamically registered and executed
```

### ✓ **Database Schema**

```sql
-- Tools: Store tool code and metadata
CREATE TABLE tools (
  id uuid PRIMARY KEY,
  name text UNIQUE NOT NULL,
  description text NOT NULL,
  typescript text,              -- Source code (for development)
  javascript text,              -- Compiled code (for execution)
  requires_sandbox boolean DEFAULT true,
  created_at timestamptz,
  updated_at timestamptz
);

-- Tool Parameters: Define tool schemas
CREATE TABLE tool_parameters (
  id uuid PRIMARY KEY,
  tool_id uuid REFERENCES tools(id),
  name text NOT NULL,
  type text NOT NULL,           -- 'string' | 'number' | 'boolean' | 'object'
  is_required boolean NOT NULL,
  description text,
  created_at timestamptz
);

-- User Tools: Agent access control (many-to-many)
CREATE TABLE user_tools (
  user_id uuid REFERENCES users(id),
  tool_id uuid REFERENCES tools(id),
  created_at timestamptz,
  PRIMARY KEY (user_id, tool_id)
);
```

### ✓ **Tool Development Pipeline**

```bash
# Pull tools from database to local TypeScript files
pnpm sb:tools:pull

# Edit tools in: src/lib/supabase/_tools/*.ts

# Type check without syncing
pnpm sb:tools:check

# Compile TypeScript → JavaScript and sync to database
pnpm sb:tools:push
```

**What happens on `pnpm sb:tools:push`:**
1. Compiles TypeScript to JavaScript (with bundling for imports)
2. Extracts tool metadata (name, description, parameters)
3. Updates database: both `typescript` and `javascript` columns
4. Updates `tool_parameters` table from metadata
5. **No deployment needed** - changes take effect immediately

### ✓ **Dynamic Tool Discovery Flow**

```typescript
// 1. AI Service creates MCP client (src/services/ai/ai-service.ts)
const mcpUrl = `${baseUrl}/api/mcp?agentId=${assignedUserId}&workspaceId=...`;
const httpTransport = new StreamableHTTPClientTransport(new URL(mcpUrl));
mcpClient = await experimental_createMCPClient({ transport: httpTransport });

// 2. MCP endpoint loads tools from database (src/app/api/mcp/route.ts)
async function loadToolsFromDatabase(server: any, agentId: string) {
  // Query database for THIS agent's tools only
  const tools = await getAgentToolsWithParameters(agentId);
  
  // Dynamically register each tool
  for (const tool of tools) {
    server.tool(
      tool.name,
      tool.description,
      schemaObj,
      async (params) => {
        // Execute tool.javascript from database
        const fn = new AsyncFunction(...paramNames, tool.javascript);
        return await fn(...paramValues);
      }
    );
  }
}

// 3. AI receives agent-specific tool catalog
tools = await mcpClient.tools();
// Tools are filtered by user_tools table!

// 4. AI generates response with tools
result = await generateText({
  model: geminiModel,
  messages,
  tools,  // Dynamic tools from database
});
```

### ✓ **Benefits of Dynamic Tool System**

| Benefit | Description |
|---------|-------------|
| **No Deployments** | Add/update tools via `pnpm sb:tools:push` - live immediately |
| **Per-Agent Access** | Different agents see different tools via `user_tools` table |
| **Workspace-Scoped** | Future: Add `workspace_id` column for workspace-specific tools |
| **Hot-Swappable** | Fix bugs or update logic without restarting servers |
| **Auditable** | Database tracks tool changes, access, and usage |
| **Type-Safe Development** | Write in TypeScript with full IDE support |
| **Fast Execution** | Pre-compiled JavaScript runs immediately |
| **Version Control** | Both source (TS) and compiled (JS) versions stored |

### ✓ **Agent-Specific Tool Access**

```sql
-- Check which tools an agent has access to
SELECT t.name, t.description, t.requires_sandbox
FROM user_tools ut
JOIN tools t ON ut.tool_id = t.id
WHERE ut.user_id = 'agent-uuid';

-- Grant tool access to an agent
INSERT INTO user_tools (user_id, tool_id)
VALUES ('agent-uuid', 'tool-uuid');

-- Revoke tool access
DELETE FROM user_tools
WHERE user_id = 'agent-uuid' AND tool_id = 'tool-uuid';
```

**Access Control Flow:**
1. Agent requests tools: `GET /api/mcp?agentId=abc-123`
2. MCP endpoint queries: `SELECT tools WHERE user_id = 'abc-123'`
3. Only assigned tools are registered and available to AI
4. Different agents in same workspace can have different tool sets

### ✓ **Future: Workspace-Scoped Tools**

**Planned enhancement** to add workspace isolation:

```sql
-- Add workspace_id to tools table
ALTER TABLE tools ADD COLUMN workspace_id uuid REFERENCES workspaces(id);

-- Global tools: workspace_id = NULL (available to all workspaces)
-- Workspace tools: workspace_id = specific UUID (private to workspace)

-- Query pattern would become:
SELECT t.* FROM tools t
INNER JOIN user_tools ut ON t.id = ut.tool_id
WHERE ut.user_id = $agentId 
  AND (t.workspace_id IS NULL OR t.workspace_id = $workspaceId);
```

**Use Cases:**
- Company A's `financial_analysis` tool with proprietary logic
- Company B's `financial_analysis` tool with different algorithms
- Platform provides global utility tools (workspace_id = NULL)
- Workspaces create custom business logic tools (workspace_id = UUID)

---

**See Also:**
- Section 9: Database Tool Synchronization (pnpm commands)
- Section 13: Tool Execution Environments (local vs sandbox)
- Section 15: Tool Assignment to Agents (user_tools patterns)
- `/src/services/ai/_AI_SERVICE_RULES.md` Section 10: MCP Integration (client usage)

## 1. Tool Naming Conventions (Critical Rule)

###  **ALWAYS use explicit, descriptive tool names**
- **Rule**: Tool names should clearly indicate their function and scope
- **Rule**: Use underscores for multi-word names: `chat_history`, `knowledge_search`
- **Rule**: Avoid ambiguous or generic names: `helper`, `utility`, `tool`
- **Rule**: Include action verb when appropriate: `get_weather`, `send_message`

```typescript
//   GOOD: Explicit, clear names
"chat_history"              // Clear scope: chat conversation data
"knowledge_search"          // Clear action: search knowledge base  
"sendProgressUpdateChatMessage"  // Explicit: send progress update to chat
"clinical_trials_analysis"  // Domain-specific and clear

// L BAD: Ambiguous or generic names
"chat"                     // Too generic - what about chat?
"search"                   // Too broad - search what?
"update"                   // Update what, how?
"helper"                   // Meaningless generic name
```

## 2. Service Method Naming in Tools

###  **Follow explicit service method patterns**
- **Pattern**: `{service}.{explicitMethodName}` for supabase tool methods
- **Rule**: Method names should be self-documenting
- **Rule**: Use full names, not abbreviations: `sendAgentMessageWithDiscovery` not `sendAgentMsg`

```typescript
//   GOOD: Explicit service methods
"chat-messages.sendProgressUpdateChatMessage"  // Explicit action + target
"chat-messages.sendAgentMessageWithDiscovery"  // Clear workflow description
"users.findAgents"                             // Clear search action
"project-tasks.createProjectTask"              // Standard CRUD naming

// L BAD: Abbreviated or unclear methods  
"chat-messages.send"          // Send what? How?
"users.find"                  // Find what users?
"tasks.create"                // Too generic
"msg.send"                    // Abbreviated service name
```

## 3. Tool Parameter Design

###  **Design parameters for AI agent clarity**
- **Rule**: Parameters should be self-explanatory without documentation
- **Rule**: Use descriptive parameter names, not abbreviations
- **Rule**: Group related parameters logically
- **Rule**: Make required vs optional parameters obvious

```typescript
//   GOOD: Clear parameter design
{
  "name": "sendProgressUpdateChatMessage",
  "parameters": [
    {
      "name": "content",           // Clear: message content
      "type": "string", 
      "is_required": true
    },
    {
      "name": "chatId",            // Clear: target chat identifier
      "type": "string",
      "is_required": true  
    },
    {
      "name": "agentId",           // Clear: sender agent identifier
      "type": "string",
      "is_required": true
    }
  ]
}

// L BAD: Unclear parameter design
{
  "name": "send",
  "parameters": [
    {
      "name": "msg",               // Abbreviated
      "type": "string"
    },
    {
      "name": "id",                // Which ID? Chat? User? Agent?
      "type": "string"
    }
  ]
}
```

## 4. Tool Description Standards

###  **Write comprehensive, agent-focused descriptions**
- **Rule**: Descriptions should help AI understand when to use the tool
- **Rule**: Include examples of usage scenarios
- **Rule**: Explain automatic parameter injection
- **Rule**: Document tool capabilities and limitations

```typescript
//   GOOD: Comprehensive tool description
{
  "name": "sendProgressUpdateChatMessage",
  "description": "Send progress update messages during AI processing without triggering webhook loops. Use for multi-step operations to keep users informed of progress.\n\nAutomatically injects current chatId and agentId from context.\n\nUse cases:\n- Multi-tool workflows with intermediate updates\n- Long-running analysis with status reports\n- Agent collaboration with progress visibility\n\nNOTE: Does NOT trigger agent responses (no webhook loops)"
}

// L BAD: Minimal description
{
  "name": "send",
  "description": "Send a message"  // Unclear when to use, how it works
}
```

## 5. TypeScript Development Standards

###  **Follow established TypeScript patterns**
- **Rule**: Use strict TypeScript typing with proper imports
- **Rule**: Export default function with tool metadata
- **Rule**: Include parameter validation
- **Rule**: Handle errors gracefully

```typescript
//   GOOD: Proper TypeScript tool structure
/**
 * Send progress update to chat during AI processing
 * Does NOT trigger webhook - for mid-process updates only
 */
function sendProgressUpdateChatMessage(
  content: string, 
  chatId: string, 
  agentId: string
): string {
  if (!content?.trim()) {
    throw new Error('Content is required for progress updates')
  }
  
  if (!chatId || !agentId) {
    throw new Error('ChatId and agentId are required')
  }
  
  return `Progress update sent: ${content.substring(0, 50)}...`
}

export default sendProgressUpdateChatMessage;

// Tool metadata for database sync
(sendProgressUpdateChatMessage as any).metadata = {
  "id": "uuid-here",
  "name": "sendProgressUpdateChatMessage",
  "description": "Send progress update messages during AI processing...",
  "parameters": [...]
};
```

## 6. Security and Loop Prevention

###  **Critical security rules for chat/messaging tools**
- **Rule**: NEVER set `triggers_agent_user_id` in progress updates
- **Rule**: Always validate agent permissions before actions
- **Rule**: Prevent infinite webhook loops through careful parameter design
- **Rule**: Sanitize and validate all user inputs
- **Rule**: **ALWAYS link messages to steps** - Include `project_task_step_id` to prevent trigger loops

### ✓ **Message Linking Pattern (Critical for Loop Prevention)**

**The Problem:** The `handle_chat_message_inserted` database trigger creates new tasks for messages without a `project_task_step_id`. If tools or AI services create messages without this link, they'll trigger duplicate tasks, leading to infinite loops.

**The Solution:** Every message created during step execution MUST include `project_task_step_id`.

```typescript
// ✅ GOOD: Message linked to step (prevents trigger loop)
const message = await createChatMessage({
  content: sanitizeContent(content),
  chat_id: chatId,
  user_id: agentId,
  project_task_step_id: stepId  // CRITICAL: Links message to current step
});

// The database trigger will check:
// IF NEW.project_task_step_id IS NOT NULL THEN RETURN NEW; END IF;
// This prevents the message from creating a new task

// ❌ BAD: Message without step link (creates duplicate tasks)
const message = await createChatMessage({
  content: content,
  chat_id: chatId,
  user_id: agentId
  // Missing: project_task_step_id - will trigger new task creation!
});
```

**Where to Apply:**
1. **AI Service** (`src/services/ai/ai-service.ts`): Response messages after step execution
2. **MCP Tools** (`src/lib/supabase/_tools/*.ts`): Any tool that creates chat messages (e.g., `create_project_task` delegation messages)
3. **Webhook Handlers**: Any message creation during automated processing

**Verification:**
```sql
-- Check for messages without step links (potential loop triggers)
SELECT id, content, user_id, created_at
FROM chat_messages
WHERE project_task_step_id IS NULL
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### ✓ **Legacy `triggers_agent_user_id` Pattern (Still Relevant)**

```typescript
//   GOOD: Safe message sending
const message = {
  content: sanitizeContent(content),
  chat_id: chatId,
  user_id: agentId,
  triggers_agent_user_id: null  // CRITICAL: Prevents webhook loops
}

// L BAD: Could create infinite loops
const message = {
  content: content,  // No validation
  chat_id: chatId,
  user_id: agentId,
  triggers_agent_user_id: agentId  // DANGEROUS: Creates webhook loop
}
```

## 7. Error Handling in Tools

###  **Consistent error handling patterns**
- **Rule**: Return descriptive error messages for AI agent understanding
- **Rule**: Log errors for debugging but don't expose sensitive details
- **Rule**: Provide actionable error messages when possible
- **Rule**: Gracefully handle edge cases

```typescript
//   GOOD: Descriptive error handling
try {
  const result = await performAction()
  return `Action completed successfully: ${result.summary}`
} catch (error) {
  console.error('Tool execution error:', error)
  
  if (error.code === 'PERMISSION_DENIED') {
    return 'Error: Agent lacks permission for this action. Contact workspace admin.'
  }
  
  if (error.code === 'RESOURCE_NOT_FOUND') {
    return 'Error: Target resource not found. Verify IDs are correct.'
  }
  
  return `Error: Unable to complete action. ${error.message}`
}

// L BAD: Unhelpful error handling
try {
  await performAction()
} catch (error) {
  return 'Error occurred'  // No context for AI to understand or act upon
}
```

## 8. Tool Testing Standards

###  **Testing requirements for all tools**
- **Rule**: Every tool must have test scenarios in TESTING_RULES.md
- **Rule**: Test both success and failure cases
- **Rule**: Validate parameter injection works correctly
- **Rule**: Verify no webhook loops or security issues

```typescript
// Tool test scenario structure:
### Tool Name Test
```sql
-- Setup test data if needed
INSERT INTO test_table (field) VALUES ('test_value');
```

**Test Tool Call:**
```json
{
  "service": "chat-messages",
  "method": "sendProgressUpdateChatMessage", 
  "params": {
    "content": "Test progress update message"
  }
}
```

**Expected Results:**
-  Message appears in chat
-  No webhook trigger (triggers_agent_user_id = null)
-  Proper tracing in project_task_steps
-  No error logs in route.log
```

## 9. Database Tool Synchronization

###  **Managing tools in database**
- **Rule**: Use TypeScript � JavaScript compilation pipeline
- **Rule**: Store both TypeScript source and compiled JavaScript
- **Rule**: Use `pnpm sb:tools:push` for synchronization
- **Rule**: Test tools after database updates

```bash
# Tool development workflow:
pnpm sb:tools:pull      # Generate TypeScript from database
# Edit tools in src/lib/supabase/_tools/
pnpm sb:tools:check     # TypeScript validation  
pnpm sb:tools:push      # Compile and sync to database
# Test tools via MCP
```

## 10. Multi-Update Tool Patterns

###  **Design patterns for progressive updates**
- **Rule**: Progress updates should be meaningful, not verbose
- **Rule**: Allow AI agents to decide when to send updates
- **Rule**: Design for async tool execution
- **Rule**: Support both parallel and sequential tool patterns

```typescript
//   GOOD: Multi-step workflow with updates
async function complexAnalysis() {
  // Step 1: Initial discovery
  const agents = await findAgents('workspace', workspaceId)
  await sendProgressUpdate(`Found ${agents.length} agents, analyzing capabilities...`)
  
  // Step 2: Agent consultation  
  const results = await Promise.all(
    agents.map(agent => consultAgent(agent.id))
  )
  await sendProgressUpdate('Agent consultation complete, generating report...')
  
  // Step 3: Final processing
  const report = await generateReport(results)
  return `Analysis complete: ${report.summary}`
}

// Agent decides when updates are valuable
```

## 11. Documentation Integration

###  **Keep documentation synchronized with tools**
- **Rule**: Update tool descriptions in database when capabilities change
- **Rule**: Include tools in user-agent-flow.md examples
- **Rule**: Document tool interactions in TESTING_RULES.md
- **Rule**: Maintain examples in tool descriptions

```typescript
// Tool description should include current examples:
"Example usage:\n" +
"1. Multi-step analysis: sendProgressUpdateChatMessage('Step 1 of 3 complete...')\n" +
"2. Long operations: sendProgressUpdateChatMessage('Processing 50 records...')\n" +  
"3. Agent collaboration: sendProgressUpdateChatMessage('Consulting expert agent...')"
```

## Strict Tool Naming Patterns

Based on database schema rules, use these strict patterns:

**Required Pattern**: `{action}_{domain}_{scope}` or `{domain}_{action}`

**Examples of proper names**:
- `get_weather_forecast` (action_domain_scope)
- `chat_history` (domain_action)
- `analyze_financial_data` (action_domain_scope)
- `workspace_context` (domain_scope)

**Names that violate rules**:
- `add` → should be `calculate_sum` or `add_numbers`
- `echo` → should be `test_message_echo`
- `supabase` → should be `query_database` or specific service

**Action verbs**: get, send, create, analyze, query, search, update
**Domains**: chat, knowledge, workspace, financial, weather, fda
**Scopes**: history, context, forecast, analysis, pipeline

## 12. Context Variable Usage (Critical Rule)

### ✓ **Use MCP Context Variables - Never Make AI Guess IDs**
The MCP execution environment automatically provides context variables. Use these instead of making AI agents guess or generate UUIDs.

**Available Context Variables:**
```typescript
// Always available in tool execution context:
declare const workspaceId: string;      // Current workspace ID
declare const currentAgentId: string;   // Executing agent ID
declare const chatId: string;           // Current chat ID (if available)
declare const stepId: string;           // Current step ID (if available)
declare const projectTaskId: string;    // Current project task ID (if available)
```

### ✓ **Context Variable Rules**
- **Rule**: Always use context variables when available - never require as parameters
- **Rule**: Declare context variables at the top of tool files
- **Rule**: Validate context availability before using
- **Rule**: Update tool descriptions to mention automatic context injection

```typescript
// ✓ GOOD: Using context variables
// Context variables provided by MCP execution
declare const workspaceId: string;
declare const currentAgentId: string;

async function list_workspace_usersTool(userType?: string): Promise<string> {
  // Validate context is available
  if (!workspaceId) {
    throw new Error("workspaceId not available from execution context");
  }
  
  // Use context directly - AI doesn't need to provide workspace ID
  const response = await fetch(`${baseUrl}/api/supabase`, {
    // ... use workspaceId from context
  });
}

// Tool metadata reflects context usage
(list_workspace_usersTool as any).metadata = {
  "description": "List users in current workspace. Automatically uses workspace from execution context - no workspace ID needed.",
  "parameters": [
    {
      "name": "userType", // Only business logic parameters
      "type": "string",
      "is_required": false
    }
    // No workspaceId parameter - provided by context!
  ]
};

// ❌ BAD: Making AI provide context that's already available
async function list_workspace_usersTool(workspaceId: string, userType?: string): Promise<string> {
  // Forces AI to know/guess workspace UUID - error prone!
}
```

### ✓ **Context Variable Benefits**
- **No UUID Guessing**: AI never has to generate or guess workspace/chat/task IDs
- **Fewer Parameter Errors**: Reduces chance of wrong IDs or case sensitivity issues
- **Simpler AI Calls**: AI focuses on business logic, not technical plumbing
- **Automatic Context**: Tools get current workspace/chat/task automatically
- **Error Reduction**: Eliminates entire class of "invalid ID" errors

### ✓ **When to Use Context vs Parameters**
```typescript
// ✓ Use CONTEXT for (AI never provides these):
workspaceId      // Current workspace executing in
currentAgentId   // Current agent executing the tool
chatId           // Current chat where task/step is happening  
stepId           // Current step being executed
projectTaskId    // Current project task being executed

// ✓ Use PARAMETERS for (AI provides when needed):
// DIFFERENT/TARGET IDs (not current context):
targetUserId     // Different user to message/assign (not current agent)
targetChatId     // Different chat to send message to (not current chat)
assignedUserId   // User to assign task to (could be current agent or different)

// BUSINESS LOGIC DATA:
userType         // Filtering choices: 'human' | 'agent'
searchText       // User-provided search terms
content          // Message content, task descriptions
title            // Task titles, names, etc.
```

## 13. Tool Execution Environments (Critical Architecture)

### ✓ **Local vs Sandboxed Execution**

**TWO execution modes** are available in `/src/app/api/mcp/route.ts`:

1. **Local Execution** (`requires_sandbox: false` or undefined)
   - Runs in Next.js Node.js process
   - **Full access** to `localhost:3000` and local APIs
   - Has `fetch`, `process.env`, `console` available
   - Can call `/api/supabase` routes directly
   - **Use for**: Database operations, internal API calls, Supabase queries

2. **Modal Sandbox** (`requires_sandbox: true`)
   - Runs in remote Modal cloud sandbox
   - **No access** to `localhost` (only public URLs)
   - Requires secrets injection for API keys
   - **Use ONLY for**: External APIs requiring secrets (e.g., OpenWeather API)

### ✓ **When to Use Each Mode**

```typescript
// ✅ LOCAL EXECUTION (requires_sandbox: false)
// - Supabase database queries
// - Internal API routes (/api/supabase)
// - Any tool needing localhost access
async function list_workspace_usersTool() {
  // Can access http://localhost:3000/api/supabase ✅
  const response = await fetch(`http://localhost:3000/api/supabase`, {
    method: 'POST',
    body: JSON.stringify({...})
  });
}

// ✅ MODAL SANDBOX (requires_sandbox: true)
// - External APIs requiring secrets
// - Tools needing isolated execution
async function get_weatherTool(city: string) {
  // Needs OpenWeather API key from Modal secrets
  const response = await fetch(`https://api.openweathermap.org/...`);
}
```

### ✓ **Database Configuration**

The `requires_sandbox` flag is stored in the `tools` table:

```sql
-- Local execution (default, most tools)
UPDATE tools SET requires_sandbox = false WHERE name = 'list_workspace_users';

-- Modal sandbox (external APIs only)
UPDATE tools SET requires_sandbox = true WHERE name = 'get_weather';
```

### ✓ **Critical Rules**
- **Default to local** (`requires_sandbox: false`) unless you need external API secrets
- **Modal cannot access localhost** - it's a remote cloud environment
- **Local execution is faster** - no network overhead to Modal
- **Use Modal sparingly** - only when secrets management is required
- **Document why** - Add comment if using `requires_sandbox: true`

## 14. Task Creation Tool Pattern (create_project_task)

### ✓ **Automatic Draft→Step→Ready Pattern**

The `create_project_task` tool handles the complete task lifecycle internally to trigger webhook processing:

```typescript
// 1. Create task as DRAFT (line 113)
status: "draft"  // Prevents immediate webhook trigger

// 2. Create step with chat context (lines 130-150)
status: 'working'  // Ready for AI processing
chat_id: delegationChatId || chatId  // Required for AI context

// 3. Update task to READY (lines 167-190)
status: 'ready'  // NOW triggers webhook via database trigger
```

**Why This Pattern:**
- **Draft First**: Prevents webhook trigger before step exists
- **Step Creation**: Ensures AI has required chat context
- **Ready Last**: Only triggers webhook after step is ready

**Delegation Flow:**
When assigning to another agent (lines 35-96):
1. Find/create consultation chat between agents
2. Send context message: "I've assigned you a task: [title]..."
3. Link message to step via `chat_message_id`
4. Assigned agent gets minimal context (just delegation message)

**Critical:** Tool handles status transitions automatically. Agents don't need to update task status separately - the tool does it all.

**File:** `src/lib/supabase/_tools/create_project_task.ts`

---

## 15. Tool Assignment to Agents

### ✓ **Agent-Specific Tool Access**

Tools are assigned to agents via the `user_tools` junction table (many-to-many relationship). When an agent requests tools via `/api/mcp?agentId={id}`, the MCP route filters to return only tools assigned to that specific agent.

**Verification Query:**
```sql
-- Check which tools an agent has
SELECT t.name, t.description
FROM user_tools ut
JOIN tools t ON ut.tool_id = t.id
WHERE ut.user_id = '{AGENT_ID}';
```

This allows role-based tool access - research agents get analysis tools, coordinator agents get delegation tools, etc.

### ✓ **Orchestration vs Execution Tool Pattern (Critical Architecture)**

**Principle:** Distinguish between orchestration tools and execution tools. Only orchestrator agents should have access to orchestration tools.

**Tool Categories:**

1. **Orchestration Tools** (Unison Agent ONLY)
   - `create_project_task` - Delegates work to other agents
   - `assign_task` - Task assignment and management
   - `create_notification_task` - Human notification management
   - Any tool that creates tasks or coordinates multiple agents

2. **Execution Tools** (Specialist Agents)
   - `create_artifact` - Creates deliverables
   - `read_artifact` - Reviews work products
   - `search_fda_pipeline` - Domain-specific research
   - `analyze_financial_data` - Domain-specific analysis
   - Any tool that performs specific work or analysis

3. **Shared Tools** (All Agents)
   - `current_chat_history` - Context gathering
   - `list_workspace_users` - Discovery
   - General utility tools without side effects

**Why This Matters:**

```typescript
// ❌ BAD: Specialist agent with orchestration tool
// Stock Research Agent assigned create_project_task
// When Stock Research completes work, it tries to delegate:
Stock Research → create_project_task("New Research Task")
  → Creates infinite delegation loop
  → System creates exponential tasks

// ✅ GOOD: Only orchestrator has delegation tools
// Stock Research Agent has execution tools only
Stock Research → create_artifact("Analysis Report")
  → Creates deliverable
  → Unison reviews and notifies human
  → Clean execution flow
```

**Tool Assignment Rules:**
- **Rule**: Only assign `create_project_task` to orchestrator agents (Unison)
- **Rule**: Specialist agents get domain-specific execution tools
- **Rule**: Prevent circular delegation by limiting orchestration tool access
- **Rule**: Audit tool assignments when adding new agents

**Verification Query:**
```sql
-- Find agents with orchestration tools (should only be Unison)
SELECT 
  u.name as agent_name,
  u.user_type,
  t.name as tool_name
FROM user_tools ut
JOIN users u ON ut.user_id = u.id
JOIN tools t ON ut.tool_id = t.id
WHERE t.name IN ('create_project_task', 'assign_task')
  AND u.user_type = 'agent'
ORDER BY u.name;

-- Should only return Unison Agent (orchestrator)
```

**Example Assignment Strategy:**

| Agent Type | Orchestration Tools | Execution Tools | Shared Tools |
|------------|-------------------|-----------------|--------------|
| **Unison (Orchestrator)** | ✅ create_project_task<br>✅ create_notification_task | ✅ create_artifact<br>✅ read_artifact | ✅ current_chat_history<br>✅ list_workspace_users |
| **Stock Research (Specialist)** | ❌ None | ✅ create_artifact<br>✅ search_financial_data<br>✅ analyze_stocks | ✅ current_chat_history<br>✅ list_workspace_users |
| **FDA Research (Specialist)** | ❌ None | ✅ create_artifact<br>✅ search_fda_pipeline<br>✅ analyze_clinical_trials | ✅ current_chat_history<br>✅ list_workspace_users |

**Impact of Proper Tool Assignment:**
- ✅ Prevents infinite delegation loops
- ✅ Clear separation of concerns (orchestration vs execution)
- ✅ Predictable agent behavior
- ✅ Easier debugging and system understanding
- ✅ Scalable multi-agent architecture

---

## 16. Database Access in Tools

### ✓ **Use Direct Supabase Client for Local Execution**

Since tools with `requires_sandbox: false` run in the Next.js process, use direct Supabase imports:

```typescript
// ✅ GOOD: Direct Supabase client import (local execution)
import { createClient } from "@/src/lib/supabase/client"

// Context variables provided by MCP execution
declare const chatId: string;

async function current_chat_historyTool(messageCount?: number): Promise<string> {
  // Validate context
  if (!chatId) {
    throw new Error("Current chat context not available");
  }
  
  // Create Supabase client directly
  const supabase = createClient()
  
  // Query database directly - faster, no HTTP overhead
  const { data, error } = await supabase
    .from("chat_messages")
    .select(`
      id, chat_id, user_id, content, created_at,
      users!user_id(name, user_type)
    `)
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(messageCount || 100)
  
  if (error) {
    throw new Error(`Failed to fetch chat history: ${error.message}`)
  }
  
  return JSON.stringify(data, null, 2)
}
```

### ✓ **Alternative: Use Service Layer Functions**

You can also import service functions directly:

```typescript
// ✅ GOOD: Import from service layer
import { getWorkspaceMembersWithUsers } from "@/src/services/supabase/workspace-members-service"

declare const workspaceId: string;

async function list_workspace_usersTool(userType?: string): Promise<string> {
  if (!workspaceId) {
    throw new Error("workspaceId not available from execution context");
  }
  
  // Call service function directly
  const members = await getWorkspaceMembersWithUsers(workspaceId, userType as 'human' | 'agent' | undefined)
  
  // Format results
  return formatMembersList(members)
}
```

### ✓ **Authentication in Tools**

Tools automatically get authenticated via the `agentJWT` context variable:

```typescript
// Context variables provided by MCP execution
declare const agentJWT: string | null;
declare const currentAgentId: string;

// The MCP route injects agentJWT into execution context
// Supabase client uses this JWT automatically for RLS enforcement
// See: src/services/_SERVICE_RULES.md section 9 for client authentication details
```

**Note**: Authentication is handled by the service layer. See `/src/services/_SERVICE_RULES.md` section 9 for details on Regular vs Agent vs Admin clients.

### ✓ **Why Direct Imports Work**

- **Local execution**: Tools run in Next.js process with `requires_sandbox: false`
- **No bundling issues**: Supabase client and services bundle cleanly
- **Better performance**: No HTTP overhead from API routes
- **Type safety**: Full TypeScript support with direct imports

---

## Summary

These rules ensure:
- **Clarity**: AI agents understand tool purposes and usage
- **Security**: No webhook loops, proper validation, safe execution
- **Consistency**: Predictable naming and behavior patterns
- **Reliability**: Proper error handling and edge case management
- **Maintainability**: Clear documentation and testing standards
- **Scalability**: Support for complex multi-tool workflows
- **Modern Architecture**: API routes, Modal compatibility, proper authentication
- **Context Awareness**: Automatic ID injection eliminates UUID guessing and parameter errors
- **Task Lifecycle**: Tools like create_project_task handle complete workflows (draft→step→ready)
- **Role-Based Access**: Agent-specific tool assignment via user_tools table for fine-grained control
- **Loop Prevention**: Message linking and orchestration tool restrictions prevent infinite loops

**Core Principle**: MCP tools are the AI agent's interface to the system. Design them from the AI's perspective - clear, explicit, safe, and predictable.

**Key Tool Patterns:**
- **Section 6**: Message linking with `project_task_step_id` - prevents trigger loops (CRITICAL)
- **Section 12**: Context variables eliminate parameter guessing (workspaceId, chatId, currentAgentId, etc.)
- **Section 14**: create_project_task - Automatically handles draft→step→ready lifecycle with delegation support
- **Section 15**: Orchestration vs Execution tool assignment - prevents delegation loops (CRITICAL)
- **Section 16**: Direct Supabase client imports for local execution (faster than API routes)