/**
 * EXPECTED RESPONSE — separating "failed" from "deliberately unexpected"
 *
 * What:  k6 tags every request with `expected_response` — true when the
 *        status is one k6 considers a success (2xx/3xx by default). A 404
 *        is not a transport error, but it's an *unexpected* response: it
 *        counts into http_req_failed, and `http_req_duration` splits into
 *        an `{ expected_response:true }` sub-metric in the summary.
 * Why:   sometimes a non-2xx is the plan (error pages, health checks,
 *        negative tests). Slicing by expected_response — or redefining
 *        what's expected with `http.setResponseCallback(
 *        http.expectedStatuses(...))` — keeps http_req_failed meaningful
 *        instead of failing your test on purpose-built error responses.
 * Watch: the `{ expected_response:true }` block under http_req_duration,
 *        and how the 404 in the News group drives http_req_failed up while
 *        the expected-response slice stays clean.
 */
import { check, group, sleep } from "k6";
import http from "k6/http";
import type { Options } from "k6/options";

import { BASE_URL } from "../lib/config.ts";

export const options: Options = {
  vus: 2,
  duration: "8s",
  thresholds: {
    // budget for ALL requests
    http_req_duration: ["p(95)<500"],
    // budget for the expected (successful) responses only — the 404 below
    // is excluded from this slice, but included in the global one
    "http_req_duration{expected_response:true}": ["p(95)<500"],
    "group_duration{group:::Main page}": ["p(95)<500"],
    "group_duration{group:::News page}": ["p(95)<500"],
  },
};

export default function (): void {
  group("Main page", () => {
    const res = http.get(`${BASE_URL}/`);
    check(res, { "status is 200": (r) => r.status === 200 });
  });

  group("News page", () => {
    // deliberate 404 (the course used an error mock): unexpected response —
    // counts toward http_req_failed and lands OUTSIDE the
    // {expected_response:true} slice. To make such a status "expected",
    // call http.setResponseCallback(http.expectedStatuses(200, 404)) in
    // the init context.
    http.get(`${BASE_URL}/does-not-exist`);
  });

  sleep(1);
}
