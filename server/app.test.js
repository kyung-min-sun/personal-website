import { test, expect } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStore } from "./store.js";
import { createApp } from "./app.js";

function makeServer({ adminToken = "secret" } = {}) {
  const store = createStore(join(mkdtempSync(join(tmpdir(), "questions-")), "questions.json"));
  let ip = "1.2.3.4";
  const app = createApp({ store, adminToken });
  const server = Bun.serve({ port: 0, fetch: (req) => app(req, ip) });
  return {
    base: `http://localhost:${server.port}`,
    store,
    setIp: (v) => (ip = v),
    close: () => server.stop(true),
  };
}

test("ask → list → answer round trip", async () => {
  const { base, close } = makeServer();
  try {
    const ask = await fetch(`${base}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "how did you get into freight?", name: "jamie" }),
    });
    expect(ask.status).toBe(201);
    const { question: entry } = await ask.json();
    expect(entry.name).toBe("jamie");

    const list = await (await fetch(`${base}/api/questions`)).json();
    expect(list.questions.length).toBe(1);
    expect(list.questions[0].answer).toBeNull();

    const answer = await fetch(`${base}/api/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer secret" },
      body: JSON.stringify({ id: entry.id, answer: "family business!" }),
    });
    expect(answer.status).toBe(200);

    const after = await (await fetch(`${base}/api/questions`)).json();
    expect(after.questions[0].answer).toBe("family business!");
    expect(after.questions[0].answeredAt).toBeTruthy();
  } finally {
    close();
  }
});

test("rejects empty and oversized questions", async () => {
  const { base, close } = makeServer();
  try {
    const empty = await fetch(`${base}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "   " }),
    });
    expect(empty.status).toBe(400);

    const huge = await fetch(`${base}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "x".repeat(2001) }),
    });
    expect(huge.status).toBe(400);
  } finally {
    close();
  }
});

test("answer requires the admin token", async () => {
  const { base, store, close } = makeServer();
  try {
    const entry = store.add({ name: "", question: "hi!!" });
    const bad = await fetch(`${base}/api/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer wrong" },
      body: JSON.stringify({ id: entry.id, answer: "hello" }),
    });
    expect(bad.status).toBe(401);
  } finally {
    close();
  }
});


test("rate limits a chatty ip", async () => {
  const { base, close } = makeServer();
  try {
    let last;
    for (let i = 0; i < 6; i++) {
      last = await fetch(`${base}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: `q${i}` }),
      });
    }
    expect(last.status).toBe(429);
  } finally {
    close();
  }
});

test("newest questions come first", async () => {
  const { base, store, close } = makeServer();
  try {
    store.add({ question: "first", now: new Date("2026-06-05T17:37:00Z") });
    store.add({ question: "second", now: new Date("2026-06-07T19:34:00Z") });
    const list = await (await fetch(`${base}/api/questions`)).json();
    expect(list.questions.map((q) => q.question)).toEqual(["second", "first"]);
  } finally {
    close();
  }
});
