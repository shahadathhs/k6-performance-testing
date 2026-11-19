/**
 * STRESS TEST
 *
 * What:  ramp load BEYOND expected peak and hold it there — the system is
 *        deliberately overloaded, but not to destruction.
 * Why:   you want to know HOW the system fails, not just that it fails:
 *        does it degrade gracefully (slower but correct, clean 429/5xx,
 *        backpressure) or catastrophically (timeouts, crashes, dropped
 *        connections)? One day real traffic will exceed capacity — stress
 *        testing is the rehearsal.
 * Watch: the failure MODE. Latency rising is fine; corrupt responses,
 *        mixed 200s/500s, or requests hanging are not. Also watch the
 *        ramp-down: a healthy system recovers when load drops.
 *
 * vs breakpoint-test.ts: stress HOLDS above peak to study behavior;
 *        breakpoint RAMPS until it breaks to find the hard ceiling.
 * vs load-test.ts: load stays AT expected peak; stress goes past it.
 * ⚠️     Overloaded target — run only against the self-hosted target
 *        (default BASE_URL), never the public instance.
 */
import { sleep } from "k6";
import http from "k6/http";
import type { Options } from "k6/options";

import { BASE_URL } from "../lib/config.ts";

export const options: Options = {
  stages: [
    { duration: "2m", target: 50 }, // ramp past expected peak (load-test used 10)
    { duration: "5m", target: 50 }, // HOLD while overloaded — study the failure mode
    { duration: "2m", target: 0 }, // ramp down — verify recovery
  ],
};

export default function (): void {
  // Full user journey — under stress, every path must stay correct.
  http.get(`${BASE_URL}/`);
  sleep(1);
  http.get(`${BASE_URL}/api/quotes`);
  sleep(2);
  http.get(`${BASE_URL}/api/names`);
  sleep(2);
}
