/**
 * SOAK TEST (a.k.a. endurance test)
 *
 * What:  expected peak load sustained for a LONG time — hours, not minutes.
 * Why:   finds problems that only time exposes: memory leaks, connection
 *        pool exhaustion, log/disk growth, GC pressure, certificate/token
 *        expiry. A system can pass a load test and still die at hour six.
 * Watch: trends over time, not totals — latency slowly creeping up or
 *        error rate starting after N hours is the classic leak signature.
 *        Compare the first hour's p(95) with the last hour's.
 * ⚠️     Runs ~24h at 1000 VUs — only against the self-hosted target
 *        (default BASE_URL), never the public instance.
 */
import { sleep } from "k6";
import http from "k6/http";
import type { Options } from "k6/options";

import { BASE_URL } from "../lib/config.ts";

export const options: Options = {
  stages: [
    { duration: "5m", target: 1000 }, // gentle ramp to expected peak
    { duration: "24h", target: 1000 }, // HOLD peak for 24h — the point of the test
    { duration: "5m", target: 0 }, // ramp down
  ],
};

export default function (): void {
  http.get(`${BASE_URL}/`);
  sleep(1);
  http.get(`${BASE_URL}/api/quotes`);
  sleep(2);
  http.get(`${BASE_URL}/api/names`);
  sleep(2);
}
