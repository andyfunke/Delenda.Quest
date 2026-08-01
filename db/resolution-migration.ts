const MIGRATION_NAME = "0014_campaign_resolution_grants.sql";

const migrationWasApplied = async (database: D1Database) =>
  !!(await database
    .prepare("SELECT id FROM d1_migrations WHERE name = ? LIMIT 1")
    .bind(MIGRATION_NAME)
    .first<{ id: number }>());

const resolutionMarkerExists = async (database: D1Database) => {
  const columns = await database
    .prepare("PRAGMA table_info(active_campaigns)")
    .all<{ name: string }>();
  return columns.results.some(
    (column) => column.name === "last_resolution_grant_marker",
  );
};

/**
 * Emergency compatibility bridge for the production database created before
 * resolution-authority migration 0014. Cloudflare Builds deploy source but do
 * not apply D1 migrations, so the first turnover request completes and records
 * the checked-in migration before any new schema is queried.
 */
export async function ensureResolutionAuthorityMigration() {
  const { env } = await import("cloudflare:workers");
  const database = env.DB;
  if (!database)
    throw new Error("Resolution authority storage is unavailable.");

  await database
    .prepare(
      `CREATE TABLE IF NOT EXISTS d1_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`,
    )
    .run();
  if (await migrationWasApplied(database)) return;

  const markerExists = await resolutionMarkerExists(database);
  const statements = [
    database.prepare(`CREATE TABLE IF NOT EXISTS campaign_resolution_grants (
      id text PRIMARY KEY NOT NULL,
      owner_email text NOT NULL,
      account_day_key text NOT NULL,
      campaign_id text NOT NULL,
      campaign_day integer NOT NULL,
      campaign_revision integer NOT NULL,
      campaign_state_seal text NOT NULL,
      opportunity_fraction_ppm integer NOT NULL,
      expires_at integer NOT NULL,
      created_at integer NOT NULL,
      consumed_at integer,
      invalidated_at integer
    )`),
    database.prepare(
      "CREATE INDEX IF NOT EXISTS campaign_resolution_grants_owner_day_idx ON campaign_resolution_grants (owner_email, account_day_key)",
    ),
    database.prepare(
      "CREATE INDEX IF NOT EXISTS campaign_resolution_grants_campaign_idx ON campaign_resolution_grants (owner_email, campaign_id, campaign_revision)",
    ),
    database.prepare(
      "CREATE INDEX IF NOT EXISTS campaign_resolution_grants_expiry_idx ON campaign_resolution_grants (expires_at)",
    ),
  ];
  if (!markerExists)
    statements.push(
      database.prepare(
        "ALTER TABLE active_campaigns ADD last_resolution_grant_marker text",
      ),
    );
  statements.push(
    database
      .prepare("INSERT OR IGNORE INTO d1_migrations (name) VALUES (?)")
      .bind(MIGRATION_NAME),
  );

  try {
    await database.batch(statements);
  } catch (error) {
    // A concurrent request may have completed the same idempotent migration.
    if (await migrationWasApplied(database)) return;
    throw new Error("Resolution authority storage migration failed.", {
      cause: error,
    });
  }

  if (
    !(await migrationWasApplied(database)) ||
    !(await resolutionMarkerExists(database))
  )
    throw new Error("Resolution authority storage migration was incomplete.");
}
