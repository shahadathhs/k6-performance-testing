/**
 * RANDOM THINK TIME — jittered sleep, because users aren't metronomes
 *
 * What:  `sleep(randomIntBetween(min, max))` varies the pause between
 *        iterations instead of a constant. randomIntBetween is jslib's
 *        official helper (wrapped once in lib/jslib.ts).
 * Why:   a fixed sleep makes every VU march in lockstep — synchronized
 *        request waves (a "thundering herd") that your real users never
 *        produce. Randomized pacing spreads load naturally and surfaces
 *        behavior under burstier, realistic arrival patterns.
 * Watch: iteration_duration in the summary — it now VARIES (min ≠ max),
 *        and requests arrive without the periodic spikes a constant sleep
 *        creates.
 */
import { sleep } from "k6";
import http from "k6/http";

import { BASE_URL } from "../lib/config.ts";
import { randomIntBetween } from "../lib/jslib.ts";

export const options = {
  vus: 5,
  duration: "12s",
};

export default function (): void {
  http.get(`${BASE_URL}/`);

  // sleep between 1 and 5 seconds — a different pause every iteration
  sleep(randomIntBetween(1, 5));
}
