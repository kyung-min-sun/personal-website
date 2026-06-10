import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

export function createStore(file) {
  mkdirSync(dirname(file), { recursive: true });

  function load() {
    if (!existsSync(file)) return { questions: [] };
    return JSON.parse(readFileSync(file, "utf8"));
  }

  // write tmp + rename so a crash mid-write never corrupts the file
  function save(data) {
    const tmp = join(dirname(file), `.questions.tmp-${process.pid}`);
    writeFileSync(tmp, JSON.stringify(data, null, 2));
    renameSync(tmp, file);
  }

  return {
    list() {
      return load().questions.slice().sort((a, b) => (a.askedAt < b.askedAt ? 1 : -1));
    },

    add({ name, question, now = new Date() }) {
      const data = load();
      const entry = {
        id: randomUUID(),
        name: name || null,
        question,
        askedAt: now.toISOString(),
        answer: null,
        answeredAt: null,
      };
      data.questions.push(entry);
      save(data);
      return entry;
    },

    answer({ id, answer, now = new Date() }) {
      const data = load();
      const entry = data.questions.find((q) => q.id === id);
      if (!entry) return null;
      entry.answer = answer;
      entry.answeredAt = now.toISOString();
      save(data);
      return entry;
    },
  };
}
