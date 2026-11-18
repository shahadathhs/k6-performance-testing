import { sleep } from "k6";
import http from "k6/http";
import type { Options } from "k6/options";

import { BASE_URL } from "../lib/config.ts";

// Breakpoint test — keep ramping until the system breaks, to find the
// ceiling. Watch for the point where error rate / latency spikes.
// ⚠️ ~2 hours at extreme load — run only against the self-hosted target
// (default BASE_URL), never against the public instance.
export const options: Options = {
  stages: [{ duration: "2h", target: 10000 }],
};

export default function (): void {
  http.get(`${BASE_URL}/api/quotes`);
  sleep(1);
}
