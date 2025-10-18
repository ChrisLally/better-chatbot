# Service Layer Rules & Best Practices

*Universal guidelines for all services in the Unison application*

## Core Philosophy

**Principle**: Services are pure functions for database operations, API calls, and orchestration logic. They handle data access and coordination while keeping UI concerns in hooks and components.

## Service Organization

```
src/services/
    _SERVICE_RULES.md              # This file - Universal service rules
    supabase/                      # Database service layer
        _SUPABASE_SERVICE_RULES.md # Supabase-specific rules
        *-service.ts               # Individual table services
        ...
    ai/                            # AI orchestration layer
        _AI_SERVICE_RULES.md       # AI service-specific rules
        ai-service.ts              # Main AI orchestration
        utils/                     # AI utilities
        prompts/                   # Prompt engineering
    langfuse/                      # Observability/tracing layer
        _LANGFUSE_SERVICE_RULES.md # Langfuse-specific rules
    {other-services}/              # Additional service domains
```

## 1. Import Patterns (Universal)

###  **Use @ alias for all imports**

```typescript
//   GOOD: Use @ alias
import { getUser } from '@/src/services/supabase/users-service';
import { generateAgentStepResponseWithMCP } from '@/src/services/ai/ai-service';
import { buildSystemPrompt } from '@/src/services/ai/prompts';

// L BAD: Relative imports
import { getUser } from '../supabase/users-service';
import { generateAgentStepResponseWithMCP } from './ai-service';
```

**Rule**: Always use the `@` path alias for consistency and maintainability.

###  **Static imports over dynamic imports**

```typescript
//   GOOD: Static imports at top
import { getProjectTaskStep } from '@/src/services/supabase/project-task-steps-service';

// L BAD: Dynamic imports in function body (unless needed for code splitting)
const { getProjectTaskStep } = await import('@/src/services/supabase/...');
```

**Exception**: Dynamic imports are acceptable for lazy-loading or conditional code splitting, but not for standard service dependencies.

## 2. Service Layer Separation (Critical)

###  **Never mix service layer concerns**

```typescript
//   GOOD: AI service delegates to database service
import { updateProjectTaskStep } from '@/src/services/supabase/project-task-steps-service';
await updateProjectTaskStep(stepId, { status: 'completed' });

// L BAD: AI service directly queries database
const supabase = createClient();
await supabase.from('project_task_steps').update({ status: 'completed' });
```

**Rule**: Each service layer has clear boundaries:
- **Database services** (`supabase/`) - Only these directly query Supabase
- **AI services** (`ai/`) - Delegate database operations to database services
- **Other services** - Follow the same delegation pattern

## 3. Environment-Aware Configuration

###  **Use environment variables for URLs and configuration**

```typescript
//   GOOD: Environment-aware URL
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const apiUrl = `${baseUrl}/api/endpoint`;

// L BAD: Hardcoded localhost
const apiUrl = `http://localhost:3000/api/endpoint`;
```

**Common Environment Variables**:
- `NEXT_PUBLIC_SITE_URL` - Base URL (works in all environments)
- Service-specific vars in respective `_RULES.md` files

## 4. Error Handling Patterns

###  **Graceful degradation for non-critical failures**

```typescript
// Metadata capture should not break execution
try {
  await saveMetadata(id, metadata);
} catch (error) {
  console.error('Failed to save metadata:', error);
  // Don't throw - metadata is for observability, not critical path
}
```

###  **Fail fast for critical operations**

```typescript
// Critical data is required
const entity = await getEntity(entityId);
if (!entity) {
  throw new Error(`Entity not found: ${entityId}`);
}

// Required parameters
if (!requiredParam) {
  throw new Error(`Missing required parameter: requiredParam`);
}
```

**Decision Guide**:
- **Fail fast**: Core functionality, required data, authentication
- **Graceful degradation**: Logging, analytics, non-essential features

## 5. Function Naming Conventions

###  **Consistent function naming patterns**

```typescript
// CRUD Operations
get{Entity}(id: string)
create{Entity}(data: EntityInsert)
update{Entity}(id: string, updates: EntityUpdate)
delete{Entity}(id: string)

// Collection Operations
get{Entities}ByScope(scopeId: string)
list{Entities}(filters?: Filters)

// Boolean Checks
is{Condition}(id: string)
has{Permission}(userId: string, permission: string)
can{Action}(userId: string, action: string)

// Utility Operations
build{Something}(params: BuildParams)
process{Operation}(data: ProcessData)
format{Data}(input: DataInput)
```

## 6. Return Type Consistency

###  **Predictable return types across all services**

```typescript
// Single Items: Return Entity | null (null if not found)
async function getEntity(id: string): Promise<Entity | null>

// Collections: Return Entity[] (empty array if none found, never null)
async function getEntities(scopeId: string): Promise<Entity[]>

// Create/Update Operations: Return the affected entity
async function createEntity(data: EntityInsert): Promise<Entity>
async function updateEntity(id: string, updates: EntityUpdate): Promise<Entity>

// Delete Operations: Return void
async function deleteEntity(id: string): Promise<void>

// Complex Operations: Return structured objects
async function complexOperation(): Promise<{
  success: boolean;
  data?: Entity;
  error?: string;
}>
```

## 7. Type Safety (Universal)

###  **Use proper TypeScript types**

```typescript
import type {
  RequestType,
  ResponseType
} from '@/src/types/{domain}-types';

export async function serviceFunction({
  param1,
  param2,
}: RequestType): Promise<ResponseType> {
  // Implementation
}
```

**Rule**: All service functions must:
- Have explicit parameter types
- Have explicit return types
- Use domain-specific types from `@/src/types/`

## 8. Debug Logging (Standardized)

###  **Structured logging for observability**

```typescript
// Use descriptive prefixes for visual scanning
console.log('[DEBUG] Data inspection:', {
  entityId,
  dataCount: data.length,
  preview: data.slice(0, 3)
});

console.log('[EXEC] Operation execution:', {
  operation: 'processTask',
  params,
  result
});

console.log('[SUCCESS] Operation completed successfully');
console.error('[ERROR] Critical error:', error);
console.warn('[WARN] Non-critical issue detected');
```

**Debug Categories**:
- `[DEBUG]` - Context/Data inspection
- `[EXEC]` - Operation execution
- `[SUCCESS]` - Success operations
- `[ERROR]` - Critical errors
- `[WARN]` - Warnings

## 9. Re-exports for API Surface

###  **Maintain clean public API via re-exports**

```typescript
// In main service file (e.g., ai-service.ts)
// Re-export for backward compatibility and clean API
export { logAgentStepProgress, processStepCompletion } from './utils/ai-step-helpers';
```

**Benefits**:
- Consumers can import from either location
- Internal refactoring doesn't break external code
- Clean public API surface

## 10. ID-Based Entity Lookups (Critical Rule)

### **NEVER use name-based entity lookups - ALWAYS use ID-based lookups**

```typescript
// CRITICAL VIOLATION: Name-based lookup
const entity = entities.find(e =>
  e.name === targetName ||
  e.name.includes(targetName)
)

//   GOOD: ID-based lookup
const entity = entities.find(e => e.id === targetId)

// CRITICAL VIOLATION: Database query with name WHERE clause
.from("entities")
.eq("name", entityName)

//   GOOD: Database query with ID WHERE clause
.from("entities")
.eq("id", entityId)
```

**Rule**: Use entity IDs (UUIDs) for all lookups and relationships
- **Reason**: Names can change, IDs are immutable and guaranteed unique
- **Applies to**: All entities (users, agents, projects, teams, workspaces, etc.)

## 11. Function Documentation

###  **Document complex service functions with JSDoc**

```typescript
/**
 * Brief description of what the function does
 *
 * @param param1 - Description of first parameter
 * @param param2 - Description of second parameter
 * @returns Description of return value
 *
 * @example
 * ```typescript
 * const result = await complexFunction(id, options);
 * ```
 */
export async function complexFunction(
  param1: string,
  param2: Options
): Promise<Result> {
  // Implementation
}
```

**When to document**:
- Complex logic or algorithms
- Non-obvious behavior
- Functions with multiple parameters
- Public API functions

## 12. Client/Context Parameter Pattern

###  **Support dependency injection for testing and reusability**

```typescript
// Service-agnostic client parameter pattern
export async function serviceFunction(
  param1: string,
  param2: number,
  client?: ClientType  // Optional client injection
): Promise<Result> {
  const actualClient = client || getDefaultClient();
  // Implementation
}
```

**Benefits**:
- Easier testing with mock clients
- Supports different execution contexts
- Maintains flexibility

## 13. Async/Await Consistency

### **Always use async/await (never callbacks or raw promises)**

```typescript
//   GOOD: Async/await
export async function fetchData(id: string): Promise<Data> {
  try {
    const result = await apiCall(id);
    return result;
  } catch (error) {
    console.error('Failed to fetch data:', error);
    throw new Error('Data fetch failed');
  }
}

// L BAD: Callback pattern
export function fetchData(id: string, callback: (data: Data) => void) {
  apiCall(id).then(callback);
}

// L BAD: Raw promise chains
export function fetchData(id: string): Promise<Data> {
  return apiCall(id)
    .then(result => result)
    .catch(error => throw error);
}
```

## Summary

**Key Universal Principles**:
- **Import Consistency**: Always use `@` alias, prefer static imports
- **Service Layer Separation**: Each layer delegates to appropriate services
- **Environment Awareness**: Use env vars for configuration
- **Error Handling**: Graceful degradation vs fail fast (context-dependent)
- **Type Safety**: Explicit types throughout
- **Naming Consistency**: Predictable function and return patterns
- **Client Authentication**: Use appropriate Supabase client (Regular/Agent/Admin)
- **ID-Based Lookups**: Never use name-based entity lookups
- **Documentation**: JSDoc for complex functions
- **Logging Standards**: Structured logs with clear prefixes
- **Async Patterns**: Consistent async/await usage

**Related Documentation**:
- `@/src/services/ai/_AI_SERVICE_RULES.md` - AI service-specific rules
- `@/src/services/supabase/_SUPABASE_SERVICE_RULES.md` - Supabase service-specific rules
- `@/src/services/langfuse/_LANGFUSE_SERVICE_RULES.md` - Langfuse tracing integration rules
- `@/src/lib/supabase/server.ts` - Client authentication implementation

**Core Principle**: Services are the coordination layer between your application and external systems (databases, APIs, AI models). Keep them pure, predictable, and focused on their specific domain while following these universal patterns for consistency and maintainability.
