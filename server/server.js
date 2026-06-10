import { join } from "node:path";
import { createStore } from "./store.js";
import { createApp } from "./app.js";

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || "./data";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

if (!ADMIN_TOKEN) console.warn("ADMIN_TOKEN not set — /api/answer is disabled");

const store = createStore(join(DATA_DIR, "questions.json"));

const app = createApp({
  store,
  adminToken: ADMIN_TOKEN,
  allowedOrigin: ALLOWED_ORIGIN,
});

const server = Bun.serve({
  port: PORT,
  fetch: (req, srv) =>
    app(req, req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || srv.requestIP(req)?.address || "?"),
});

console.log(`questions server listening on :${server.port}`);
