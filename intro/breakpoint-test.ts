/**
 * BREAKPOINT TEST (a.k.a. stress/limit test)
 *
 * What:  keep ramping the load higher and higher — far beyond expected
 *        traffic — until the system visibly breaks.
 * Why:   finds the ceiling: the maximum throughput the system sustains
 *        before latency explodes or errors spike. You want to find the
 *        cliff in a controlled test, not during a real traffic event.
 * Watch: the "knee" — the VU/throughput point where p(95) jumps sharply
 *        and/or http_req_failed takes off. That knee, with headroom
 *        subtracted, becomes your real capacity limit for alerting and
 *        scaling decisions.
 * ⚠️     ~2h ramping to 10000 VUs — only against the self-hosted target
 *        (default BASE_URL), never the public instance.
 */
import { sleep } from "k6";
import http from "k6/http";
import type { Options } from "k6/options";

import { BASE_URL } from "../lib/config.ts";

export const options: Options = {
  // One long steady ramp — no hold, no fancy shape. The goal is to sweep
  // load upward until something breaks, and note exactly where that was.
  stages: [{ duration: "2h", target: 10000 }],
};

// One cheap, representative request per iteration: at extreme VU counts
// the journey's length doesn't matter — the ceiling does.
export default function (): void {
  http.get(`${BASE_URL}/api/quotes`);
  sleep(1);
}
