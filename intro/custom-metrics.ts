/**
 * CUSTOM METRICS — Counter & Trend
 *
 * What:  besides the built-in metrics (http_req_duration, http_reqs, …),
 *        k6 lets you define your own. A `Counter` tracks a running total;
 *        a `Trend` tracks a series of values with full percentile stats.
 *        You `add()` to them inside the default function, and then set
 *        thresholds on them exactly like built-in metrics.
 * Why:   built-in metrics aggregate ALL requests — custom metrics isolate
 *        what you actually care about: the response time of ONE endpoint,
 *        or the count of business events (logins, checkouts). Thresholds
 *        can then target the user-facing SLO, not the average of all
 *        traffic mixed together.
 * Watch: the custom metric blocks in the end-of-test summary — the
 *        `my_counter` total and the p(95)/p(99) of the tracked endpoint.
 * Note:  custom metrics must be created in the init context (top level),
 *        never inside default() — see docs/SCRIPTING.md §8.
 */
import { sleep } from "k6";
import { Counter, Trend } from "k6/metrics";
import http from "k6/http";
import type { Options } from "k6/options";

import { BASE_URL } from "../lib/config.ts";

// Custom metrics are declared at the top level (init context) with a name
// that becomes the metric key in the summary and in thresholds below.
const myCounter = new Counter("my_counter");
const quotesPageResponseTrend = new Trend("response_time_quotes_page");

export const options: Options = {
  vus: 5,
  duration: "5s",
  thresholds: {
    // built-in metric — threshold as usual
    http_req_duration: ["p(95)<250"],
    // custom Counter — sanity check: it must have ticked more than 10 times
    my_counter: ["count>10"],
    // custom Trend — percentile budget for this ONE endpoint's timing
    response_time_quotes_page: ["p(95)<150", "p(99)<200"],
  },
};

export default function (): void {
  let res = http.get(`${BASE_URL}/`);
  myCounter.add(1); // count something meaningful — here, homepage visits
  sleep(1);

  res = http.get(`${BASE_URL}/api/quotes`);
  // feed the Trend with the raw timing (ms) of this specific request
  quotesPageResponseTrend.add(res.timings.duration);
  sleep(1);
}
