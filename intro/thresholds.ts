/**
 * THRESHOLDS & CHECKS — turning a run into a pass/fail test.
 *
 * What:  checks assert each response is correct; thresholds turn metrics
 *        (including the checks rate) into pass/fail criteria. Crossing a
 *        threshold makes k6 exit non-zero — the contract CI uses.
 * Why:   without thresholds a load test is just data collection. With
 *        them, it gates releases.
 * Watch: the ✓/✗ marks next to each threshold in the summary. This script
 *        deliberately poisons iteration #1 (a request to /foo → 404) so
 *        you can watch checks fail and see how close thresholds come to
 *        failing — lower `checks` rate tolerance to see the whole test go red.
 */
import { check, sleep } from "k6";
import exec from "k6/execution";
import http from "k6/http";
import type { Options } from "k6/options";

import { BASE_URL } from "../lib/config.ts";

export const options: Options = {
  vus: 10,
  duration: "10s",
  thresholds: {
    // latency budget: p(95) under 500ms, and no single request over 1s
    http_req_duration: ["p(95)<500", "max<1000"],
    // at most 2% of requests may fail
    http_req_failed: ["rate<=0.02"],
    // sanity check that the test actually ran: >10 requests total, >4 req/s
    http_reqs: ["count>10", "rate>4"],
    // at least 98% of all check assertions must pass
    checks: ["rate>=0.98"],
    // all 10 VUs must have been active (metric value must exceed 9)
    vus: ["value>9"],
  },
};

export default function (): void {
  // exec.scenario exposes live test context — iterationInTest is the
  // zero-based iteration counter across the whole test. On iteration 1 we
  // hit /foo (which doesn't exist) to make one iteration fail its checks.
  const res = http.get(
    `${BASE_URL}${exec.scenario.iterationInTest === 1 ? "/foo" : "/api/quotes"}`,
  );
  console.info(exec.scenario.iterationInTest);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "body is a quotes payload": (r) => typeof r.body === "string" && r.body.includes("quotes"),
  });
  sleep(2);
}
