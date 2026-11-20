# HTTP & Authentication — a Primer for k6

The concepts behind every request a load test makes. Companion to the
scenarios in [`http-requests/`](../http-requests/).

## What is HTTP?

A **stateless request/response protocol**. The client sends a request, the
server sends one response, and then they forget each other. That single
property — statelessness — explains most of what you do in API tests:

- every request must carry everything needed to understand it (headers, auth)
- "being logged in" is not a connection state — it's a credential the client
  re-sends every time (that's what auth tokens/cookies are for)
- load tests scale by just sending more requests — no sessions to replicate

## Anatomy of a request / response

```
REQUEST                                RESPONSE
────────                              ────────
POST /api/ratings HTTP/1.1            HTTP/1.1 201 Created
Content-Type: application/json        Content-Type: application/json
Authorization: Token Jm4w9sX2KIXM…    Location: /api/ratings/4
                                      {"id":4,"stars":4,"pizza_id":1}
{"stars":4,"pizza_id":1}
```

- **Method** — the verb: what the request wants to _do_
- **Path** — which resource: `/api/ratings`, `/api/ratings/4`
- **Headers** — metadata: content types, credentials, caching
- **Body** — the payload (for methods that carry one)

## Methods — the verbs you load test

| Method   | Semantics                                | Idempotent? | Typical success |
| -------- | ---------------------------------------- | ----------- | --------------- |
| `GET`    | read a resource, no side effects         | yes         | 200             |
| `POST`   | create a resource (or trigger an action) | no          | 201             |
| `PUT`    | replace a resource **entirely**          | yes         | 200             |
| `PATCH`  | change **part** of a resource            | no          | 200             |
| `DELETE` | remove a resource                        | yes         | 204             |

**Idempotent** = safe to replay: sending it twice leaves the same state as
once. That's why retries are harmless for GET/PUT/DELETE but dangerous for
POST (two POSTs = two resources) — and why load generators replaying
iterations behave differently across them.

## Status codes — what the server is saying

| Family | Meaning        | Ones you'll actually meet                                                                                |
| ------ | -------------- | -------------------------------------------------------------------------------------------------------- |
| 2xx    | success        | `200` OK · `201` Created (POST) · `204` No Content (DELETE)                                              |
| 3xx    | redirect       | `301`/`302` — k6 **follows them by default**; final URL in `res.url`, cap with the `maxRedirects` option |
| 4xx    | client's fault | `401` unauthenticated · `403` unauthorized · `404` not found · `429` rate-limited                        |
| 5xx    | server's fault | `500` crash · `502`/`503` overloaded — the breakpoint-test signature                                     |

k6 counts 4xx/5xx as _unexpected responses_ → they feed `http_req_failed`
(see `intro/expected-response.ts`).

## Authentication — proving identity on every request

Because HTTP is stateless, "logging in" can't be a mode — every request
carries a credential. The three shapes you'll meet:

### 1. API key

A static secret in a header, same for everyone: `X-API-Key: abc123`.
Simple, but it identifies the _application_, not a user — and rotating it
logs out the world.

### 2. Token (what QuickPizza uses)

Trade credentials for a token once, then attach the token to every request:

```
POST /api/users/token/login  {"username":…,"password":…}   →  {"token":"Jm4w9sX2KIXMB6LO"}
GET  /api/ratings            Authorization: Token Jm4w9sX2KIXMB6LO
```

The server validates the token **without storing session state** — the
token itself (or a signature on it) IS the state. `Bearer <jwt>` is the
same pattern with a self-describing token. In k6 this is explicit: you
extract the token from the login response and set the header yourself —
which makes it visible, replayable, and easy to hoist into `setup()`.

### 3. Session cookies

The server creates state (a session) and hands back a cookie:

```
POST /login  →  Set-Cookie: session=xyz; HttpOnly
GET /page    Cookie: session=xyz
```

The browser — and k6 — store cookies in a **cookie jar** and attach them
automatically to matching requests. k6 gives each VU its own jar, so VUs
never share logins. QuickPizza supports this too:
`/api/users/token/login?set_cookie=true`.

### Token vs cookies — the practical differences

|                   | Token (header)                               | Session cookie                                |
| ----------------- | -------------------------------------------- | --------------------------------------------- |
| Travels in        | header you set manually                      | `Cookie` header, jar-managed                  |
| Server state      | none (stateless) — scales trivially          | session store — a shared thing to scale/purge |
| Expiry/revocation | token itself (JWT: embedded claims)          | server-side session lifetime                  |
| In k6             | explicit: extract → attach (visible in code) | automatic (easy to forget it's happening)     |
| Load-test impact  | login once in `setup()`, reuse everywhere    | each VU logs in itself (its own jar)          |

**Rule of thumb:** tokens make auth visible and cacheable — great for load
tests; cookies make auth invisible and automatic — great for browsing.

## Putting it together in k6

- Headers per request: `http.get(url, { headers: { Authorization: … } })`
- Headers for the whole test: `options.headers`
- Parse the credential: `res.json("token")` (see `http-requests/auth.ts`)
- Login once per test, not per iteration, when it's expensive — `setup()`
  in `docs/SCRIPTING.md` §6
- Cookies are automatic per VU; inspect them via the `k6/http` cookie jar
