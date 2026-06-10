import { join } from "node:path";
import { createStore } from "./store.js";
import { createApp } from "./app.js";

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || "./data";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_TO = process.env.EMAIL_TO || "kyungminkevinsun@gmail.com";
const EMAIL_FROM = process.env.EMAIL_FROM || "questions@kyungminsun.com";
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

if (!ADMIN_TOKEN) console.warn("ADMIN_TOKEN not set — /api/answer is disabled");
if (!RESEND_API_KEY) console.warn("RESEND_API_KEY not set — questions will be stored but not emailed");

const store = createStore(join(DATA_DIR, "questions.json"));

async function sendEmail(entry) {
  if (!RESEND_API_KEY) return;
  const who = entry.name ? `${entry.name} asks` : "someone asks";
  // the email contains a ready-to-paste answer command so replying takes one edit
  const answerCmd = [
    `curl -X POST ${PUBLIC_URL}/api/answer \\`,
    `  -H "Authorization: Bearer $ADMIN_TOKEN" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{"id": "${entry.id}", "answer": "..."}'`,
  ].join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `questions <${EMAIL_FROM}>`,
      to: [EMAIL_TO],
      subject: `${who}: ${entry.question.slice(0, 80)}`,
      text: `${entry.question}\n\n— ${entry.name || "anon"}, ${entry.askedAt}\n\nto answer:\n${answerCmd}\n`,
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
}

const app = createApp({
  store,
  sendEmail,
  adminToken: ADMIN_TOKEN,
  allowedOrigin: ALLOWED_ORIGIN,
});

const server = Bun.serve({
  port: PORT,
  fetch: (req, srv) =>
    app(req, req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || srv.requestIP(req)?.address || "?"),
});

console.log(`questions server listening on :${server.port}`);
