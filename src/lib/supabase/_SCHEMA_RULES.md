# Database Schema Rules & Best Practices for AI-Driven Applications

*Strict guidelines for maintaining clean, scalable, and maintainable database architecture in modern multi-agent systems*

## Core Philosophy

**Principle**: Start minimal, add complexity only when actually needed. Let AI handle interpretation instead of over-engineering rigid schemas.

*This approach is particularly valuable for AI agent platforms, collaborative systems, and dynamic applications where behavior emerges rather than being pre-defined.*

## 1. JSONB Usage Rules

### L **NEVER use JSONB unless absolutely critical**
- **Rule**: Use normalized tables with proper foreign keys instead
- **Rationale**: JSONB violates relational principles and makes querying/indexing difficult
- **Exception**: Only when truly dynamic data that can't be structured

```sql
-- L BAD: JSONB for structured data
ALTER TABLE project_tasks ADD COLUMN metadata jsonb;

--  GOOD: Normalized approach
CREATE TABLE project_task_metadata (
  project_task_id uuid REFERENCES project_tasks(id),
  key text NOT NULL,
  value text NOT NULL
);
```

## 2. Enum Naming Convention

###  **Be specific and consistent with enum naming**
- **Pattern**: `{domain}_{entity}_{type}_enum`
- **Rule**: Always suffix with `_enum` for clarity
- **Rule**: Use full descriptive names, not abbreviations

```sql
--  GOOD: Specific and consistent
CREATE TYPE orchestration_status_enum AS ENUM ('pending', 'ready', 'in_progress', 'blocked', 'completed', 'failed');
CREATE TYPE ai_model_capability_enum AS ENUM ('text', 'vision', 'function_calling');
CREATE TYPE risk_assessment_enum AS ENUM ('low', 'medium', 'high');

-- L BAD: Generic or unclear naming
CREATE TYPE status_enum AS ENUM ('pending', 'done');
CREATE TYPE model_capability AS ENUM ('text', 'vision');
```

## 3. Field Naming Conventions

###  **Use explicit and descriptive field names**
- **Rule**: Be specific about user types when clarity is needed
- **Pattern**: `{type}_user_id` when user type matters
- **Rule**: Use boolean prefixes: `is_`, `has_`, `requires_`, `can_`

```sql
--  GOOD: Explicit user type distinctions
ADD COLUMN agent_user_id uuid REFERENCES users(id);           -- Must be agent
ADD COLUMN human_user_id uuid REFERENCES users(id);           -- Must be human  
ADD COLUMN approved_by_user_id uuid REFERENCES users(id);     -- Can be either

--  GOOD: Clear boolean naming
ADD COLUMN is_model_enabled boolean DEFAULT true;
ADD COLUMN requires_approval boolean DEFAULT false;
ADD COLUMN can_execute boolean DEFAULT false;

-- L BAD: Ambiguous naming
ADD COLUMN user_id uuid;                    -- Unclear if human or agent
ADD COLUMN enabled boolean;                 -- Enabled for what?
ADD COLUMN approval boolean;                -- Does it need approval or is it approved?
```

## 4. Index Strategy

### � **Add indexes later, not upfront**
- **Rule**: Don't create indexes during initial development
- **Rationale**: Indexes complicate schema changes and aren't needed for empty tables
- **Rule**: Add indexes when you have real performance problems and stable schema

```sql
--  GOOD: Comment out indexes for later
-- Performance optimization can be added later:
-- CREATE INDEX idx_project_tasks_workspace ON project_tasks (workspace_id);

-- L BAD: Premature index creation
CREATE INDEX idx_project_tasks_workspace ON project_tasks (workspace_id);
```

## 5. Table Relationship Rules

###  **Use explicit foreign keys and proper constraints**
- **Rule**: Always use proper REFERENCES constraints
- **Rule**: Add CHECK constraints for business logic validation
- **Rule**: Use CASCADE appropriately for cleanup

```sql
--  GOOD: Explicit relationships with constraints
CREATE TABLE project_task_steps (
  project_task_id uuid NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  status orchestration_status_enum NOT NULL DEFAULT 'pending'
);

-- Add business logic constraints
ALTER TABLE project_tasks ADD CONSTRAINT check_agent_user_type 
CHECK (
  agent_user_id IS NULL OR 
  EXISTS (SELECT 1 FROM users WHERE id = agent_user_id AND user_type = 'agent')
);
```

## 6. Avoid Over-Engineering

### L **Don't create tables until you actually need them**
- **Rule**: Start with existing tables and simple columns
- **Rule**: Let AI interpret meaning instead of rigid schemas
- **Principle**: "We can add columns as needed" vs "Let's design everything upfront"

```sql
--  GOOD: Use existing systems
-- Agent capabilities via:
-- 1. users.description (AI interprets role)
-- 2. user_tools (strict tool access)  
-- 3. user_permissions (platform permissions)

-- L BAD: Over-engineered capability system
CREATE TABLE agent_capabilities (...);
CREATE TABLE agent_capability_metadata (...);
CREATE TABLE agent_capability_assignments (...);
```

## 7. Unified System Design

###  **Leverage existing proven systems instead of creating parallel ones**
- **Rule**: Prefer enhancing existing tables over creating new ones
- **Rule**: Use consistent patterns across the schema

```sql
--  GOOD: Unified task system for humans and agents
-- Use project_tasks for all work (human tasks, agent tasks, approval tasks)
-- Use project_task_dependencies for all coordination
-- Use project_task_steps for all execution tracking

-- L BAD: Creating separate parallel systems instead of using the unified task system
-- Example: Don't create separate tables for agent-specific workflows
CREATE TABLE agent_workflows (...);        -- Parallel to project_tasks
CREATE TABLE agent_workflow_steps (...);    -- Parallel to project_task_steps
```

## 8. Dependency Management

###  **Use dependency tables instead of hardcoded ordering**
- **Rule**: Let dependencies define execution order, not arbitrary sequence numbers
- **Rule**: Enable parallel execution through dependency relationships

```sql
--  GOOD: Dependency-driven order
CREATE TABLE project_task_step_dependencies (
  blocked_step_id uuid REFERENCES project_task_steps(id),
  blocking_step_id uuid REFERENCES project_task_steps(id),
  dependency_type dependency_type_enum NOT NULL
);

-- L BAD: Hardcoded sequential order  
ALTER TABLE project_task_steps ADD COLUMN execution_order integer;
```

## 9. Domain-Agnostic Design

###  **Keep the platform domain-agnostic**
- **Rule**: Avoid domain-specific enums or tables
- **Rule**: Unison should work for any multi-agent system, not just specific industries

```sql
--  GOOD: Platform capabilities
CREATE TYPE ai_model_capability_enum AS ENUM ('text', 'vision', 'function_calling');

-- L BAD: Domain-specific enums
CREATE TYPE pharma_analysis_type_enum AS ENUM ('pipeline', 'clinical', 'regulatory');
```

## 10. Approval & Workflow Patterns

###  **Use task system for approval workflows instead of approval-specific columns**
- **Rule**: Approval is just another task that can be assigned to humans or agents
- **Rule**: Use task dependencies to model approval requirements

```sql
--  GOOD: Approval via task system
-- 1. Create approval task assigned to human/agent
-- 2. Set dependency: main_task depends on approval_task
-- 3. Use existing project_task_dependencies table

-- L BAD: Approval-specific columns
ALTER TABLE project_tasks 
ADD COLUMN requires_approval boolean,
ADD COLUMN approved_by_user_id uuid,
ADD COLUMN approved_at timestamptz;
```

## 11. Model Selection Strategy

###  **Keep model architecture simple and capability-focused**
- **Rule**: Focus on capabilities, not arbitrary categories
- **Rule**: Use real AI SDK identifiers, not internal abstractions
- **Rule**: Start with one provider (Google) and expand later

```sql
--  GOOD: Capability-based with real identifiers
CREATE TABLE ai_models (
  model_identifier text UNIQUE NOT NULL, -- 'google:gemini-2.5-flash'
  capabilities ai_model_capability_enum[] NOT NULL
);

-- L BAD: Abstract categories and internal IDs
CREATE TABLE models (
  internal_name text,
  category model_category_enum,
  provider_id uuid
);
```

## 12. Consistent File Patterns

###  **Maintain consistent documentation patterns**
- **Rule**: Use executable SQL files as single source of truth
- **Rule**: Document decisions in SQL comments, not separate markdown files
- **Rule**: Remove redundant documentation that duplicates SQL

```sql
--  GOOD: Documentation in SQL
-- This table handles approval workflows by creating approval tasks
-- and using project_task_dependencies for coordination
CREATE TABLE project_tasks (...);

-- L BAD: Separate .md files that duplicate .sql content
```

## 13. TypeScript Integration

###  **Use auto-generated Supabase types with helper utilities**
- **Rule**: Never manually define database types
- **Rule**: Use `Tables<"table_name">` helper types for readability
- **Rule**: Extend base types when you need additional fields (like joins)

```typescript
//   GOOD: Use generated types with helpers
import { Tables, TablesInsert } from "@/types/supabase"
type Chat = Tables<"chats">
type ChatInsert = TablesInsert<"chats">

//   GOOD: Extend for joined data
type ChatMessage = Tables<"chat_messages"> & {
  users?: { name: string } | null
}

// L BAD: Manual type definitions
interface Chat {
  id: string
  name: string
  // ... duplicating database schema
}
```

## 14. Migration Safety

###  **Use safe migration patterns**
- **Rule**: Always use `IF NOT EXISTS` for additive changes
- **Rule**: Use proper type casting for enum migrations
- **Rule**: Add constraints after data validation

```sql
--  GOOD: Safe migrations
ALTER TABLE users ADD COLUMN IF NOT EXISTS max_concurrent_tasks integer DEFAULT 1;

-- Update enum with proper casting
ALTER TABLE project_tasks ALTER COLUMN status TYPE orchestration_status_enum 
  USING CASE 
    WHEN status::text = 'processing' THEN 'in_progress'::orchestration_status_enum
    ELSE status::text::orchestration_status_enum
  END;

-- L BAD: Unsafe migrations that could fail
ALTER TABLE users ADD COLUMN max_concurrent_tasks integer DEFAULT 1;
```

## Summary

These rules ensure:
- **Clean, maintainable schemas** that scale well
- **Consistent patterns** across the entire system  
- **Flexibility** for future changes without major refactoring
- **AI-friendly design** that leverages intelligent interpretation
- **Performance considerations** without premature optimization
- **Type safety** through generated TypeScript integration

## 15. Scope Inference Pattern

### ✅ **Use foreign key relationships to infer scope/type instead of redundant enums**
- **Rule**: If only one FK can be set at a time, don't create an enum for the type
- **Rule**: Use CHECK constraints to enforce single FK relationships
- **Benefit**: Eliminates redundant data and enum maintenance

```sql
-- ✅ GOOD: Scope inferred from which FK is set
CREATE TABLE knowledge (
  organization_id uuid REFERENCES organizations(id),
  workspace_id uuid REFERENCES workspaces(id), 
  team_id uuid REFERENCES teams(id),
  project_id uuid REFERENCES projects(id),
  task_id uuid REFERENCES project_tasks(id)
);

-- Constraint: exactly one FK must be set
ALTER TABLE knowledge ADD CONSTRAINT check_single_scope_reference 
CHECK (
  (organization_id IS NOT NULL)::int + 
  (workspace_id IS NOT NULL)::int + 
  (team_id IS NOT NULL)::int + 
  (project_id IS NOT NULL)::int + 
  (task_id IS NOT NULL)::int = 1
);

-- ❌ BAD: Redundant enum
CREATE TYPE knowledge_scope_enum AS ENUM ('organization', 'workspace', 'team', 'project', 'task');
ALTER TABLE knowledge ADD COLUMN scope knowledge_scope_enum;
```

## 16. Let AI Decide Pattern

### ✅ **Avoid hardcoded flags for behavior that AI can determine dynamically**
- **Rule**: Don't add boolean flags for behavior that agents can decide intelligently
- **Rule**: Let AI interpret context and make coordination decisions
- **Principle**: Trust AI capabilities over rigid schema constraints

```sql
-- ✅ GOOD: Let agents decide coordination dynamically
-- No hardcoded flags needed - agents analyze task and determine approach

-- ❌ BAD: Premature coordination flags
ALTER TABLE project_tasks 
ADD COLUMN requires_multi_agent_coordination boolean,
ADD COLUMN coordination_requirements text;
```

**Core Principle**: Simplicity first, complexity only when proven necessary through real usage patterns. Let AI interpret and decide rather than over-constraining with rigid schema flags.

## 17. AI-First Database Design

### ✅ **Let AI interpret meaning from flexible fields rather than rigid constraints**
- **Rule**: Use description fields + AI interpretation over complex metadata schemas
- **Rule**: Context engineering (what information to provide) trumps schema engineering (rigid structures)
- **Principle**: AI agents can understand nuanced text better than hardcoded categories

```sql
-- ✅ GOOD: AI interprets capabilities from flexible description
CREATE TABLE users (
  description text, -- "Data analysis expert with Python and SQL skills"
  user_type user_type_enum -- 'human' or 'agent'
);
-- Example: Unison's Context Engineer Agent interprets agent capabilities from descriptions

-- ❌ BAD: Over-engineered capability schemas
CREATE TABLE agent_capabilities (
  skill_category skill_category_enum,
  proficiency_level proficiency_enum,
  domain_expertise domain_enum
);
```

## 18. Multi-Agent System Patterns

### ✅ **Use existing communication infrastructure for agent coordination**
- **Rule**: Agent-to-agent communication via existing messaging systems
- **Rule**: Maintain audit trails through standard communication channels
- **Rule**: Don't build parallel systems for agent coordination

```sql
-- ✅ GOOD: Agent communication via existing chat system
-- 2-member chats for agent coordination with full audit trails
-- Example: Unison agents communicate via chat_messages table

-- ❌ BAD: Separate agent communication system
CREATE TABLE agent_messages (...);
CREATE TABLE agent_coordination_logs (...);
```

### ✅ **Enable agent-level decision making over hardcoded assignments**
- **Rule**: Let agents choose their own resources (models, tools, approaches)
- **Rule**: Provide options and let AI decide rather than pre-assigning
- **Rule**: Default values + agent autonomy over rigid constraints

```sql
-- ✅ GOOD: Agent-level model selection
CREATE TABLE workspace_ai_models (
  workspace_id uuid,
  ai_model_id uuid,
  is_model_enabled boolean DEFAULT true -- Available options
);
-- Agents choose model based on task complexity analysis

-- ❌ BAD: Hardcoded model assignments
ALTER TABLE users ADD COLUMN assigned_model_id uuid; -- Rigid pre-assignment
```

## 19. Dynamic vs Static Architecture Decisions

### ✅ **When to let AI decide vs. when to constrain with schema**
- **Let AI Decide**: Task complexity, coordination patterns, resource selection, context relevance
- **Constrain with Schema**: Security boundaries, data integrity, business rules, compliance requirements
- **Rule**: If an AI agent can make the decision intelligently, don't hardcode it in the schema

```sql
-- ✅ GOOD: AI determines coordination needs dynamically
-- No schema flags needed - agents analyze and decide

-- ❌ BAD: Premature coordination constraints
ALTER TABLE tasks 
ADD COLUMN requires_multi_agent_coordination boolean,
ADD COLUMN coordination_requirements text;
```

## 20. Permission Simplification Principle

### ✅ **Avoid redundant permission layers**
- **Rule**: If granular permissions exist, don't add redundant platform-level gates
- **Rule**: Single-layer granular control over multi-layer complexity
- **Principle**: Simpler permission systems are easier to reason about and debug

```sql
-- ✅ GOOD: Single-layer granular permissions
CREATE TABLE user_tools (
  user_id uuid REFERENCES users(id),
  tool_id uuid REFERENCES tools(id)
); -- Direct tool access control

-- ❌ BAD: Multi-layer permission redundancy
CREATE TABLE user_permissions (
  tools_execute_sandbox boolean -- Platform gate
);
-- Plus user_tools table creates unnecessary complexity
```

## 21. Context Engineering Over Schema Engineering

### ✅ **Prioritize information quality over data structure rigidity**
- **Rule**: Rich contextual information in flexible fields beats rigid schemas
- **Rule**: AI can extract meaning from well-structured text better than constrained categories
- **Pattern**: description + context + AI interpretation > hardcoded metadata tables

```sql
-- ✅ GOOD: Context-rich flexible fields
CREATE TABLE projects (
  description text, -- Rich project context for AI interpretation
  requirements text, -- Detailed requirements for context assembly
  context text -- Additional contextual information
);
-- Example: Unison's Context Engineer Agent assembles context from multiple description fields

-- ❌ BAD: Rigid metadata that loses context
CREATE TABLE project_metadata (
  metadata_type metadata_type_enum,
  category category_enum,
  priority priority_enum
); -- Loses nuance and context
```

**Updated Core Principle**: Design for AI interpretation and decision-making. Provide rich context and flexible structures rather than rigid constraints. Let AI agents make intelligent decisions based on contextual understanding rather than hardcoded schema rules.

## Summary for AI-Driven Applications

These rules ensure:
- **AI-friendly design** that leverages intelligent interpretation over rigid constraints
- **Clean, maintainable schemas** that scale well with evolving AI capabilities
- **Consistent patterns** across human-AI collaborative systems
- **Flexibility** for future changes without major refactoring as AI evolves
- **Context-rich architecture** that provides maximum information for AI decision-making
- **Performance considerations** without premature optimization
- **Type safety** through generated TypeScript integration

### Key Principles for AI-First Database Design:

1. **Context Engineering > Schema Engineering**: Rich descriptions and flexible fields enable better AI interpretation than rigid metadata schemas

2. **AI Decision-Making > Hardcoded Constraints**: Let AI agents make intelligent choices about models, coordination, and resource allocation

3. **Unified Systems > Parallel Systems**: Use existing proven patterns (chat, tasks, permissions) for agent coordination rather than building agent-specific infrastructure

4. **Simple Permissions > Complex Hierarchies**: Granular permissions are better than multi-layered gates when AI can make nuanced decisions

5. **Dynamic Behavior > Static Assignments**: Provide options and let AI choose rather than pre-assigning resources or capabilities

6. **Audit Through Infrastructure > Specialized Logging**: Use existing communication and task systems for transparency rather than separate audit systems

This approach creates databases that evolve gracefully with AI capabilities while maintaining the reliability and performance expected from production systems.