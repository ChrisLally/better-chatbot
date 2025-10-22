# Supabase Service Layer Rules & Best Practices

*Supabase-specific guidelines for database service architecture*

**See also**: `@/docs/PATTERNS/service-rules.md` for universal service layer rules

## Core Philosophy

**Principle**: Supabase services are pure functions for database operations. They handle data access logic while keeping business logic in hooks and components.

**Note**: This document covers Supabase-specific patterns only. For general service rules (imports, error handling, naming conventions, etc.), see `@/docs/PATTERNS/service-rules.md`.

## 1. Type Imports (Critical Rule)

### **ALWAYS import types from `@/src/types/supabase.ts`**
- **Rule**: Use auto-generated Supabase types to catch errors when database updates
- **Rule**: Use helper types for readability: `Tables<"table_name">`, `TablesInsert<"table_name">`, `TablesUpdate<"table_name">`, `Enums<"enum_name">`
- **Rule**: Import `Enums` when using database enum types in function parameters or extended types
- **Rule**: Extend base types when additional fields needed (like joins)

```typescript
// GOOD: Import and use generated types
import { Database } from "@/src/types/supabase"
// OR use helper types (preferred)
import { Tables, TablesInsert, TablesUpdate, Enums } from "@/src/types/supabase"

// Use for:
// - Tables<"table_name"> for Row types
// - TablesInsert<"table_name"> for Insert types
// - TablesUpdate<"table_name"> for Update types
// - Enums<"enum_name"> for enum types

type Chat = Tables<"chats">
type ChatInsert = TablesInsert<"chats">
type ChatUpdate = TablesUpdate<"chats">

// GOOD: Extend for joined data
type ChatWithMessages = Tables<"chats"> & {
  chat_messages?: Array<{ id: string; content: string }> | null
}

// GOOD: Using Enums for function parameters
export async function getKnowledgeByType(
  knowledgeType: Enums<"knowledge_category_enum">,
  scope?: KnowledgeScope
): Promise<Knowledge[]>

// GOOD: Using Enums in extended types
export type WorkspaceAIModelWithModel = WorkspaceAIModel & {
  ai_models: {
    capabilities: Enums<"ai_model_capability_enum">[]
    // ... other fields
  } | null
}

// ❌ BAD: Manual type definitions
interface Chat {
  id: string
  name: string
  // ... duplicating database schema
}

// ❌ BAD: Missing Enums import when using enum types
// This will cause TypeScript errors when enum is used but not imported
```

## 2. Explicit Column Selection (Never Use *)

### **NEVER use `SELECT *` in Supabase queries**
- **Rule**: Always specify columns explicitly for performance and type safety
- **Rule**: Include all fields needed by the return type
- **Benefit**: Better performance, type safety, future-proof against schema changes

```typescript
// GOOD: Explicit column selection
.select("id, name, description, archived_at, workspace_id, team_id, project_id, created_at, updated_at")

// GOOD: Explicit joins with column selection
.select(`
  id, name, description, created_at, updated_at,
  projects (
    id,
    name
  )
`)

// ❌ BAD: Using SELECT *
.select("*")
```

## 3. Service File Naming Convention

### **Consistent naming patterns for services**
- **Core Rule**: Service files are named after the **primary table** they query
- **Pattern**: `{table_name}-service.ts` for single table operations
- **Pattern**: `{relationship_table}-service.ts` for relationship/junction tables
- **Location**: All database services in `src/services/supabase/`
- **Location**: Non-database services directly in `src/services/`

### ⚠️ **Function placement by primary operation, not sub-queries**
- **Rule**: Functions belong in the service file matching their **primary operation and return type**
- **Rule**: Sub-queries and joins for data enrichment are allowed and expected
- **Rule**: If a function's main purpose is to CREATE/READ/UPDATE/DELETE records in `team_members`, it belongs in `team-members-service.ts`
- **Rule**: If a function returns `Team[]` but uses `team_members` for filtering/joining, it can stay in `teams-service.ts`

```
✅ GOOD Examples:
src/services/supabase/chats-service.ts        # Functions that query 'chats' table
src/services/supabase/chat-members-service.ts # Functions that query 'chat_members' table
src/services/supabase/teams-service.ts        # Functions that query 'teams' table
src/services/supabase/team-members-service.ts # Functions that query 'team_members' table
src/services/supabase/workspace-members-service.ts # Functions that query 'workspace_members' table
src/services/ai-service.ts (non-database)

✅ GOOD Function Placement:
// in team-members-service.ts (primary operations on team_members table)
export async function getTeamMembers(teamId: string): Promise<TeamMember[]>
export async function addTeamMember(teamId: string, userId: string): Promise<TeamMember>
export async function removeTeamMember(teamId: string, userId: string): Promise<void>
export async function isTeamMember(teamId: string, userId: string): Promise<boolean>

// in teams-service.ts (primary operations on teams table)
export async function getTeams(): Promise<Team[]>
export async function createTeam(team: TeamInsert): Promise<Team>
export async function updateTeam(teamId: string, updates: TeamUpdate): Promise<Team>

✅ GOOD Sub-queries (legitimate exceptions):
// in chats-service.ts - returns Chat[], uses chat_members for filtering
export async function getUserChats(userId: string): Promise<Chat[]> {
  return supabase.from("chat_members").select("chats(*)").eq("user_id", userId)
}

// in workspaces-service.ts - returns Workspace[], uses workspace_members for filtering
export async function getWorkspacesByUser(userId: string): Promise<Workspace[]> {
  return supabase.from("workspace_members").select("workspaces(*)").eq("user_id", userId)
}

❌ BAD Examples:
src/services/chat.ts                          # Missing -service suffix
src/services/supabase/chatService.ts         # Wrong casing (camelCase vs kebab-case)
src/services/database/chats.ts               # Wrong directory structure

❌ BAD Function Placement:
// WRONG: team member CRUD operations in teams-service.ts
// These primarily operate on team_members table, so belong in team-members-service.ts
export async function getTeamMembers(teamId: string) // primary operation on team_members
export async function addTeamMember(teamId: string, userId: string) // inserts into team_members
export async function removeTeamMember(teamId: string, userId: string) // deletes from team_members

// WRONG: workspace CRUD operations in workspace-members-service.ts
// These primarily operate on workspaces table, so belong in workspaces-service.ts
export async function getWorkspace(id: string) // primary operation on workspaces
export async function createWorkspace(data: WorkspaceInsert) // inserts into workspaces
```

### **Why This Pattern Matters**
- **Data Access Clarity**: Immediately know which table a function modifies
- **Maintenance**: When table schema changes, you know exactly which file contains affected functions
- **Performance**: Functions grouped by their actual database operations
- **Consistency**: Predictable file organization across the entire codebase

## 4. Supabase Error Handling Patterns

### **Supabase-specific error handling**
- **Rule**: Handle `PGRST116` error code for "no matching row" scenarios
- **Rule**: Return `null` for single items not found, empty array `[]` for collections

```typescript
// GOOD: Proper error handling
export async function getChat(chatId: string): Promise<Chat | null> {
  const { data, error } = await supabase
    .from("chats")
    .select("id, name, description, created_at, updated_at")
    .eq("id", chatId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // No matching row found
    }
    console.error("Error fetching chat:", error)
    throw new Error("Failed to fetch chat")
  }

  return data
}

// GOOD: Collection returns empty array
export async function getChatsByWorkspace(workspaceId: string): Promise<Chat[]> {
  const { data, error } = await supabase
    .from("chats")
    .select("id, name, description, created_at, updated_at")
    .eq("workspace_id", workspaceId)

  if (error) {
    console.error("Error fetching chats:", error)
    throw new Error("Failed to fetch chats")
  }

  return data || [] // Never return null for collections
}
```

## 5. Supabase Client Parameter Pattern

### **Support dependency injection for Supabase client**
- **Rule**: Accept optional `supabaseClient` parameter
- **Rule**: Default to `createClient()` if not provided
- **Pattern**: Place client parameter last, make it optional

```typescript
// GOOD: Client parameter pattern
export async function getUser(
  userId: string,
  supabaseClient?: ReturnType<typeof createClient>
): Promise<User | null> {
  const supabase = supabaseClient || createClient()
  // ... implementation
}
```

## 6. Query Joins and Data Transformation

### **Handle joins and data transformation properly**
- **Rule**: Use explicit joins with proper column selection
- **Rule**: Handle joined data transformations in TypeScript, not SQL
- **Pattern**: Use Supabase's nested selection syntax
- **Rule**: Map and filter joined data after query execution

```typescript
// GOOD: Explicit join with transformation
export async function getChatsByWorkspace(workspaceId: string): Promise<Chat[]> {
  const { data, error } = await supabase
    .from("chats")
    .select(`
      id, name, description, archived_at, workspace_id, team_id, project_id, created_at, updated_at,
      projects (
        id,
        name
      ),
      chat_messages (
        id, content, created_at
      )
    `)
    .eq("workspace_id", workspaceId)

  // Process data in TypeScript after query
  const processedChats = (data || []).map(chat => {
    const messages = (chat as any).chat_messages || []
    const latestMessage = messages.length > 0
      ? messages.reduce((latest: any, current: any) =>
          new Date(current.created_at) > new Date(latest.created_at) ? current : latest
        )
      : null

    return {
      ...chat,
      latest_message: latestMessage,
      chat_messages: undefined // Remove from response
    }
  })

  return processedChats
}
```

## 7. Admin Operations Separation

### **Separate admin operations from regular client operations**
- **Rule**: Use `getSupabaseAdmin()` for admin operations (user creation, etc.)
- **Rule**: Keep admin operations clearly separated
- **Rule**: Always handle admin client creation errors
- **Rule**: Use admin client for operations requiring elevated permissions

```typescript
// GOOD: Admin operation separation
export async function createAgent(options: {
  name?: string
  workspaceId?: string
}): Promise<{ success: true; agentId: string } | { success: false; error: string }> {
  try {
    // Get admin client for privileged operation
    const supabaseAdmin = getSupabaseAdmin()

    // Create agent in auth.users
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: `agent-${Date.now()}@team.gen`,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: {
        user_type: 'agent',
        name: options.name || 'Unison Agent'
      }
    })

    if (authError || !authUser.user) {
      return { success: false, error: `Failed to create auth user: ${authError?.message}` }
    }

    return { success: true, agentId: authUser.user.id }
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}
```

### **Agent Authentication Pattern**

```typescript
// GOOD: Agent client for webhook operations
import { createClientWithAgentJWT } from "@/src/lib/supabase/server"

export async function processAgentTask(agentId: string, taskId: string) {
  // Get agent's cached JWT
  const agentJWT = await getCachedAgentJWT(agentId)
  if (!agentJWT) {
    throw new Error('Agent JWT not available')
  }

  // Create authenticated client - RLS enforced as agent
  const supabase = createClientWithAgentJWT(agentJWT)

  // Agent can only see/modify what their RLS policies allow
  const { data } = await supabase
    .from('project_tasks')
    .select('id, title, description')
    .eq('assigned_user_id', agentId) // RLS automatically enforces this

  return data
}
```

### **Three Client Types - Use the Right One**

**1. Regular Client** (`createClient()`)
- Uses user's session from cookies
- RLS enforced based on authenticated user
- Use for: Regular user operations, UI data fetching

**2. Agent Client** (`createClientWithAgentJWT(jwt)`)
- Uses agent JWT token for authentication
- RLS enforced based on agent user permissions
- Use for: Webhook handlers, MCP tools, AI agent operations

**3. Admin Client** (`getSupabaseAdmin()`)
- Uses service role key (bypasses RLS)
- Full database access, NO RLS enforcement
- Use for: User creation, admin operations, system tasks

## 8. Professional Fields Integration

### **Consistent handling of user professional fields**
- **Rule**: Include professional fields in user queries: `professional_title`, `professional_mission`, `expertise_areas`, `decision_making_authority`
- **Rule**: Provide context-building utilities for AI integration
- **Rule**: Handle null JWT fields in user type mappings

```typescript
// GOOD: Include professional fields in user queries
export async function getUser(userId: string, supabaseClient?: any): Promise<User | null> {
  const supabase = supabaseClient || createClient()

  const { data, error } = await supabase
    .from("users")
    .select(`
      id, name, avatar_url, timezone, user_type, created_at, updated_at,
      current_workspace_id, description,
      professional_title, professional_mission, expertise_areas, decision_making_authority
    `)
    .eq("id", userId)
    .single()

  // Handle JWT fields for type compatibility
  return data ? {
    ...data,
    agent_jwt: null,
    agent_jwt_expires_at: null,
    agent_email: null
  } : null
}

// GOOD: Context-building utility
export function buildRoleAwareSystemPrompt(user: User): string {
  if (!user.professional_title) {
    return `You are ${user.name}.`
  }

  const expertiseText = user.expertise_areas?.length
    ? `EXPERTISE: ${user.expertise_areas.join(', ')}`
    : ''

  return `
You are ${user.professional_title}.

${user.professional_mission ? `MISSION: ${user.professional_mission}` : ''}

${expertiseText}

${user.decision_making_authority ? `AUTHORITY: ${user.decision_making_authority}` : ''}
  `.trim().replace(/\n\s*\n/g, '\n\n')
}
```

## 9. Avoid N+1 Query Patterns (Performance Critical)

### **Always fetch related data with joins, not separate queries**
- **Rule**: Use Supabase joins to fetch related data in a single query
- **Rule**: Never fetch collections then loop to fetch related data
- **Anti-pattern**: Fetching messages, then fetching mentions for each message
- **Best practice**: Include related data in the initial query using joins

```typescript
// ❌ BAD: N+1 query pattern (1 query + N queries for each message)
export async function getChatMessages(chatId: string) {
  const { data } = await supabase
    .from("chat_messages")
    .select("id, content, created_at, user_id")
    .eq("chat_id", chatId)

  // Then in component: messages.map(msg => fetchMentions(msg.id))
  // This creates N additional queries - one for each message!
  return data
}

// ✅ GOOD: Single query with joins (fetches everything at once)
export async function getChatMessages(chatId: string) {
  const { data } = await supabase
    .from("chat_messages")
    .select(`
      id, content, created_at, user_id,
      users!user_id(name, user_type),
      chat_message_mentions(
        id,
        mentioned_artifact_id,
        mentioned_user_id,
        artifacts:mentioned_artifact_id(id, title, content_format, status),
        users:mentioned_user_id(id, name, user_type)
      )
    `)
    .eq("chat_id", chatId)

  // Process joined data (Supabase returns arrays for joins)
  const processedMessages = (data || []).map(msg => ({
    ...msg,
    users: Array.isArray(msg.users) ? msg.users[0] || null : msg.users,
    chat_message_mentions: msg.chat_message_mentions?.map(mention => ({
      ...mention,
      artifacts: Array.isArray(mention.artifacts) ? mention.artifacts[0] || null : mention.artifacts,
      users: Array.isArray((mention as any).users) ? (mention as any).users[0] || null : (mention as any).users
    })) || null
  }))

  return processedMessages
}
```

### **Impact on Components and Hooks**
- Components should receive complete data from hooks
- Avoid `useEffect` for fetching related data that could be joined
- Pass related data as props instead of fetching separately
- This eliminates waterfall requests and improves performance

```typescript
// ❌ BAD: Component fetching related data separately (N+1 pattern)
function MessageBubble({ messageId }: { messageId: string }) {
  const [mentions, setMentions] = useState([])

  useEffect(() => {
    // This creates an additional query for EVERY message rendered!
    fetchMentions(messageId).then(setMentions)
  }, [messageId])

  return <div>{/* render with mentions */}</div>
}

// ✅ GOOD: Related data passed from parent (already fetched with message)
function MessageBubble({
  messageId,
  artifacts
}: {
  messageId: string
  artifacts?: Array<{ id: string; title: string }> | null
}) {
  // Mentions already available, no extra fetch needed
  return <div>{/* render with artifacts */}</div>
}
```

### **Performance Benefits**
- **Single database query** instead of N+1 queries
- **Reduced latency** - no waterfall of requests
- **Lower database load** - fewer connections and queries
- **Better caching** - React Query caches complete data structure
- **Improved UX** - data loads all at once, no loading spinners for each item

## 10. ID-Based Entity Lookups (Critical for Database)

### ⚠️ **NEVER use name-based entity lookups in database queries**
- **Rule**: Use entity IDs (UUIDs) for all database lookups and relationships
- **Rule**: Never use database queries with name WHERE clauses
- **Reason**: Names can change, IDs are immutable and guaranteed unique

```typescript
// ⚠️ CRITICAL VIOLATION: Database query with name WHERE clause
.from("users")
.select("*")
.eq("name", agentName)

// ✅ GOOD: Database query with ID WHERE clause
.from("users")
.select("id, name, user_type, avatar_url")
.eq("id", agentId)

// ✅ GOOD: Store entity IDs in data structures
interface SubtaskSpec {
  assigned_agent_id: string  // Store ID, not name
  task_description: string
}
```

## 11. Task Timestamp Management (Application-Level)

### **Set `started_at` and `completed_at` timestamps when status changes**
- **Rule**: Set `started_at` when status changes to `'working'` (application-level, not database trigger)
- **Rule**: Set `completed_at` when status changes to `'completed'`
- **Rule**: Only set timestamp if it's not already set (avoid overwriting on retries)
- **Reason**: Timeline ordering depends on `started_at` to respect task dependencies

```typescript
// ✅ GOOD: Set started_at when creating task with 'working' status
const { data: relatedTask } = await supabase
  .from("project_tasks")
  .insert({
    title: taskTitle,
    status: 'working',
    started_at: new Date().toISOString(),  // Set immediately when starting
    assigned_by_user_id: agentId,
  })

// ✅ GOOD: Set started_at when updating status to 'working'
await supabase
  .from("project_tasks")
  .update({
    status: 'working',
    started_at: new Date().toISOString(),  // Set when task starts processing
    updated_at: new Date().toISOString()
  })
  .eq("id", taskId)

// ✅ GOOD: Check before setting (avoid overwriting existing timestamp)
export async function updateProjectTask(taskId: string, taskData: { status?: string }) {
  const updateData: any = {}

  if (taskData.status === 'working') {
    // Only set started_at if it's not already set
    const { data: currentTask } = await supabase
      .from("project_tasks")
      .select("started_at")
      .eq("id", taskId)
      .single()

    if (currentTask && !currentTask.started_at) {
      updateData.started_at = new Date().toISOString()
    }
  }

  updateData.status = taskData.status
  // ... rest of update
}

// ✅ GOOD: Set completed_at when marking task complete
await supabase
  .from("project_tasks")
  .update({
    status: 'completed',
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
  .eq("id", taskId)

// ❌ BAD: Forgetting to set started_at when status changes
await supabase
  .from("project_tasks")
  .update({ status: 'working' })  // Missing started_at!
  .eq("id", taskId)
```

### **Why Application-Level Instead of Database Triggers?**
- **Visibility**: Developers can see timestamp logic in application code
- **Simplicity**: No hidden database behavior
- **Consistency**: Matches existing pattern (we already do this for `completed_at`)
- **Limited Code Paths**: Only 2-3 places where status changes to `'working'`

### **Timeline Ordering Dependency**
- The chat timeline uses `started_at || created_at` for task positioning
- Tasks appear in timeline when they **start working**, not when created as drafts
- This automatically respects task dependencies (blocked tasks don't start until blockers complete)
- See `getChatContent()` in `chat-messages-service.ts` for implementation

## Summary

**Supabase-Specific Key Principles**:
- **Type Safety**: Use auto-generated Supabase types (Tables, TablesInsert, TablesUpdate, Enums)
- **Performance**: Always use explicit column selection (never SELECT *)
- **File Organization**: Name services after primary table, organize by primary operation
- **Error Handling**: Handle PGRST116 error code, return null for singles, [] for collections
- **Client Injection**: Support optional supabaseClient parameter for testing
- **Query Joins**: Use explicit joins, transform data in TypeScript
- **Admin Operations**: Separate admin operations (getSupabaseAdmin) from regular client
- **Professional Fields**: Include user professional fields for AI context
- **ID-Based Lookups**: Never query by name, always use entity IDs
- **Task Timestamps**: Set `started_at`/`completed_at` when status changes (application-level)

**Related Documentation**:
- `@/docs/PATTERNS/service-rules.md` - Universal service layer rules (imports, error handling, naming, etc.)

**Core Principle**: Supabase services are the database access layer. Keep them pure, type-safe, and focused on efficient database operations. See `service-rules.md` for universal patterns that apply to all services.
