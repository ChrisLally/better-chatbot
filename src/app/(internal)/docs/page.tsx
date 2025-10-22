import { redirect } from "next/navigation";

/**
 * Root /docs page - redirects to table-of-contents
 *
 * We redirect to table-of-contents.md as the deterministic entry point
 * to ensure consistent UX. All users land on the same page initially,
 * from which they can navigate to other documentation.
 */
export default function DocsRootPage() {
  // This redirect happens server-side before rendering
  redirect("/docs/table-of-contents");
}
