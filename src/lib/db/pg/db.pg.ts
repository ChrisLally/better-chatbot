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
