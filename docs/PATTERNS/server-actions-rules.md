# Server Actions Rules & Best Practices

*Guidelines for using Next.js Server Actions for mutations, cache invalidation, and business logic*

## Core Philosophy

**Principle**: Server Actions are reserved for operations that require:
1. **Cache Revalidation** - Invalidating SWR/client caches after mutations
2. **Complex Business Logic** - Multi-step operations with validation
3. **Access Control** - Operations requiring special authorization checks
4. **Side Effects** - Operations requiring special side-effect handling

Simple read operations should use direct service imports in Server Components or hooks instead.

## When to Use Server Actions vs Direct Service Imports

### ✅ USE SERVER ACTIONS FOR:

```typescript
// 1. Mutations with cache revalidation
export async function createChatAction(data: ChatInsert): Promise<Chat> {
  const result = await createChat(data)
  revalidateTag('chats')                 // Invalidate chats collection
  revalidateTag(`chat-${result.id}`)     // Invalidate specific chat
  return result
}

// 2. Complex operations with multiple steps
export async function duplicateAgentAction(agentId: string): Promise<Agent> {
  const agent = await getAgent(agentId)
  if (!agent) throw new Error('Agent not found')

  const duplicate = await createAgent({
    name: `${agent.name} (Copy)`,
    config: agent.config,
  })

  // Copy related data
  await copyAgentTools(agent.id, duplicate.id)

  revalidateTag('agents')
  revalidateTag(`agent-${duplicate.id}`)
  return duplicate
}

// 3. Operations with access control checks
export async function deleteAgentAction(agentId: string): Promise<void> {
  const user = await getSupabaseUser()
  const agent = await getAgent(agentId)

  if (!agent || agent.user_id !== user.id) {
    throw new Error('Unauthorized')
  }

  await deleteAgent(agentId)
  revalidateTag('agents')
  revalidateTag(`agent-${agentId}`)
}

// 4. AI model calls (complex external integrations)
export async function generateAgentWithAIAction(
  description: string
): Promise<Agent> {
  const user = await getSupabaseUser()

  const agentConfig = await generateAgentConfig(description)
  const agent = await createAgent({
    user_id: user.id,
    config: agentConfig,
  })

  revalidateTag('agents')
  return agent
}
```

### ❌ DO NOT USE SERVER ACTIONS FOR:

```typescript
// 1. Simple read-only operations
// ❌ BAD: Unnecessary Server Action wrapper
export async function getAgentsAction(userId: string): Promise<Agent[]> {
  return selectAgents(userId, ['all'], 100)
}

// ✅ GOOD: Call service directly in hook
export function useAgents({ filters, limit }: UseAgentsOptions) {
  return useSWR(
    ['agents', filters, limit],
    () => selectAgents(currentUser.id, filters, limit)
  )
}

// 2. Pass-through functions without business logic
// ❌ BAD: Direct pass-through
export async function updateWorkflowAction(id: string, updates: WorkflowUpdate) {
  return updateWorkflow(id, updates)
}

// ✅ GOOD: If mutations needed, add cache revalidation
export async function updateWorkflowAction(id: string, updates: WorkflowUpdate) {
  const result = await updateWorkflow(id, updates)
  revalidateTag('workflows')
  revalidateTag(`workflow-${id}`)
  return result
}

// 3. Operations that belong in the service layer
// ❌ BAD: Business logic in Server Action
export async function processWorkflowAction(id: string) {
  const workflow = await getWorkflow(id)
  const modified = { ...workflow, status: 'processing' }
  return updateWorkflow(id, modified)
}

// ✅ GOOD: Move complex logic to service
export async function processWorkflow(workflow: Workflow): Promise<Workflow> {
  const modified = { ...workflow, status: 'processing' }
  return updateWorkflow(workflow.id, modified)
}

export async function processWorkflowAction(id: string) {
  const workflow = await getWorkflow(id)
  const result = await processWorkflow(workflow)
  revalidateTag('workflows')
  return result
}
```

## File Organization

```
src/app/actions/
├── chat-actions.ts           # Chat operations (threads, messages)
├── workflow-actions.ts       # Workflow operations
├── archive-actions.ts        # Archive operations
├── agent-actions.ts          # Agent operations
├── bookmark-actions.ts       # Bookmark operations
└── {domain}-actions.ts       # Additional action files as needed
```

## Cache Revalidation Patterns

### Types of Caches

This application uses two types of caching that need consideration:

1. **Next.js Response Cache** - Automatic caching of RSC/API routes
   - Invalidated with `revalidateTag()` and `revalidatePath()`
   - Affects client-side SWR hooks and server components

2. **Server-Side Application Cache** - Redis/memory cache for expensive operations
   - Manually invalidated with `serverCache.delete(cacheKey)`
   - Used for things like agent instructions, MCP customizations
   - Need to invalidate when data changes

### Standard Mutation Pattern

All mutation Server Actions should follow this structure:

```typescript
export async function updateEntityAction(
  id: string,
  updates: EntityUpdate
): Promise<Entity> {
  // 1. Validate input
  if (!id) throw new Error('ID is required')

  // 2. Perform authorization (if needed)
  const user = await getSupabaseUser()
  const entity = await getEntity(id)
  if (entity.user_id !== user.id) {
    throw new Error('Unauthorized')
  }

  // 3. Execute mutation
  const result = await updateEntity(id, updates)

  // 4. Revalidate caches
  revalidateTag('entities')              // Collection
  revalidateTag(`entity-${id}`)          // Individual item

  return result
}
```

### Cache Key Naming Convention

Use consistent tag names that match SWR query keys:

```typescript
// Entity Collection
revalidateTag('entities')           // Generic collection
revalidateTag('entities-user-123')  // Scoped collection

// Individual Entity
revalidateTag(`entity-${id}`)       // Single item by ID

// Filtered/Related Collections
revalidateTag('threads')                    // All threads
revalidateTag(`thread-${threadId}-messages`) // Messages for thread
revalidateTag(`archive-items-${archiveId}`) // Items in archive

// Compound Keys
revalidateTag('workflows')                          // All workflows
revalidateTag(`workflow-${id}`)                     // Single workflow
revalidateTag(`workflow-structure-${id}`)          // Workflow structure
```

### Real-World Examples

#### Create Operation
```typescript
export async function createThreadAction(
  data: ThreadInsert
): Promise<Thread> {
  const result = await createThread(data)

  // Invalidate the threads collection and user's threads
  revalidateTag('threads')
  revalidateTag(`user-threads-${data.user_id}`)

  return result
}
```

#### Update Operation
```typescript
export async function updateArchiveAction(
  id: string,
  updates: ArchiveUpdate
): Promise<Archive> {
  const result = await updateArchive(id, updates)

  // Invalidate both collection and specific item
  revalidateTag('archives')
  revalidateTag(`archive-${id}`)

  return result
}
```

#### Delete Operation
```typescript
export async function deleteWorkflowAction(id: string): Promise<void> {
  await deleteWorkflow(id)

  // Invalidate collection and specific item
  revalidateTag('workflows')
  revalidateTag(`workflow-${id}`)
}
```

#### Related Collection Updates
```typescript
export async function addArchiveItemAction(
  archiveId: string,
  itemId: string
): Promise<ArchiveItem> {
  const result = await addArchiveItem(archiveId, itemId)

  // Invalidate related collections
  revalidateTag('archives')
  revalidateTag(`archive-${archiveId}`)
  revalidateTag(`archive-items-${archiveId}`)  // Specific to this archive

  return result
}
```

#### Server-Side Cache Invalidation
```typescript
import { serverCache } from '@/lib/cache'
import { CacheKeys } from '@/lib/cache/cache-keys'

export async function updateAgentAction(
  agentId: string,
  updates: AgentUpdate
): Promise<Agent> {
  const result = await updateAgent(agentId, updates)

  // Invalidate Next.js response cache
  revalidateTag('agents')
  revalidateTag(`agent-${agentId}`)
  revalidatePath('/agents')

  // Invalidate server-side application cache
  // Important for cached data like agent instructions used in API routes
  await serverCache.delete(CacheKeys.agentInstructions(agentId))

  return result
}
```

**Why both?**
- `revalidateTag()` handles client-side SWR cache and RSC revalidation
- `serverCache.delete()` handles server-side caches used by API routes and long-lived processes

## Error Handling Patterns

### Standard Error Handling

```typescript
export async function createEntityAction(
  data: EntityInsert
): Promise<Entity> {
  try {
    // Validate required fields
    if (!data.name) {
      throw new Error('Name is required')
    }

    // Perform operation
    const result = await createEntity(data)

    // Revalidate caches
    revalidateTag('entities')

    return result
  } catch (error) {
    console.error('[ERROR] Failed to create entity:', error)
    throw error
  }
}
```

### Authorization Errors

```typescript
export async function updateEntityAction(
  id: string,
  updates: EntityUpdate
): Promise<Entity> {
  const user = await getSupabaseUser()
  const entity = await getEntity(id)

  // Check ownership
  if (entity.user_id !== user.id) {
    throw new Error('Unauthorized: You do not have permission to update this entity')
  }

  // Proceed with update
  const result = await updateEntity(id, updates)
  revalidateTag(`entity-${id}`)

  return result
}
```

### Complex Validation

```typescript
export async function updateWorkflowStructureAction(
  workflowId: string,
  structure: WorkflowStructure
): Promise<WorkflowStructure> {
  // Validate workflow exists
  const workflow = await getWorkflow(workflowId)
  if (!workflow) {
    throw new Error('Workflow not found')
  }

  // Validate structure integrity
  const isValid = validateWorkflowStructure(structure)
  if (!isValid) {
    throw new Error('Invalid workflow structure')
  }

  // Perform update
  const result = await updateWorkflowStructure(workflowId, structure)
  revalidateTag(`workflow-structure-${workflowId}`)

  return result
}
```

## Type Safety

### Proper Server Action Typing

```typescript
import type { Chat, ChatInsert, ChatUpdate } from '@/src/types/chat-types'

export async function createChatAction(
  data: ChatInsert
): Promise<Chat> {
  const result = await createChat(data)
  revalidateTag('chats')
  return result
}

export async function updateChatAction(
  id: string,
  updates: ChatUpdate
): Promise<Chat> {
  const result = await updateChat(id, updates)
  revalidateTag('chats')
  revalidateTag(`chat-${id}`)
  return result
}
```

### Using with Hooks

```typescript
// In a hook
const mutation = useMutation({
  mutationFn: (data: ChatInsert) => createChatAction(data),
  onSuccess: (newChat) => {
    // Handle success
  },
  onError: (error) => {
    console.error('Failed to create chat:', error)
  },
})
```

## Common Patterns

### Mutation with Zustand Store Sync

```typescript
export async function createAgentAction(
  data: AgentInsert
): Promise<Agent> {
  const user = await getSupabaseUser()
  const agent = await createAgent({
    ...data,
    user_id: user.id,
  })

  // Revalidate for client-side sync
  revalidateTag('agents')
  revalidateTag(`user-agents-${user.id}`)

  return agent
}
```

### Multi-Step Operations

```typescript
export async function duplicateAgentAction(
  agentId: string
): Promise<Agent> {
  // Step 1: Get original
  const original = await getAgent(agentId)
  if (!original) throw new Error('Agent not found')

  // Step 2: Create duplicate
  const duplicate = await createAgent({
    name: `${original.name} (Copy)`,
    config: original.config,
  })

  // Step 3: Copy related data (tools, etc.)
  if (original.tools && original.tools.length > 0) {
    await copyAgentTools(original.id, duplicate.id)
  }

  // Step 4: Revalidate caches
  revalidateTag('agents')
  revalidateTag(`agent-${duplicate.id}`)

  return duplicate
}
```

### Conditional Mutations

```typescript
export async function updateBookmarkAction(
  itemId: string,
  bookmarked: boolean
): Promise<Bookmark | void> {
  if (bookmarked) {
    const result = await createBookmark(itemId)
    revalidateTag('bookmarks')
    return result
  } else {
    await removeBookmark(itemId)
    revalidateTag('bookmarks')
  }
}
```

## Best Practices Checklist

- ✅ Server Actions only used for mutations or complex logic
- ✅ All mutations include `revalidateTag()` calls (Next.js cache)
- ✅ Server-side caches invalidated with `serverCache.delete()` (if applicable)
- ✅ Cache tags match SWR query keys used in hooks
- ✅ Both collection and individual item tags invalidated for mutations
- ✅ Authorization checks performed before mutations
- ✅ Errors logged and re-thrown appropriately
- ✅ Related collections invalidated (e.g., parent-child relationships)
- ✅ Proper TypeScript types for all parameters and returns
- ✅ No unnecessary pass-through functions
- ✅ Complex logic stays in services, Server Actions orchestrate

## Related Documentation

- `@/docs/PATTERNS/service-rules.md` - Service layer patterns
- `@/docs/PATTERNS/hooks-rules.md` - Hook patterns and SWR usage
- `@/src/services/supabase/_SUPABASE_SERVICE_RULES.md` - Database service rules

## Summary

**Server Actions are not a data-fetching mechanism.** They are orchestration points for:
- **Mutations** with cache revalidation
- **Complex workflows** with multiple steps
- **Authorization** checks and security boundaries
- **Business logic** too complex for service layer

Keep Server Actions thin and focused on orchestration. Complex logic belongs in services.
