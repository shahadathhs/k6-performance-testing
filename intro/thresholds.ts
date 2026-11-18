import { check, sleep } from "k6";
import exec from "k6/execution";
import http from "k6/http";
import type { Options } from "k6/options";

import { BASE_URL } from "../lib/config.ts";

// Thresholds + checks — a scenario is only as good as its pass criteria.
// The test fails (non-zero exit) when any threshold is crossed, which is
// what makes k6 usable in CI.
export const options: Options = {
  vus: 10,
  duration: "10s",
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95th percentile under 500ms
    http_req_failed: ["rate<=0.02"], // ≤ 2% failed requests
    checks: ["rate>=0.98"], // ≥ 98% of checks pass
  },
};

export default function (): void {
  // exec.scenario exposes per-iteration test context — here we poison
  // exactly one iteration to see checks/thresholds in action.
  const res = http.get(
    `${BASE_URL}${exec.scenario.iterationInTest === 1 ? "/foo" : "/api/quotes"}`,
  );
  console.info(exec.scenario.iterationInTest);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "body is a quotes payload": (r) => typeof r.body === "string" && r.body.includes("quotes"),
  });
  sleep(2);
}
