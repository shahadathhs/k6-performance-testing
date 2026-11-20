/**
 * CRUD LIFECYCLE — POST → GET → PUT → PATCH → DELETE with correlation
 *
 * What:  the full life of one resource: create it (POST, 201), read it
 *        back (GET, 200), replace it entirely (PUT, 200), change one
 *        field (PATCH, 200), delete it (DELETE, 204), and prove it's
 *        gone (GET, 404). The id returned by POST is CORRELATED into
 *        every subsequent URL.
 * Why:   this is what "testing an API" means — not hitting endpoints,
 *        but walking a resource through its state machine and checking
 *        the contract at each transition (including status codes:
 *        201 for created, 204 for deleted, 404 for gone).
 * Watch: one ✓ per lifecycle step; PUT sends the WHOLE object, PATCH
 *        sends only the changed field ({ stars: 3 }). Forgetting that
 *        distinction is the classic real-world bug.
 */
import { check } from "k6";
import http from "k6/http";
import type { Options } from "k6/options";

import { BASE_URL } from "../lib/config.ts";

export const options: Options = {
  vus: 1, // a stateful flow: keep it sequential while learning
  iterations: 3,
};

const JSON_HEADERS = { "Content-Type": "application/json" };

export default function (): void {
  const credentials = {
    username: `k6_${Date.now()}_${__VU}_${__ITER}`,
    password: "secret123",
  };

  // ── auth: register + login → token (see auth.ts for the details) ──
  http.post(`${BASE_URL}/api/users`, JSON.stringify(credentials), {
    headers: JSON_HEADERS,
  });
  const token = http
    .post(`${BASE_URL}/api/users/token/login`, JSON.stringify(credentials), {
      headers: JSON_HEADERS,
    })
    .json("token") as string;
  const authHeaders = {
    headers: { ...JSON_HEADERS, Authorization: `Token ${token}` },
  };

  // ── CREATE — POST → 201, and grab the new resource's id ───────────
  const createRes = http.post(
    `${BASE_URL}/api/ratings`,
    JSON.stringify({ pizza_id: 1, stars: 4 }), // Rating = { pizza_id, stars }
    authHeaders,
  );
  check(createRes, { "POST created (201)": (r) => r.status === 201 });

  // ── CORRELATION: the id from the response drives every next URL ───
  const id = createRes.json("id");
  const url = `${BASE_URL}/api/ratings/${id}`;

  // ── READ — GET → 200, same id comes back ──────────────────────────
  const readRes = http.get(url, authHeaders);
  check(readRes, {
    "GET retrieved (200)": (r) => r.status === 200,
    "same rating id": (r) => r.json("id") === id,
  });

  // ── REPLACE — PUT → 200, sends the COMPLETE object ────────────────
  const putRes = http.put(
    url,
    JSON.stringify({ pizza_id: 1, stars: 5 }), // full representation
    authHeaders,
  );
  check(putRes, { "PUT replaced (200)": (r) => r.status === 200 });

  // ── PARTIAL UPDATE — PATCH → 200, sends ONLY the changed field ────
  const patchRes = http.patch(
    url,
    JSON.stringify({ stars: 3 }), // just the delta
    authHeaders,
  );
  check(patchRes, {
    "PATCH updated (200)": (r) => r.status === 200,
    "stars changed to 3": (r) => r.json("stars") === 3,
  });

  // ── DELETE → 204 No Content (success, empty body) ─────────────────
  const delRes = http.del(url, null, authHeaders);
  check(delRes, { "DELETE removed (204)": (r) => r.status === 204 });

  // ── prove it's gone — GET → 404 ───────────────────────────────────
  const goneRes = http.get(url, authHeaders);
  check(goneRes, { "resource gone (404)": (r) => r.status === 404 });
}
