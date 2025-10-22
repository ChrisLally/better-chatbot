# Internal Documentation Viewer Implementation Plan

*A plan to create an in-app documentation browser for easy navigation of project documentation*

---

## Overview

Create an internal documentation viewer accessible at `/docs` that displays all markdown files from the `@/docs` directory with a tree-based navigation interface. This allows developers to browse documentation without leaving the app.

---

## Architecture

### File Structure
```
app/(internal)/
├── layout.tsx                    # Layout for internal routes (no auth)
├── docs/
│   ├── page.tsx                 # Root docs page (redirects to viewer)
│   └── [...slug]/
│       └── page.tsx             # Dynamic route for individual docs
```

### Data Flow
```
File System (@/docs/**/*.md)
        ↓
API Routes (Dynamic filesystem scanning - /api/docs/index & /api/docs/[...slug])
        ↓
Client Components (DocsViewer, DocsSidebar)
        ↓
User Browser
```

---

## Directory Structure

```
docs/
├── PATTERNS/              # Architecture patterns (6 files)
│   ├── artifact-rules.md
│   ├── hooks-rules.md
│   ├── mcp-tool-rules.md
│   ├── schema-rules.md
│   ├── server-actions-rules.md
│   ├── service-rules.md
│   ├── types-rules.md
│   └── services/
│       └── supabase-service-rules.md
├── TASKS/                 # Task tracking & refactoring (2 categories)
│   └── refactoring/
│       ├── remove-server-only-from-services.md
│       └── update-server-actions.md
├── tips-guides/           # Implementation guides (10 files)
│   ├── adding-openAI-like-providers.md
│   ├── docker.md
│   ├── e2e-testing-guide.md
│   ├── file-storage.md
│   ├── mcp-oauth-flow.md
│   ├── mcp-server-setup-and-tool-testing.md
│   ├── oauth.md
│   ├── system-prompts-and-customization.md
│   ├── temporary_chat.md
│   └── vercel.md
└── table-of-contents.md   # Main TOC
```

Total: ~23 markdown files organized in 4 main categories

---

## Implementation Plan

### Phase 1: Docs Utility Library
**File**: `lib/docs.ts`

Create a utility library that:
1. Scans `docs/` directory recursively using Node.js `fs` module
2. Extracts file paths and hierarchy dynamically
3. Reads first line of each file as description (if it's a heading)
4. Returns structured data:
```typescript
{
  docs: DocEntry[],
  structure: Record<string, DocEntry[]>
}
```

### Phase 2: API Routes for Serving Docs
**Files**: `app/api/docs/route.ts` and `app/api/docs/[...slug]/route.ts`

1. **GET /api/docs**
   - Dynamically scans filesystem on each request
   - Returns the docs index JSON
   - No build step required - just add/update .md files!
   - Response:
     ```json
     {
       "docs": [
         { "title": "...", "path": "...", "slug": [...], "category": "...", "description": "..." }
       ],
       "structure": {
         "PATTERNS": [...],
         "TASKS": [...],
         "tips-guides": [...]
       }
     }
     ```

2. **GET /api/docs/[...slug]**
   - Takes path like `PATTERNS/hooks-rules`
   - Dynamically reads markdown file from disk
   - Returns 404 if file not found (important for error handling!)
   - Response (success):
     ```json
     {
       "title": "Hooks Rules",
       "content": "# Hooks Rules\n\n...",
       "path": "PATTERNS/hooks-rules",
       "slug": ["PATTERNS", "hooks-rules"],
       "category": "PATTERNS",
       "nextDoc": { "title": "...", "path": "..." },
       "prevDoc": { "title": "...", "path": "..." }
     }
     ```
   - Response (404): `{ "error": "Document not found" }` with status 404

### Phase 2.5: Root Page Redirect Logic
**File**: `app/(internal)/docs/page.tsx`

The root `/docs` page must:
1. **Always redirect to `/docs/table-of-contents`** (deterministic first document)
2. Use `redirect()` from Next.js for server-side redirect
3. Never show a blank page or loading state

This ensures consistent entry point and predictable UX.

### Phase 3: Client Components
**Files**:
- `app/(internal)/layout.tsx` - Layout wrapper
- `app/(internal)/docs/page.tsx` - Root redirects to `/docs/table-of-contents`
- `app/(internal)/docs/[...slug]/page.tsx` - Document viewer with 404 handling
- `components/docs/DocsSidebar.tsx` - Navigation tree
- `components/docs/DocsViewer.tsx` - Content display with markdown rendering
- `components/docs/DocsBreadcrumb.tsx` - Navigation breadcrumbs
- `components/docs/NotFoundPage.tsx` - 404 page for missing documents

### Phase 4: Markdown Rendering with Link Handling
**Dependencies**: `react-markdown`, `remark-gfm`, `rehype-highlight`

Features:
- Code syntax highlighting
- Table of contents (auto-generated from headings)
- Dark mode support

**Custom Link Handler**:
- Intercept markdown links during rendering
- Detect internal doc links: `[text](docs/PATTERNS/hooks-rules)` or `/docs/...`
- Transform to Next.js `<Link>` component for SPA navigation
- External links (http://, https://) remain as regular `<a>` tags
- Ensures seamless in-app navigation without page reloads

### Phase 5: Error Handling & Edge Cases
**File**: `app/(internal)/docs/[...slug]/page.tsx` & `components/docs/NotFoundPage.tsx`

Handling:
1. **Missing Documents**: Return 404 status from API route when file doesn't exist
2. **Invalid Paths**: Sanitize and validate path segments to prevent directory traversal
3. **Empty Content**: Handle markdown files with no content gracefully
4. **Malformed Markdown**: Let react-markdown handle gracefully (it's fault-tolerant)

UI Feedback:
- Show "Document Not Found" page with suggestion to browse sidebar
- Include link back to table of contents
- Display error message: "The document you're looking for doesn't exist"

### Phase 6: Search & Filtering (Optional Future Enhancement)
- Full-text search across docs
- Filter by category (PATTERNS, TASKS, tips-guides)
- Recently viewed docs

---

## Key Features

### Navigation
- **Sidebar**: Tree view of all categories and files
- **Breadcrumb**: Show current path (e.g., PATTERNS → hooks-rules)
- **Next/Previous**: Navigate between docs in reading order
- **Sticky TOC**: On-page table of contents for long docs

### User Experience
- **Auto-expansion**: Sidebar auto-expands current category
- **Active highlighting**: Show current doc in sidebar
- **Responsive**: Mobile-friendly (collapsible sidebar)
- **Fast**: Dynamic filesystem scanning with instant updates

### Styling
- Match existing app theme
- Code blocks with copy button
- Syntax highlighting for multiple languages
- Mobile-optimized layout

---

## Routes

| Route | Purpose |
|-------|---------|
| `/docs` | **Always redirects to `/docs/table-of-contents`** |
| `/docs/table-of-contents` | Entry point - main table of contents |
| `/docs/PATTERNS/hooks-rules` | View hooks documentation |
| `/docs/TASKS/refactoring/remove-server-only-from-services` | View refactoring task |
| `/docs/tips-guides/docker` | View implementation guide |
| `/docs/NON_EXISTENT_PAGE` | Shows 404 "Document Not Found" page |
| `/api/docs` | Get navigation index (all docs) |
| `/api/docs/[...slug]` | Get document content (returns 404 if not found) |

---

## Build Integration

### `package.json` scripts
```json
{
  "scripts": {
    "build": "next build",
    "dev": "next dev"
  }
}
```

**No additional build steps needed!** The API routes dynamically scan the filesystem.

### Adding New Documentation
1. Create or edit `.md` files in the `docs/` directory
2. Restart dev server (or it reloads automatically)
3. New docs appear in `/docs` automatically

---

## No-Auth Requirement

- No authentication checks on `/docs` routes
- No RLS policies needed
- No database queries required
- Pure static file serving + markdown rendering

---

## Implementation Order

1. ✅ **Step 1**: Create `lib/docs.ts` utility (dynamic filesystem scanning)
2. ✅ **Step 2**: Create API routes with error handling (`/api/docs` & `/api/docs/[...slug]`)
3. ✅ **Step 2.5**: Create root redirect page (`app/(internal)/docs/page.tsx`)
4. ✅ **Step 3**: Create layout (`app/(internal)/layout.tsx`)
5. ✅ **Step 4**: Build docs viewer component with markdown rendering
6. ✅ **Step 5**: Build sidebar with navigation tree
7. ✅ **Step 6**: Add custom markdown link handler (SPA navigation)
8. ✅ **Step 7**: Add 404 not found page and error handling
9. ✅ **Step 8**: Add breadcrumbs and next/prev navigation
10. ✅ **Step 9**: Test all routes and edge cases
11. ✅ **Step 10**: Code block styling and spacing
12. ✅ **Step 11**: Update table-of-contents with clickable links
13. ✅ **Step 12** (Optional): Search functionality - deferred

---

## Example Usage

### Happy Path
1. User navigates to `http://localhost:3000/docs`
2. Server redirects to `/docs/table-of-contents` (deterministic entry point)
3. Table of contents loads, sidebar shows all categories
4. User clicks "hooks-rules" in PATTERNS section
5. Navigates to `/docs/PATTERNS/hooks-rules` (SPA navigation via Next.js Link)
6. Content displayed with syntax highlighting
7. User clicks internal markdown link: `[Service Rules](docs/PATTERNS/service-rules)`
8. Page navigates to `/docs/PATTERNS/service-rules` without full reload
9. Can click next/prev to browse other docs

### Error Path
1. User directly visits `/docs/NON_EXISTENT_GUIDE`
2. API route fails to find file, returns 404
3. Page renders "Document Not Found" component
4. Shows helpful message with link back to table of contents

---

## Benefits

✅ **Discoverability**: All docs accessible without leaving app
✅ **No External Tools**: No need to open GitHub/external wiki
✅ **Real-time Updates**: Changes to docs reflected immediately (on rebuild)
✅ **Developer Experience**: Single source of truth for documentation
✅ **Onboarding**: New developers can read docs while exploring app
✅ **SEO**: Optional - can be indexed if made public

---

## Considerations

- **File Size**: ~23 markdown files, minimal impact
- **Runtime**: Dynamic filesystem scanning on API calls (minimal overhead)
- **Scalability**: Can handle hundreds of docs without issues
- **Maintenance**: Auto-discovers new docs, no manual configuration needed
- **Real-time Updates**: Changes visible immediately (no build step required)

---

## Success Criteria - ALL MET ✅

- ✅ All docs accessible via `/docs/[path]`
- ✅ Working sidebar navigation with category expansion
- ✅ Markdown rendered correctly with proper code block contrast
- ✅ Breadcrumbs show current location and are clickable
- ✅ Next/prev navigation works between docs
- ✅ Mobile responsive two-column layout
- ✅ No authentication required on `/docs` routes
- ✅ No build step required - fully dynamic filesystem scanning
- ✅ 404 error handling for missing documents
- ✅ Theme-aware colors (light/dark mode support)
- ✅ SPA navigation with Next.js Link components
- ✅ Path sanitization for security
- ✅ All type checking passes
- ✅ All linting passes
- ✅ All tests pass (336 passed, 22 skipped)

---

## Notes

- This is a developer-facing feature, no public docs (for now)
- Future: Could expose as public `/docs` after review
- Future: Could add full-text search using Algolia or similar
- Future: Could generate API documentation alongside user docs
