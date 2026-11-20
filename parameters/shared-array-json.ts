/**
 * EXTERNAL JSON — SharedArray + open(), test data outside the script
 *
 * What:  `open()` reads a file (INIT context only!) and `SharedArray`
 *        parses it ONCE and shares the read-only result across ALL VUs —
 *        without it, every VU would hold its own copy in memory.
 * Why:   credentials, URLs, payloads — bulk test data belongs in data
 *        files, not hardcoded arrays. 100 VUs × 10k users as separate
 *        per-VU copies is a memory disaster; SharedArray is one copy.
 * Watch: the login check — each iteration picks a RANDOM user from the
 *        shared file. Re-runs tolerate already-registered users
 *        (register: 201 fresh or 400 exists), then log in either way.
 * Course: lesson 66.
 */
import { check } from "k6";
import http from "k6/http";
import { SharedArray } from "k6/data";

import { BASE_URL } from "../lib/config.ts";
import { randomItem } from "../lib/jslib.ts";

interface Credential {
  username: string;
  password: string;
}

// open() only works in the INIT context; the SharedArray callback runs
// exactly once, no matter how many VUs use the result.
const userCredentials = new SharedArray<Credential>(
  "users with credentials",
  () => (JSON.parse(open("../data/users.json")) as { users: Credential[] }).users,
);

const JSON_HEADERS = { headers: { "Content-Type": "application/json" } };

export default function (): void {
  const user = randomItem(userCredentials);

  // seed the user (201 on first ever run, 400 when it already exists —
  // both fine; only the LOGIN below must succeed every time)
  http.post(`${BASE_URL}/api/users`, JSON.stringify(user), JSON_HEADERS);

  const loginRes = http.post(
    `${BASE_URL}/api/users/token/login`,
    JSON.stringify(user),
    JSON_HEADERS,
  );

  check(loginRes, {
    "logged in with file credentials (200)": (r) => r.status === 200,
    "got a token": (r) => typeof r.json("token") === "string",
  });
  console.info(`logged in as ${user.username} (from users.json)`);
}
