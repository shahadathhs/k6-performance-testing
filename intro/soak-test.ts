import { sleep } from "k6";
import http from "k6/http";
import type { Options } from "k6/options";

import { BASE_URL } from "../lib/config.ts";

// Soak test — sustained peak load over a long window to surface memory
// leaks, connection pool exhaustion, and GC pressure.
// ⚠️ ~24 hours — run only against the self-hosted target (default BASE_URL),
// never against the public quickpizza.grafana.com instance.
export const options: Options = {
  stages: [
    { duration: "5m", target: 1000 }, // ramp up to peak
    { duration: "24h", target: 1000 }, // hold peak for 24h
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
