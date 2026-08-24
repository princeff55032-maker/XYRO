/**
 * Local development database manager (embedded PostgreSQL — no install needed).
 *
 *   npm run db:start   → initialise (downloads binaries once) + start server + ensure `gymverse` DB (UTF8)
 *   npm run db:stop    → stop server
 *
 * Keeps the production schema (PostgreSQL) faithful while running locally.
 * NOTE: run via `Start-Process node.exe scripts/db.js start` so it stays alive detached
 * (the library stops the server when the script exits).
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { default: EmbeddedPostgres } = require("embedded-postgres");

const DATA_DIR = path.join(__dirname, "..", ".dbdata");
const PORT = 5432;
const DB_NAME = "gymverse";

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: "postgres",
  password: "postgres",
  port: PORT,
  persistent: true,
});

const DATA_DIR_EXISTS = fs.existsSync(path.join(DATA_DIR, "PG_VERSION"));

async function ensureDatabase() {
  const client = new Client({
    connectionString: `postgresql://postgres:postgres@localhost:${PORT}/postgres`,
  });
  await client.connect();
  try {
    const res = await client.query(
      "SELECT pg_encoding_to_char(encoding) AS enc FROM pg_database WHERE datname = $1",
      [DB_NAME]
    );
    if (res.rows.length === 0) {
      await client.query(
        `CREATE DATABASE "${DB_NAME}" WITH ENCODING 'UTF8' TEMPLATE template0`
      );
      console.log(`[db] created database "${DB_NAME}" (UTF8)`);
    } else if (res.rows[0].enc !== "UTF8") {
      await client.query(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
        [DB_NAME]
      );
      await client.query(`DROP DATABASE "${DB_NAME}"`);
      await client.query(
        `CREATE DATABASE "${DB_NAME}" WITH ENCODING 'UTF8' TEMPLATE template0`
      );
      console.log(`[db] recreated database "${DB_NAME}" as UTF8`);
    } else {
      console.log(`[db] database "${DB_NAME}" already exists (UTF8)`);
    }
  } finally {
    await client.end();
  }
}

async function start() {
  if (!DATA_DIR_EXISTS) {
    console.log(`[db] initialising data dir: ${DATA_DIR}`);
    await pg.initialise(); // downloads PostgreSQL binaries on first run
  } else {
    console.log("[db] cluster already initialised — skipping initdb");
  }
  console.log("[db] starting server...");
  await pg.start();
  console.log(`[db] server running on 127.0.0.1:${PORT}`);
  await ensureDatabase();
}

async function stop() {
  console.log("[db] stopping server...");
  await pg.stop();
  console.log("[db] stopped");
}

const cmd = process.argv[2];
if (cmd === "start") {
  start()
    .then(() => console.log("[db] ready"))
    .catch((e) => {
      console.error("[db] failed to start:", e && e.message ? e.message : e);
      process.exit(1);
    });
} else if (cmd === "stop") {
  stop().catch((e) => {
    console.error("[db] failed to stop:", e && e.message ? e.message : e);
    process.exit(1);
  });
} else {
  console.error("usage: node scripts/db.js <start|stop>");
  process.exit(1);
}
