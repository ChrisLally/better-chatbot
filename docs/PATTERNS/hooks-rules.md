# Hook Layer Rules & Best Practices

*Comprehensive guidelines for maintaining clean, performant, and maintainable React hooks architecture*

## Core Philosophy

**Principle**: Hooks are the bridge between UI components and data layer. They handle state management, data fetching, caching, and provide clean abstractions for React components.

## 1. File Organization & Naming

### **File Structure**
- **Supabase Hooks**: `src/hooks/supabase/` for all database-related hooks
- **General Hooks**: `src/hooks/` for non-database specific hooks
- **Naming Convention**: `use-{entity}.tsx` for data hooks, `use-{functionality}.ts` for utility hooks

```
src/hooks/
├── supabase/              # Database-related hooks
│   ├── use-chats.tsx      # Chat CRUD operations
│   ├── use-chat-messages.tsx  # Message operations with real-time
│   └── use-workspaces.tsx # Workspace management
├── use-debounce.ts        # Utility hooks
├── use-keyboard-shortcuts.ts
└── index.ts               # Export barrel
```

## 2. Data Fetching with SWR (Critical Rule)

### **ALWAYS use SWR for data fetching**
- **Rule**: Use `useSWR` for read operations with automatic revalidation
- **Rule**: Use `useSWRMutation` for write operations
- **Rule**: Include proper cache keys matching Server Action revalidation tags
- **Rule**: Set appropriate `revalidateOnFocus` and `dedupingInterval` based on data freshness

**Current Implementation**: We use **SWR** for client-side caching and revalidation.

**Future Consideration**: We may evaluate TanStack Query (React Query) for more advanced features, but SWR currently meets our needs with simpler API surface and excellent integration with Next.js Server Components.

```typescript
// ✅ GOOD: Standard useSWR pattern
export function useChat(chatId: string | null) {
  return useSWR(
    chatId ? ['chats', chatId] : null,
    () => chatId ? getChat(chatId) : null,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Consider fresh for 1 minute
    }
  )
}

// ✅ GOOD: Collection with dependency
export function useUserChats() {
  const { user } = useAuth()
  const { state } = useWorkspaces()
  const workspaceId = state.currentWorkspace?.id

  return useSWR(
    user?.id && workspaceId ? ['chats', 'user', user.id, workspaceId] : null,
    () => {
      if (!user?.id || !workspaceId) return []
      return getUserChats(user.id, workspaceId)
    },
    { dedupingInterval: 30000 }
  )
}

// ❌ BAD: Direct service calls without SWR
export function useChat(chatId: string) {
  const [chat, setChat] = useState(null)
  useEffect(() => {
    getChat(chatId).then(setChat)
  }, [chatId])
  return chat
}
```

## 3. Cache Key Patterns

### **Consistent and hierarchical cache keys**
- **Pattern**: `['entity', ...identifiers, ...filters]`
- **Rule**: Start with entity name, add IDs/filters in dependency order
- **Rule**: Include all dependencies that affect the query result
- **Rule**: Match cache keys with Server Action `revalidateTag()` calls for automatic synchronization

```typescript
// ✅ GOOD: Hierarchical cache keys that match Server Action tags
['chats', chatId]                              // Single chat → revalidateTag(`chat-${chatId}`)
['chats', 'user', userId, workspaceId]         // User's chats → revalidateTag('chats')
['messages', chatId]                           // Messages for chat → revalidateTag(`messages-${chatId}`)
['projects', teamId, workspaceId]              // Projects with dependencies → revalidateTag('projects')
['workspace-ai-models', workspaceId, 'enabled'] // Filtered queries → revalidateTag('ai-models')

// ❌ BAD: Flat or inconsistent keys
['chat-' + chatId]
['userChats']
[chatId, 'messages']
```

## 4. Mutation Patterns with Server Actions

### **Using Server Actions for mutations**
- **Rule**: Call Server Actions for all write operations
- **Rule**: Server Actions handle cache revalidation via `revalidateTag()`
- **Rule**: Use `useSWRMutation` for optimistic updates and error handling
- **Rule**: Match cache keys with Server Action revalidation tags

```typescript
// ✅ GOOD: Standard SWR mutation calling Server Action
import { useSWRMutation } from 'swr'
import { createChatAction } from '@/src/app/actions/chat-actions'

export function useCreateChat() {
  return useSWRMutation(
    ['chats'],
    async (_, { arg: data }: { arg: ChatInsert }) => {
      // Server Action handles revalidateTag('chats')
      return createChatAction(data)
    },
    {
      onSuccess: (newChat) => {
        // SWR will revalidate ['chats'] automatically after Server Action
        console.log('Chat created:', newChat)
      },
      onError: (error) => {
        console.error("Error creating chat:", error)
      },
    }
  )
}

// ✅ GOOD: Optimistic update with Server Action
export function useSendMessage() {
  const { mutate } = useSWR(['messages'], null)

  return useSWRMutation(
    ['messages'],
    async (_, { arg: newMessage }: { arg: CreateMessageInput }) => {
      return createMessageAction(newMessage)
    },
    {
      optimisticData: (currentMessages = []) => [
        {
          id: `temp-${Date.now()}`,
          ...newMessage,
          created_at: new Date().toISOString(),
        },
        ...currentMessages,
      ],
      onSuccess: (realMessage) => {
        // Server Action calls revalidateTag('messages-{threadId}')
        // SWR will fetch fresh data automatically
      },
      onError: (error) => {
        console.error('Failed to send message:', error)
        // SWR automatically reverts optimistic update on error
      },
    }
  )
}

// ✅ GOOD: Multiple related mutations
export function useUpdateArchive() {
  const { mutate: mutateArchives } = useSWR(['archives'], null)

  return useSWRMutation(
    'update-archive',
    async (_, { arg: { archiveId, updates } }: { arg: UpdateArchiveInput }) => {
      // Server Action handles:
      // - revalidateTag('archives')
      // - revalidateTag(`archive-${archiveId}`)
      return updateArchiveAction(archiveId, updates)
    },
    {
      onSuccess: (result) => {
        // Trigger re-validation of related queries
        mutateArchives()
      },
    }
  )
}
```

## 5. Server Actions for All Hook Operations

### **Hooks must call Server Actions, not services directly**

**CRITICAL RULE**: Client hooks cannot import services marked with `"server-only"`. Always use Server Actions as the bridge between client hooks and services.

**READ OPERATIONS** → Call Server Actions:
```typescript
// ✅ GOOD: Server Action import in hooks
import { getAgentsAction } from '@/app/actions/agent-actions'
import { useAuth } from '@/context/auth-context'

export function useAgents({ filters, limit }: UseAgentsOptions) {
  const { user } = useAuth()

  return useSWR(
    user ? ['agents', filters, limit] : null,
    () => getAgentsAction(filters, limit),
    { fallbackData: [] }
  )
}

// ✅ GOOD: Direct service import in Server Components (NOT hooks)
import { getWorkflows } from '@/services/supabase/workflows-service'

export default async function WorkflowListPage() {
  const workflows = await getWorkflows()
  return <WorkflowList workflows={workflows} />
}
```

**WRITE OPERATIONS** → Use Server Actions:
```typescript
// ✅ GOOD: Server Action for mutations
import { createAgentAction } from '@/app/actions/agent-actions'

export function useCreateAgent() {
  return useSWRMutation(
    ['agents'],
    async (_, { arg: data }: { arg: AgentInsert }) => {
      return createAgentAction(data)
    }
  )
}
```

**WHY?**
- Services are marked `"server-only"` and cannot be imported in client code (hooks)
- Server Actions handle authentication, authorization, and userId parameter passing
- Server Actions provide cache revalidation via `revalidateTag()` for mutations
- Clear architecture: Hooks → Server Actions → Services → Database

**Server Components** can import services directly since they run on the server.

See `@/docs/TASKS/refactoring/remove-server-only-from-services.md` for the complete refactoring history.

## 6. Async Wrapper Pattern for Server Components

### **Wrapping services in async Server Component functions**

When you need async data in a Server Component but want a clean pattern:

```typescript
// ✅ GOOD: Async wrapper in Server Component
import { getArchivesWithItemCount } from '@/src/services/supabase/archives-service'

export default async function ArchivesPage() {
  const archives = await getArchivesWithItemCount()
  return <ArchivesList archives={archives} />
}

// ✅ GOOD: Async wrapper in hook for Suspense boundaries
import { use } from 'react'
import { getWorkflows } from '@/src/services/supabase/workflows-service'

export function useWorkflows() {
  const promise = getWorkflows()
  return use(promise)
}
```

This pattern avoids unnecessary Server Action wrappers while maintaining clean async data access.

## 7. Real-time Subscriptions

### **Supabase real-time integration**
- **Rule**: Use `useEffect` to set up subscriptions in data hooks
- **Rule**: Use `mutate()` to revalidate SWR cache on real-time updates
- **Rule**: Clean up subscriptions on unmount
- **Rule**: Handle INSERT, UPDATE, DELETE events

```typescript
// ✅ GOOD: Real-time subscription with SWR cache revalidation
import { createClient } from '@/src/lib/supabase/client'

export function useChatMessages(chatId: string | null) {
  const { data: messages, mutate } = useSWR(
    chatId ? ['messages', chatId] : null,
    () => chatId ? getChatMessages(chatId) : [],
    { dedupingInterval: 0 } // Always fresh for real-time
  )

  // Set up realtime subscription
  useEffect(() => {
    if (!chatId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`chat-messages-${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `chat_id=eq.${chatId}`
      }, (_payload) => {
        // Revalidate SWR cache to fetch fresh data
        mutate()
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `chat_id=eq.${chatId}`
      }, (_payload) => {
        mutate()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [chatId, mutate])

  return { data: messages }
}
```

## 8. Type Safety & Import Patterns

### **Consistent type imports and usage**
- **Rule**: Import types from services or `@/src/types/supabase`
- **Rule**: Extend types for additional UI state or joined data
- **Rule**: Use proper TypeScript generics for SWR and mutations

```typescript
// ✅ GOOD: Type imports and extensions
import { Database } from "@/src/types/supabase"
import { getChatMessages } from "@/src/services/supabase/chat-messages-service"

type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"] & {
  users?: {
    name: string
    user_type: string
  } | null
}

// ✅ GOOD: Proper mutation typing
return useMutation({
  mutationFn: ({ chatId, updates }: { 
    chatId: string; 
    updates: ChatMessageUpdate;
    chatId: string;
  }) => updateChatMessage(messageId, updates),
})
```

## 9. Hook Composition Patterns

### **Building complex hooks from simpler ones**
- **Rule**: Compose hooks rather than duplicating logic
- **Rule**: Extract derived state and computed values
- **Rule**: Maintain single responsibility per hook

```typescript
// ✅ GOOD: Hook composition
export function useChatsByTeam(teamId: string | null) {
  const { data: chats = [], ...query } = useUserChats()

  const filteredChats = teamId && teamId !== "all-teams"
    ? chats.filter(chat => chat.team_id === teamId)
    : chats

  return {
    ...query,
    data: filteredChats,
  }
}

// ✅ GOOD: Derived state helper
export function useChatMessages(chatId: string | null) {
  const query = useInfiniteQuery({...})
  
  // Helper to get all messages flattened
  const allMessages = query.data?.pages.flatMap(page => page) || []
  
  return {
    ...query,
    data: allMessages,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
  }
}
```

## 10. Error Handling & Loading States

### **Consistent error and loading state management**
- **Rule**: Let SWR handle loading and error states
- **Rule**: Provide meaningful error messages through Server Actions
- **Rule**: Use conditional cache keys to prevent unnecessary requests

```typescript
// ✅ GOOD: Error handling in mutations
export function useCreateChat() {
  return useMutation({
    mutationFn: createChat,
    onSuccess: (newChat) => {
      // Update caches
    },
    onError: (error) => {
      console.error("Error creating chat:", error)
      // Error state handled by React Query
    },
  })
}

// ✅ GOOD: Conditional queries
export function useProject(projectId: string | null) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectId ? getProject(projectId) : null,
    enabled: !!projectId, // Prevents request when no ID
  })
}
```

## 11. Context Integration

### **Integrating with React Context**
- **Rule**: Use context for global state, hooks for data fetching
- **Rule**: Context hooks should be simple wrappers
- **Rule**: Throw meaningful errors for missing providers

```typescript
// ✅ GOOD: Simple context wrapper hook
export function useWorkspaces() {
  const context = useContext(WorkspacesContext)
  if (context === undefined) {
    throw new Error("useWorkspaces must be used within a WorkspacesProvider")
  }
  return context
}

// ✅ GOOD: Using context in data hooks
export function useUserChats() {
  const { user } = useAuth()           // Context hook
  const { state } = useWorkspaces()    // Context hook
  const workspaceId = state.currentWorkspace?.id

  return useQuery({
    queryKey: ['chats', 'user', user?.id, workspaceId],
    queryFn: () => getUserChats(user.id, workspaceId),
    enabled: !!user?.id && !!workspaceId,
  })
}
```

## 12. Performance Optimizations

### **Optimizing hook performance**
- **Rule**: Use appropriate `staleTime` based on data freshness needs
- **Rule**: Use `select` for data transformation when needed
- **Rule**: Avoid unnecessary re-renders with stable references

```typescript
// ✅ GOOD: Appropriate stale times
export function useChat(chatId: string | null) {
  return useQuery({
    queryKey: ['chats', chatId],
    queryFn: () => getChat(chatId),
    staleTime: 60000, // Chat details don't change often
  })
}

export function useChatMessages(chatId: string | null) {
  return useQuery({
    queryKey: ['messages', chatId],
    queryFn: () => getChatMessages(chatId),
    staleTime: 0, // Messages need real-time updates
  })
}

// ✅ GOOD: Data transformation with select
export function useEnabledAiModels(workspaceId: string) {
  return useQuery({
    queryKey: ['workspace-ai-models', workspaceId],
    queryFn: () => getWorkspaceAIModels(workspaceId),
    select: (data) => data.filter(model => model.is_enabled),
    staleTime: 300000, // 5 minutes
  })
}
```

## 13. Utility Hooks

### **Non-data utility hooks**
- **Rule**: Keep utility hooks pure and focused
- **Rule**: Use TypeScript generics for reusability
- **Rule**: Include cleanup in useEffect hooks

```typescript
// ✅ GOOD: Generic utility hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// ✅ GOOD: Composed utility hook
export function useDebouncedSearch(
  searchFunction: (query: string) => void,
  delay: number = 300
) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  
  const debouncedSearch = useDebouncedCallback(
    (query: string) => {
      setIsSearching(true)
      searchFunction(query)
      setIsSearching(false)
    },
    delay,
    [searchFunction]
  )

  return { searchTerm, handleSearch, isSearching }
}
```

## 14. Documentation & JSDoc

### **Document complex hooks**
- **Rule**: Add JSDoc comments for public hooks
- **Rule**: Document parameters and return values
- **Rule**: Include usage examples for complex patterns

```typescript
/**
 * Hook for managing chat messages with real-time updates and infinite scrolling
 * @param chatId - The ID of the chat to fetch messages for
 * @returns Query object with flattened messages and pagination controls
 * 
 * @example
 * ```tsx
 * function ChatComponent({ chatId }: { chatId: string }) {
 *   const { data: messages, fetchNextPage, hasNextPage } = useChatMessages(chatId)
 *   
 *   return (
 *     <div>
 *       {messages.map(msg => <Message key={msg.id} {...msg} />)}
 *       {hasNextPage && <button onClick={fetchNextPage}>Load More</button>}
 *     </div>
 *   )
 * }
 * ```
 */
export function useChatMessages(chatId: string | null) {
  // Implementation...
}
```

## Summary

These rules ensure:
- **Performance**: Efficient caching and real-time updates through SWR
- **Type Safety**: Full TypeScript integration with generated Supabase types
- **Maintainability**: Consistent patterns and clear separation of concerns (hooks → services vs hooks → Server Actions for mutations)
- **User Experience**: Optimistic updates and proper loading states
- **Scalability**: Composable hooks and proper cache management
- **Real-time**: Seamless Supabase subscription integration
- **Simplicity**: Direct service imports for reads, Server Actions only for mutations

**Core Principle**: Hooks should provide clean, typed interfaces between components and data, handling all the complexity of caching, real-time updates, and state management internally. Mutations are orchestrated through Server Actions which handle cache revalidation.

**Related Documentation**:
- `@/docs/PATTERNS/server-actions-rules.md` - Server Action patterns and cache revalidation
- `@/docs/PATTERNS/service-rules.md` - Service layer patterns