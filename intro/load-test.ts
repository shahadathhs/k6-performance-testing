/**
 * LOAD TEST
 *
 * What:  ramp up to your expected normal/peak traffic, hold it there, then
 *        ramp down — the classic "can we handle a regular day?" test.
 * Why:   measures behavior under realistic expected load, not extremes.
 *        This is the profile most CI performance gates are built on.
 * Watch: p(95) latency and error rate during the HOLD phase — they should
 *        stay flat. If latency climbs while load is constant, the system
 *        is saturating (queueing, GC, pool exhaustion) below its expected
 *        peak, and soak/breakpoint tests should dig deeper.
 * Pass:  the thresholds encode that peak budget — p(95) under 500ms and
 *        under 1% failed requests. Crossing one makes k6 exit non-zero.
 */
import { sleep } from "k6";
import http from "k6/http";
import type { Options } from "k6/options";

import { BASE_URL } from "../lib/config.ts";

export const options: Options = {
  stages: [
    { duration: "10s", target: 10 }, // ramp UP to 10 VUs — gradual, realistic
    { duration: "40s", target: 10 }, // HOLD at 10 VUs — the measurement window
    { duration: "10s", target: 0 }, // ramp DOWN — let in-flight work drain
  ],
  thresholds: {
    // latency budget at expected peak: p(95) under 500ms
    http_req_duration: ["p(95)<500"],
    // under 1% of requests may fail at normal peak
    http_req_failed: ["rate<0.01"],
    // sanity: the test actually generated load (10 VUs → ~6 req/s)
    http_reqs: ["rate>4"],
  },
};

export default function (): void {
  // Same journey as the smoke test — now under concurrent load.
  http.get(`${BASE_URL}/`);
  sleep(1);
  http.get(`${BASE_URL}/api/quotes`);
  sleep(2);
  http.get(`${BASE_URL}/api/names`);
  sleep(2);
}
