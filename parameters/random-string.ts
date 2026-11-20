/**
 * RANDOM STRING — generating unique test data on the fly
 *
 * What:  `randomString(n)` from jslib builds a random alphanumeric string
 *        — perfect for unique usernames/emails per iteration.
 * Why:   stateful APIs reject duplicates: registering the same username
 *        every iteration fails after the first. Unique data per VU and
 *        per iteration lets thousands of registrations run in parallel
 *        without colliding (the __VU/__ITER globals from auth.ts are the
 *        other tool for this — randomString needs no coordination at all).
 * Watch: the logged credentials — different on every iteration — and the
 *        201 Created check on each registration.
 */
import { check } from "k6";
import http from "k6/http";

import { BASE_URL } from "../lib/config.ts";
import { randomString } from "../lib/jslib.ts";

const JSON_HEADERS = { headers: { "Content-Type": "application/json" } };

export default function (): void {
  const credentials = {
    username: `test_${randomString(8)}`, // e.g. test_yxtsloonq
    password: `secret_${randomString(8)}`,
  };

  const res = http.post(`${BASE_URL}/api/users`, JSON.stringify(credentials), JSON_HEADERS);

  console.info(`registering ${credentials.username}`);
  check(res, {
    "registered a fresh user (201)": (r) => r.status === 201,
    "got a unique id": (r) => typeof r.json("id") === "number",
  });
}
