import { Hono } from "hono";
import { cors } from "hono/cors";

type Env = {
  DB: D1Database;
  // Keep this so the template's required secret binding doesn't break anything.
  // We simply won't use it yet.
  SECRET: SecretsStoreSecret;
};

const app = new Hono<{ Bindings: Env }>();

// Optional but handy during early testing
app.use("*", cors());

app.get("/health", (c) => c.json({ ok: true }));

app.get("/battles/:battle_id", async (c) => {
  const battleId = c.req.param("battle_id");

  const row = await c.env.DB.prepare(
    `SELECT battle_id, campaign_id, name, state_json, version, updated_at
     FROM battles
     WHERE battle_id = ?`
  )
    .bind(battleId)
    .first();

  if (!row) {
    return c.json({ error: "Battle not found", battle_id: battleId }, 404);
  }

  return c.json(row);
});

export default app;
