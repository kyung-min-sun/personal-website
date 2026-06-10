const MAX_QUESTION_LENGTH = 2000;
const MAX_NAME_LENGTH = 100;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

export function createApp({ store, adminToken, allowedOrigin = "*" }) {
  const hits = new Map(); // ip → [timestamps], pruned per request

  function rateLimited(ip) {
    const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
    const recent = (hits.get(ip) || []).filter((t) => t > cutoff);
    recent.push(Date.now());
    hits.set(ip, recent);
    return recent.length > RATE_LIMIT_MAX;
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  const json = (status, body) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  return async function handle(req, ip = "?") {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

    if (req.method === "GET" && url.pathname === "/healthz") return json(200, { ok: true });

    if (req.method === "GET" && url.pathname === "/api/questions") {
      return json(200, { questions: store.list() });
    }

    if (req.method === "POST" && url.pathname === "/api/ask") {
      if (rateLimited(ip)) return json(429, { error: "slow down a little!" });

      let body;
      try {
        body = await req.json();
      } catch {
        return json(400, { error: "invalid json" });
      }

      const question = typeof body.question === "string" ? body.question.trim() : "";
      const name = typeof body.name === "string" ? body.name.trim().slice(0, MAX_NAME_LENGTH) : "";
      if (!question) return json(400, { error: "question is required" });
      if (question.length > MAX_QUESTION_LENGTH) {
        return json(400, { error: `question must be under ${MAX_QUESTION_LENGTH} characters` });
      }

      const entry = store.add({ name, question });
      return json(201, { question: entry });
    }

    if (req.method === "POST" && url.pathname === "/api/answer") {
      const auth = req.headers.get("authorization") || "";
      if (!adminToken || auth !== `Bearer ${adminToken}`) {
        return json(401, { error: "unauthorized" });
      }

      let body;
      try {
        body = await req.json();
      } catch {
        return json(400, { error: "invalid json" });
      }

      const answer = typeof body.answer === "string" ? body.answer.trim() : "";
      if (!body.id || !answer) return json(400, { error: "id and answer are required" });

      const entry = store.answer({ id: body.id, answer });
      if (!entry) return json(404, { error: "no question with that id" });
      return json(200, { question: entry });
    }

    return json(404, { error: "not found" });
  };
}
