import Link from "next/link";

export function NotFoundPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4 text-foreground">404</h1>
        <h2 className="text-2xl font-semibold mb-4 text-foreground">
          Document Not Found
        </h2>
        <p className="text-muted-foreground mb-8">
          The documentation page you're looking for doesn't exist. Please check
          the URL or browse from the table of contents.
        </p>

        <div className="flex flex-col gap-4">
          <Link
            href="/docs/table-of-contents"
            className="px-6 py-3 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition"
          >
            Back to Documentation
          </Link>

          <Link
            href="/"
            className="px-6 py-3 border border-border rounded hover:bg-accent/10 transition text-foreground"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
