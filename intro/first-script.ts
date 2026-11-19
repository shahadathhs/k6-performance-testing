/**
 * FIRST SCRIPT — the smallest possible k6 test.
 *
 * Anatomy: imports (init), an exported `options` object that k6 picks up
 * automatically, and the default function that runs once per iteration.
 * See docs/SCRIPTING.md for the full execution model.
 *
 * Profile: 10 VUs running simultaneously for 10 seconds.
 * Watch:   http_reqs (~100 total) and http_req_duration — this is your
 *          baseline "hello world" against a healthy target.
 */
import { sleep } from "k6";
import http from "k6/http";
import type { Options } from "k6/options";

import { BASE_URL } from "../lib/config.ts";

// k6 reads this export before any traffic starts — your code never calls it.
export const options: Options = {
  vus: 10, // 10 virtual users iterating in parallel
  duration: "10s", // each VU loops the default function for 10s
};

// Runs once per iteration — with 10 VUs × 10s that's ~100 executions.
export default function (): void {
  http.get(`${BASE_URL}/`); // one request per iteration
  sleep(1); // think time: 1 iteration ≈ 1s, so ~10 req/s per VU
}
