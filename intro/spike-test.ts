import { sleep } from "k6";
import http from "k6/http";
import type { Options } from "k6/options";

import { BASE_URL } from "../lib/config.ts";

// Spike test — sudden burst of traffic, then immediately drop, to verify
// recovery and behavior under short extremes.
// ⚠️ Extreme load — run only against the self-hosted target (default
// BASE_URL), never against the public instance.
export const options: Options = {
  stages: [
    { duration: "2m", target: 10000 }, // spike up to 10000 VUs
    { duration: "1m", target: 0 }, // immediately drop to 0
  ],
};

export default function (): void {
  http.get(`${BASE_URL}/api/quotes`);
  sleep(1);
}
