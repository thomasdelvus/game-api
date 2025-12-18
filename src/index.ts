import { Hono } from "hono";
import { cors } from "hono/cors";

type Env = {
  DB: D1Database;
  // Bound in wrangler.jsonc; we keep the type so builds stay happy.
  // Not used yet.
  SECRET: SecretsStoreSecret;
};

const app = new Hono<{ Bindings: Env }>();

// CORS everywhere (handy for browser-based testing later)
app.use("*", cors());

// Sanity endpoints
app.get("/", (c) => c.text("ok"));
app.get("/health", (c) => c.json({ ok: true }));

// List all battles (diagnostic + useful)
app.get("/battles", async (c) => {
  const results = await c.env.DB.prepare(
    `SELECT battle_id, campaign_id, name, state_json, version, updated_at
     FROM battles
     ORDER BY updated_at DESC`
  ).all();

  return c.json({ count: results.results.length, rows: results.results });
});

// Get one battle by id
app.get("/battles/:battle_id", async (c) => {
  const battleId = c.req.param("battle_id");

  const row = await c.env.DB.prepare(
    `SELECT battle_id, campaign_id, name, state_json, version, updated_at
     FROM battles
     WHERE battle_id = ?`
  )
    .bind(battleId)
    .first();

  if (!row) return c.json({ error: "Battle not found", battle_id: battleId }, 404);
  return c.json(row);
});

// Export in the most compatible Worker shape
export default { fetch: app.fetch };
