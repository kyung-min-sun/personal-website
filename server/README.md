# questions server

The tiny backend behind the questions box on [kyungminsun.com](https://www.kyungminsun.com/questions.html).
Zero dependencies — plain Bun.

- `POST /api/ask` `{ question, name? }` — stores the question and emails it to me
- `GET /api/questions` — the public feed, newest first
- `POST /api/answer` `{ id, answer }` (Bearer `ADMIN_TOKEN`) — posts an answer to the feed
- `GET /healthz`

Questions live in a single JSON file at `$DATA_DIR/questions.json` (atomic
writes). Each new question is emailed via [Resend](https://resend.com); the
email includes a ready-to-paste `curl` for answering it. A failed email never
drops the question — it's stored first.

## Run locally

```bash
cd server
ADMIN_TOKEN=dev bun server.js      # http://localhost:3000
bun test                           # test suite
```

Without `RESEND_API_KEY` the server stores questions but skips email — handy
for local dev.

## Deploy (Railway)

1. New service from this repo, **root directory `server`** (Railpack
   autodetects Bun from `bun.lock` and runs `bun start`).
2. Attach a **volume** mounted at `/data`.
3. Variables:

   | var | value |
   |---|---|
   | `DATA_DIR` | `/data` |
   | `ADMIN_TOKEN` | something long and random |
   | `RESEND_API_KEY` | from resend.com (verify the sending domain) |
   | `EMAIL_TO` | defaults to kyungminkevinsun@gmail.com |
   | `EMAIL_FROM` | defaults to questions@kyungminsun.com |
   | `ALLOWED_ORIGIN` | `https://www.kyungminsun.com` |
   | `PUBLIC_URL` | the service's public URL (used in answer emails) |

4. Point the frontend at it: `questions.html` reads the API base from the
   `data-questions-api` attribute on its `<script>` tag — set it to the
   service's public URL.

## Answering

Reply day-of by pasting the curl from the notification email:

```bash
curl -X POST $PUBLIC_URL/api/answer \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": "<from the email>", "answer": "good question!"}'
```
