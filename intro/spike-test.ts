/**
 * SPIKE TEST
 *
 * What:  a sudden, extreme burst of traffic — then an immediate drop back
 *        to nothing. The opposite of a soak test: it's about seconds, not
 *        hours.
 * Why:   flash sales, ticket drops, a viral link. Verifies the system
 *        (a) survives the spike without falling over and (b) RECOVERS
 *        afterwards — queued work drains, pools refill, latency returns
 *        to baseline.
 * Watch: behavior during the spike (errors? queueing?) AND the minutes
 *        after (does latency come back down, or stay degraded?). A system
 *        that survives but never recovers still failed.
 * ⚠️     Bursts to 10000 VUs — only against the self-hosted target
 *        (default BASE_URL), never the public instance.
 */
import { sleep } from "k6";
import http from "k6/http";
import type { Options } from "k6/options";

import { BASE_URL } from "../lib/config.ts";

export const options: Options = {
  stages: [
    { duration: "2m", target: 10000 }, // spike: ramp hard to 10000 VUs
    { duration: "1m", target: 0 }, // drop: back to zero, watch recovery
  ],
};

export default function (): void {
  http.get(`${BASE_URL}/api/quotes`);
  sleep(1);
}
