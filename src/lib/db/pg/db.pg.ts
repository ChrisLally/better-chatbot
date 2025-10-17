// import { Logger } from "drizzle-orm";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// class MyLogger implements Logger {
//   logQuery(query: string, params: unknown[]): void {
//     console.log({ query, params });
//   }
// }

// Configure connection pool to handle connection issues better
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL!,
  max: 20, // Maximum number of connections
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection could not be established
  acquireTimeoutMillis: 60000, // Return error after 1 minute if no connection becomes available
});

export const pgDb = drizzlePg(pool, {
  //   logger: new MyLogger(),
});

// Utility function to handle database operations with retry logic
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if it's a connection-related error that we should retry
      const isConnectionError = error instanceof Error && (
        error.message.includes('db_termination') ||
        error.message.includes('connection') ||
        error.message.includes('timeout') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ENOTFOUND')
      );

      if (i === maxRetries || !isConnectionError) {
        throw error;
      }

      console.warn(`Database operation failed (attempt ${i + 1}/${maxRetries + 1}):`, error);
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1))); // Exponential backoff
    }
  }

  throw lastError!;
}
