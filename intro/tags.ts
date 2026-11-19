/**
 * TAGS — labeling samples and slicing thresholds
 *
 * What:  every metric sample k6 emits carries tags. Built-in ones come for
 *        free (`status`, `method`, `url`, `name`, `expected_response`, …);
 *        you can attach custom ones at three levels: the whole test
 *        (`options.tags`), a single request (`http.get(url, { tags })`),
 *        and even individual `check()` calls or custom-metric `add()`s.
 *        Any threshold can then target a tag-filtered sub-metric:
 *        `'http_req_duration{page:quotes}'` budgets ONLY that slice.
 * Why:   a global p(95) averages everything into meaninglessness. Tags let
 *        each page/endpoint/class carry its own budget, and let a custom
 *        error Counter report per-section errors instead of one blob.
 * Watch: the per-slice ✓/✗ lines in the summary — `http_errors{page:quotes}`
 *        and `checks{page:quotes}` report independently of their untagged
 *        counterparts.
 */
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";
import http from "k6/http";
import type { Options } from "k6/options";

import { BASE_URL } from "../lib/config.ts";

// Custom Counter — incremented with a tag, so thresholds can slice it.
const httpErrors = new Counter("http_errors");

export const options: Options = {
  vus: 2,
  duration: "10s",
  thresholds: {
    // ── built-in tags slice for free — no tagging needed on your side ──
    // global budget across ALL requests
    http_req_duration: ["p(95)<500"],
    // only the 200s are held to this budget
    "http_req_duration{status:200}": ["p(95)<500"],
    // …and the 404s to a stricter one (the journey requests one below)
    "http_req_duration{status:404}": ["p(95)<300"],
    // ── custom tags — slices you define by tagging samples yourself ────
    // the same metric, sliced by a CUSTOM tag — only requests tagged
    // page=quotes are held to this stricter budget
    "http_req_duration{page:quotes}": ["p(95)<250"],
    // custom metrics slice too: zero errors overall…
    http_errors: ["count==0"],
    // …and zero errors on the quotes page specifically
    "http_errors{page:quotes}": ["count==0"],
    // same idea for checks — the untagged and tagged rates are separate
    checks: ["rate>=0.99"],
    "checks{page:quotes}": ["rate>=0.99"],
  },
};

export default function (): void {
  // Landing page — untagged, counts toward the global slices only
  let res = http.get(`${BASE_URL}/`);

  // res.error is set for transport-level failures (DNS, timeouts, resets)
  if (res.error) {
    httpErrors.add(1);
  }
  check(res, { "status is 200": (r) => r.status === 200 });

  // Quotes page — tagged per-request: its samples land in the {page:quotes} slices
  res = http.get(`${BASE_URL}/api/quotes`, {
    tags: { page: "quotes" },
  });

  if (res.error) {
    httpErrors.add(1, { page: "quotes" }); // tagged add() — slices the Counter
  }
  // check() also accepts tags as its third argument
  check(res, { "status is 200": (r) => r.status === 200 }, { page: "quotes" });

  // Built-in tags need no tagging from you — every request already carries
  // `status`, `method`, `url`, `expected_response`, … This deliberate 404
  // creates the {status:404} slice used by the built-in thresholds above
  // (and also counts toward http_req_failed — see expected-response.ts).
  http.get(`${BASE_URL}/does-not-exist`);

  sleep(1);
}
