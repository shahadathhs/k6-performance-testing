/**
 * EXTERNAL CSV — a spreadsheet as test data
 *
 * What:  same SharedArray pattern as the JSON version, but the source is
 *        CSV — parsed at init time by papaparse (jslib's remote build of
 *        the classic parser, wrapped once in lib/jslib.ts). `{ header:
 *        true }` turns the first row into object keys.
 * Why:   data teams live in spreadsheets: exports, edits, hand-offs. CSV
 *        is the interchange format; JSON is better for nested data —
 *        pick per source, the SharedArray side stays identical.
 * Watch: one log line per user in the file (single iteration — listing
 *        demo), then a random pick + login, identical to the JSON flow.
 * Course: lesson 67.
 */
import { check } from "k6";
import http from "k6/http";
import { SharedArray } from "k6/data";

import { BASE_URL } from "../lib/config.ts";
import { papaparse, randomItem } from "../lib/jslib.ts";

interface Credential {
  username: string;
  password: string;
}

const userCredentials = new SharedArray<Credential>(
  "users with credentials",
  () => papaparse.parse<Credential>(open("../data/users.csv"), { header: true }).data,
);

const JSON_HEADERS = { headers: { "Content-Type": "application/json" } };

export default function (): void {
  // the whole file, once — every username from the CSV
  userCredentials.forEach((user) => console.info(`from CSV: ${user.username}`));

  // and the usual random pick + login, exactly like the JSON version
  const user = randomItem(userCredentials);
  http.post(`${BASE_URL}/api/users`, JSON.stringify(user), JSON_HEADERS);
  const loginRes = http.post(
    `${BASE_URL}/api/users/token/login`,
    JSON.stringify(user),
    JSON_HEADERS,
  );
  check(loginRes, {
    "logged in with CSV credentials (200)": (r) => r.status === 200,
    "parsed header row into keys": () =>
      typeof userCredentials[0]?.username === "string" && userCredentials.length > 0,
  });
}
