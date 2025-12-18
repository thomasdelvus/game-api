import { Hono } from "hono";
import { cors } from "hono/cors";

type Env = {
  DB: D1Database;
  SECRET: SecretsStoreSecret; // required by your wrangler.jsonc binding, unused for now
};

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

app.get("/", (c) => c.text("ok"));              // <- extra sanity route
app.get("/health", (c) => c.json({ ok: true })); // <- the one we're testing

app.get("/battles/:battle_id", async (c) => {
  const battleId = c.req.param("battle_id");

  const row = await c.env.DB.prepare(
    `SELECT battle_id, campaign_id, name, state_json, version, updated_at
     FROM battles
     WHERE battle_id = ?`
  )
    .bind(battleId)
    .first();

  if (!row) return c.json({ error: "Battle not found" }, 404);
  return c.json(row);
});

// This export shape matches Workers' expected handler 100% reliably
export default { fetch: app.fetch };
