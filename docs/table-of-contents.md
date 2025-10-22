# Documentation Table of Contents

*Navigation and quick reference for all architecture, pattern, and best practices documentation*

---

## Architecture & Layers

### Presentation Layer (Components & Hooks)
- [**Hooks Rules**](docs/PATTERNS/hooks-rules) - Hook patterns, SWR usage, data fetching, real-time subscriptions
- [**Server Actions Rules**](docs/PATTERNS/server-actions-rules) - Server Actions, mutations, cache revalidation, when to use vs direct service imports

### Orchestration Layer (Server Actions)
- [**Server Actions Rules**](docs/PATTERNS/server-actions-rules) - Complete Server Action patterns and cache revalidation strategy

### Service Layer (Business Logic & Data Access)
- [**Service Rules**](docs/PATTERNS/service-rules) - Universal service patterns, error handling, typing, architecture
- [**Supabase Service Rules**](docs/PATTERNS/services/supabase-service-rules) - Supabase queries, auth clients, RLS policies, type safety

### Data & Types Layer
- [**Types Rules**](docs/PATTERNS/types-rules) - TypeScript type conventions and patterns
- [**Artifact Rules**](docs/PATTERNS/artifact-rules) - Artifact entity design, storage, mentions
- [**MCP Tool Rules**](docs/PATTERNS/mcp-tool-rules) - Tool development, context, permissions
- [**Schema Rules**](docs/PATTERNS/schema-rules) - Database schema design, naming, constraints

---

## Quick Reference by Topic

| Topic | File | Section |
|-------|------|---------|
| **Data Fetching** | [Hooks Rules](docs/PATTERNS/hooks-rules) | 2 (SWR Integration) |
| **Cache Management** | [Hooks Rules](docs/PATTERNS/hooks-rules) | 3, 5 |
| **Mutations & Server Actions** | [Server Actions Rules](docs/PATTERNS/server-actions-rules) | All |
| **Cache Revalidation** | [Server Actions Rules](docs/PATTERNS/server-actions-rules) | Cache Revalidation Patterns |
| **Read vs Write Operations** | [Hooks Rules](docs/PATTERNS/hooks-rules) | 5 (Direct Service Imports) |
| **Real-time Updates** | [Hooks Rules](docs/PATTERNS/hooks-rules) | 7 (Real-time Subscriptions) |
| **Service Layer Design** | [Service Rules](docs/PATTERNS/service-rules) | All |
| **Service Cache Patterns** | [Service Rules](docs/PATTERNS/service-rules) | 14 (Cache Revalidation Tags) |
| **Supabase Queries** | [Supabase Service Rules](docs/PATTERNS/services/supabase-service-rules) | All |
| **TypeScript Types** | [Types Rules](docs/PATTERNS/types-rules) | - |
| **Database Schema** | [Schema Rules](docs/PATTERNS/schema-rules) | - |
| **Artifacts** | [Artifact Rules](docs/PATTERNS/artifact-rules) | - |
| **MCP Tools** | [MCP Tool Rules](docs/PATTERNS/mcp-tool-rules) | - |

---

## Refactoring & Implementation Guides

| Document | Purpose |
|----------|---------|
| [**Update Server Actions**](docs/TASKS/refactoring/update-server-actions) | Server actions refactoring - Phase 1-4 complete ✅ |
| [**Remove Server-Only from Services**](docs/TASKS/refactoring/remove-server-only-from-services) | Server-only imports refactoring - Phase 1-5 complete ✅ |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ Component (UI)                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Hook Layer (SWR, client state)                                  │
│ → useSWR for reads → Server Actions                             │
│ → useSWRMutation for writes → Server Actions                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Server Action Layer (Orchestration, cache revalidation)         │
│ → Authentication & authorization                                │
│ → Calls services with userId                                    │
│ → Calls revalidateTag() for cache sync                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Service Layer (Business logic, data access)                     │
│ → Pure, cache-agnostic functions (marked "server-only")         │
│ → Takes explicit userId parameters                              │
│ → Database operations, validation, orchestration                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ External Systems (Supabase, AI APIs, etc.)                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Principles

### 1. Separation of Concerns
- **Services**: Pure data access and business logic, no cache awareness
- **Server Actions**: Orchestration, mutations, cache revalidation
- **Hooks**: Data fetching, state management, UI concerns
- **Components**: Presentation only

### 2. Cache Strategy
- **Reads**: Direct service imports in hooks/Server Components
- **Writes**: Server Actions with `revalidateTag()` for cache sync
- **Cache Keys**: Match SWR keys with Server Action tags
- **Real-time**: Supabase subscriptions call `mutate()` for SWR revalidation

### 3. Type Safety
- Explicit types on all service functions
- Domain-specific types in `@/src/types/`
- Type imports for Supabase schema
- Generics for reusable patterns

### 4. Error Handling
- **Critical**: Fail fast with clear error messages
- **Non-critical**: Graceful degradation (logging, observability)
- **Authorization**: Always verify before mutations
- **Validation**: Server Action layer (after service returns)

### 5. Authentication
- Use appropriate Supabase client (Regular/Agent/Admin)
- Verify user context in Server Actions before mutations
- ID-based entity lookups (never name-based)
- RLS policies as defense-in-depth

---

## Common Patterns

### Reading Data (Hooks)
```typescript
// ✅ GOOD: Server Action + SWR with useAuth context
export function useAgents() {
  const { user } = useAuth();

  return useSWR(
    user ? 'agents' : null,
    () => getAgentsAction(['all'], 100),
    { fallbackData: [] }
  )
}
```

### Writing Data (Server Actions)
```typescript
// ✅ GOOD: Server Action with cache revalidation
export async function createAgentAction(data: AgentInsert): Promise<Agent> {
  const result = await createAgent(data)
  revalidateTag('agents')
  revalidateTag(`agent-${result.id}`)
  return result
}
```

### Mutations in Components
```typescript
// ✅ GOOD: SWR mutation calling Server Action
export function useCreateAgent() {
  return useSWRMutation(['agents'],
    async (_, { arg: data }) => createAgentAction(data)
  )
}
```

---

## Guidelines for Documentation

### When Adding New Files
1. Add entry to appropriate section above
2. Update quick reference table if relevant
3. Cross-reference related documents with `@/path/to/file.md`
4. Link back to this TOC from new files

### Keeping Documentation Concise
- Focus on **principles and patterns**, not exhaustive details
- Use code examples for clarity
- Link to related files instead of duplicating content
- Detailed implementation belongs in code comments
- Complex architectural decisions belong in separate design docs

### Cross-Referencing
Use markdown links with the pattern: `[Link Text](docs/CATEGORY/filename)` for internal doc links. The docs viewer will automatically navigate to the correct page.

---

## Documentation Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| `PATTERNS/hooks-rules.md` | ✅ Updated | After server-actions refactoring |
| `PATTERNS/server-actions-rules.md` | ✅ Created | New - comprehensive guide |
| `PATTERNS/service-rules.md` | ✅ Updated | Added section 14 (cache patterns) |
| `PATTERNS/types-rules.md` | ✅ Exists | - |
| `PATTERNS/supabase-service-rules.md` | ✅ Exists | - |
| Refactoring Task Docs | ✅ Complete | Phase 1-4 finished |

---

## Next Steps

- Archive or remove the old `docs/_RULES.md` file
- Update any links to `_RULES.md` to point to this `table-of-contents.md`
- Use this as the single source of truth for documentation navigation
