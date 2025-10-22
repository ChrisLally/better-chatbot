import fs from "fs";
import path from "path";

export interface DocEntry {
  title: string;
  path: string;
  category: string;
  description: string;
  slug: string[];
}

export interface DocsIndex {
  docs: DocEntry[];
  structure: Record<string, DocEntry[]>;
}

export interface DocContent extends DocEntry {
  content: string;
  nextDoc?: Omit<DocEntry, "content">;
  prevDoc?: Omit<DocEntry, "content">;
}

const DOCS_DIR = path.join(process.cwd(), "docs");

/**
 * Sanitize slug to prevent directory traversal attacks
 */
function sanitizeSlug(slug: string[]): string[] {
  return slug.filter((part) => {
    // Reject empty parts, dots, and suspicious patterns
    if (
      !part ||
      part === "." ||
      part === ".." ||
      part.includes("/") ||
      part.includes("\\")
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Extract first heading from markdown content as description
 */
function extractDescription(content: string): string {
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) {
      return trimmed
        .replace(/^#+\s*/, "") // Remove markdown heading markers
        .substring(0, 100); // Limit to 100 chars
    }
  }
  return "";
}

/**
 * Get title from first heading or format filename
 */
function getDisplayTitle(filePath: string, fileContent: string): string {
  const description = extractDescription(fileContent);
  if (description) return description;

  const fileName = path.basename(filePath, ".md");
  return fileName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Generate slug array from file path
 */
function generateSlug(filePath: string): string[] {
  const relativePath = path.relative(DOCS_DIR, filePath);
  const parts = relativePath.replace(/\.md$/, "").split(path.sep);
  return parts;
}

/**
 * Recursively scan docs directory and return all entries
 */
function scanDocsRecursive(dir: string): DocEntry[] {
  const entries: DocEntry[] = [];

  if (!fs.existsSync(dir)) {
    return entries;
  }

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      entries.push(...scanDocsRecursive(fullPath));
    } else if (file.endsWith(".md")) {
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        const slug = generateSlug(fullPath);
        const category = slug[0];

        const entry: DocEntry = {
          title: getDisplayTitle(fullPath, content),
          path: slug.join("/"),
          slug,
          category,
          description: extractDescription(content),
        };

        entries.push(entry);
      } catch (error) {
        console.error(`Error reading file ${fullPath}:`, error);
      }
    }
  }

  return entries;
}

/**
 * Build structure organized by category
 */
function buildStructure(entries: DocEntry[]): Record<string, DocEntry[]> {
  const structure: Record<string, DocEntry[]> = {};

  for (const entry of entries) {
    if (!structure[entry.category]) {
      structure[entry.category] = [];
    }
    structure[entry.category].push(entry);
  }

  // Sort each category alphabetically by path
  for (const category in structure) {
    structure[category].sort((a, b) => a.path.localeCompare(b.path));
  }

  return structure;
}

/**
 * Get all docs with index structure
 */
export function getAllDocs(): DocsIndex {
  const docs = scanDocsRecursive(DOCS_DIR);
  const structure = buildStructure(docs);

  return {
    docs,
    structure,
  };
}

/**
 * Get a single document by slug
 */
export function getDocBySlug(slug: string[]): DocContent | null {
  const sanitized = sanitizeSlug(slug);
  const filePath = path.join(DOCS_DIR, ...sanitized) + ".md";

  // Prevent directory traversal
  const realPath = path.resolve(filePath);
  const docsRealPath = path.resolve(DOCS_DIR);
  if (!realPath.startsWith(docsRealPath)) {
    return null;
  }

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const entry = getDocEntry(slug);

    if (!entry) {
      return null;
    }

    const { nextDoc, prevDoc } = getNextPrevDocs(slug);

    return {
      ...entry,
      content,
      nextDoc,
      prevDoc,
    };
  } catch (error) {
    console.error(`Error reading doc at ${filePath}:`, error);
    return null;
  }
}

/**
 * Get a doc entry by slug (without content)
 */
function getDocEntry(slug: string[]): DocEntry | null {
  const index = getAllDocs();
  const pathStr = slug.join("/");

  return index.docs.find((doc) => doc.path === pathStr) || null;
}

/**
 * Get next and previous documents in reading order
 */
export function getNextPrevDocs(currentSlug: string[]): {
  nextDoc?: Omit<DocEntry, "content">;
  prevDoc?: Omit<DocEntry, "content">;
} {
  const index = getAllDocs();
  const currentPath = currentSlug.join("/");

  // Find current doc index
  const currentIndex = index.docs.findIndex((doc) => doc.path === currentPath);

  if (currentIndex === -1) {
    return {};
  }

  const result: {
    nextDoc?: Omit<DocEntry, "content">;
    prevDoc?: Omit<DocEntry, "content">;
  } = {};

  if (currentIndex > 0) {
    const prev = index.docs[currentIndex - 1];
    result.prevDoc = prev;
  }

  if (currentIndex < index.docs.length - 1) {
    const next = index.docs[currentIndex + 1];
    result.nextDoc = next;
  }

  return result;
}
