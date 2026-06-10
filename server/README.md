# questions server

The tiny backend behind the questions box on [kyungminsun.com](https://www.kyungminsun.com/questions.html).
Zero dependencies — plain Bun.

- `POST /api/ask` `{ question, name? }` — stores the question
- `GET /api/questions` — the public feed, newest first
- `POST /api/answer` `{ id, answer }` (Bearer `ADMIN_TOKEN`) — posts an answer to the feed
- `GET /healthz`

Questions live in a single JSON file at `$DATA_DIR/questions.json` (atomic
writes).

## Run locally

```bash
cd server
ADMIN_TOKEN=dev bun server.js      # http://localhost:3000
bun test                           # test suite
```

## Deploy (Railway)

1. New service from this repo, **root directory `server`** (Railpack
   autodetects Bun and runs `bun start`).
2. Attach a **volume** mounted at `/data`.
3. Variables:

   | var | value |
   |---|---|
   | `DATA_DIR` | `/data` |
   | `ADMIN_TOKEN` | something long and random |
   | `ALLOWED_ORIGIN` | `https://www.kyungminsun.com` |

4. Point the frontend at it: `questions.html` reads the API base from the
   `data-questions-api` attribute on its `<script>` tag — set it to the
   service's public URL.

## Answering

Check the feed for new questions, then answer by id:

```bash
curl $PUBLIC_URL/api/questions

curl -X POST $PUBLIC_URL/api/answer \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": "<from the feed>", "answer": "good question!"}'
```
