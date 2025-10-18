import fs from "fs";
import path from "path";
import { Client } from "pg";

async function getTriggers() {
  try {
    // Read the SQL file
    const sqlPath = path.join(
      process.cwd(),
      "src/lib/supabase/_sql/get_triggers.sql",
    );
    const sqlQuery = fs.readFileSync(sqlPath, "utf8");

    // Get database connection string from environment or construct it
    let dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

    if (!dbUrl) {
      // Try to construct from existing env vars
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const dbPassword = process.env.SUPABASE_DB_PASSWORD;

      if (supabaseUrl && dbPassword) {
        // Extract project ref from URL like https://abcdef.supabase.co
        const projectRef = supabaseUrl
          .replace("https://", "")
          .replace(".supabase.co", "");
        dbUrl = `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;
      } else {
        throw new Error(
          "DATABASE_URL not found and cannot construct from NEXT_PUBLIC_SUPABASE_URL/SUPABASE_DB_PASSWORD",
        );
      }
    }

    // Connect directly to PostgreSQL
    const client = new Client({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();
    const result = await client.query(sqlQuery);
    await client.end();

    const triggers = result.rows;

    // Ensure output directory exists
    const outputDir = path.join(process.cwd(), "src/lib/supabase/_json");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write to JSON file
    const outputPath = path.join(outputDir, "triggers.json");
    fs.writeFileSync(outputPath, JSON.stringify(triggers, null, 2));

    console.log(`✅ Triggers exported to ${outputPath}`);
    console.log(`📊 Found ${triggers?.length || 0} triggers`);
  } catch (error) {
    console.error("❌ Error getting triggers:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  getTriggers();
}

export { getTriggers };
