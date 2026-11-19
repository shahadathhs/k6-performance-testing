/**
 * SMOKE TEST
 *
 * What:  minimal load — a single VU, short duration, walking the main paths.
 * Why:   verifies the target *works at all*. It's a sanity check, not a
 *        capacity check — run it before every bigger test; there is no point
 *        load-testing something that is already broken.
 * Watch: http_req_failed must be 0% — any failure here is a functional bug,
 *        not a performance problem. Latency should be near best-case.
 */
import { sleep } from "k6";
import http from "k6/http";
import type { Options } from "k6/options";

import { BASE_URL } from "../lib/config.ts";

export const options: Options = {
  vus: 1, // one virtual user — we want correctness, not load
  duration: "30s", // enough iterations to cover all paths below
};

export default function (): void {
  // Walk the key user journey: landing page → quotes → names.
  http.get(`${BASE_URL}/`);
  sleep(1); // think time between steps, like a real user reading
  http.get(`${BASE_URL}/api/quotes`);
  sleep(2);
  http.get(`${BASE_URL}/api/names`);
  sleep(2);
}
