// src/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";

type Env = {
  DB: D1Database;
  SECRET: SecretsStoreSecret; // Secrets Store binding named "SECRET"
};

const app = new Hono<{ Bindings: Env }>();

// CORS (fine for now). Tighten later if you want.
app.use("*", cors());

// ----- Auth middleware (Bearer token matches Secrets Store value) -----
const requireAuth = async (c: any, next: any) => {
  const auth = c.req.header("Authorization");
  if (!auth) return c.json({ error: "Missing Authorization header" }, 401);

  const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;

  const secret = await c.env.SECRET.get();
  if (!secret) return c.json({ error: "Server secret not configured" }, 500);

  if (token !== secret) return c.json({ error: "Invalid token" }, 403);

  await next();
};

// ----- Public routes -----
app.get("/", (c) => c.text("ok"));
app.get("/health", (c) => c.json({ ok: true }));

// ----- Protected routes -----
app.use("/battles", requireAuth);
app.use("/battles/*", requireAuth);

// GET /battles  -> list all battles
app.get("/battles", async (c) => {
  const results = await c.env.DB.prepare(
    `SELECT battle_id, campaign_id, name, state_json, version, updated_at
     FROM battles
     ORDER BY updated_at DESC`
  ).all();

  const rows = (results?.results ?? []) as any[];
  return c.json({ count: rows.length, rows });
});

// GET /battles/:battle_id -> get one battle
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

export default { fetch: app.fetch };
