/**
 * ABORT — stopping a test before it starts hurting
 *
 * What:  `exec.test.abort(message)` stops the whole test run immediately,
 *        with exit code 108 ("test aborted"). Called in setup(), it can
 *        prevent a broken target from being hammered pointlessly: check
 *        the system's health FIRST; if it's down, abort instead of
 *        generating an hour of garbage metrics.
 * Why:   load testing a dead system wastes time and pollutes results (and
 *        can drown real alerting in noise). Abort early, fail loudly, with
 *        a message that says WHY.
 * Try it:
 *        k6 run intro/abort.ts                                # target up → test runs
 *        k6 run -e BASE_URL=http://localhost:9 intro/abort.ts # target down → aborts in setup
 * Watch: the abort banner and the exit code (echo $?) — 108 for aborted.
 */
import { sleep } from "k6";
import exec from "k6/execution";
import http from "k6/http";
import type { Options } from "k6/options";

import { BASE_URL } from "../lib/config.ts";

export const options: Options = {
  vus: 10,
  duration: "10s",
};

// setup() runs before any load: the gatekeeper.
export function setup(): void {
  const res = http.get(`${BASE_URL}/healthz`);

  if (res.error) {
    // transport-level failure — the target is unreachable/down
    exec.test.abort("Aborting test. Application is DOWN");
  }
}

export default function (): void {
  http.get(`${BASE_URL}/`);
  sleep(1);
}
