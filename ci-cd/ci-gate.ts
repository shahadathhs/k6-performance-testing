/**
 * CI PERFORMANCE GATE — the scenario pipelines run.
 *
 * What:  a short, smoke-scale test (5 VUs · 15s) whose thresholds ARE the
 *        gate: all pass → k6 exits 0; any breach → k6 exits non-zero
 *        (99 = thresholds crossed) and the pipeline stage goes red with it.
 * Why:   CI/CD integration is exactly this contract — the pipeline only
 *        runs `k6 run ci-cd/ci-gate.ts` and reads the exit code. No
 *        parsing, no pipeline-side assertions.
 * Watch: run it with POISON=true to see the red half — every request hits
 *        a missing endpoint, http_req_failed and checks blow their budgets,
 *        and k6 exits with code 99 (all codes in ci-cd/README.md).
 */
import { check, sleep } from "k6";
import http from "k6/http";
import type { Options } from "k6/options";

import { BASE_URL } from "../lib/config.ts";

// POISON=true aims every request at a guaranteed 404 — the red half of
// the red/green demo, no target changes needed.
const POISON = __ENV.POISON === "true";

export const options: Options = {
  vus: 5,
  duration: "15s",
  thresholds: {
    // latency budget: p(95) under 500ms
    http_req_duration: ["p(95)<500"],
    // under 1% of requests may fail
    http_req_failed: ["rate<0.01"],
    // at least 99% of check assertions must pass
    checks: ["rate>=0.99"],
  },
};

export default function (): void {
  const res = http.get(`${BASE_URL}${POISON ? "/api/does-not-exist" : "/api/quotes"}`);
  check(res, { "status is 200": (r) => r.status === 200 });
  sleep(1);
}
