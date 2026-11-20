/**
 * ENVIRONMENT VARIABLES — parameterize without editing the script
 *
 * What:  `__ENV` exposes environment variables to the script. Set them
 *        with `-e` on the CLI (or plain env vars); give them `?? defaults`
 *        so the script still runs with no flags at all.
 * Why:   the same scenario must hit different targets/paths/severities
 *        without code edits — that's what makes it reusable across
 *        environments and CI jobs. This repo's `lib/config.ts` (BASE_URL)
 *        is exactly this pattern, shared by every scenario.
 * Watch: the log line echoing the effective values. Try:
 *          k6 run parameters/env-var.ts
 *          k6 run -e PATH=/api/names -e SLEEP_SECS=2 parameters/env-var.ts
 *        __ENV is read in the INIT context — once per VU, before traffic
 *        (docs/SCRIPTING.md §9); never pass secrets via -e (visible in
 *        shell history and process listings).
 * Course: lesson 62.
 */
import { check } from "k6";
import { sleep } from "k6";
import http from "k6/http";

import { BASE_URL } from "../lib/config.ts";

// each parameter: env override ?? sensible default
const PATH = __ENV.PATH_ENV ?? "/api/quotes";
const SLEEP_SECS = Number(__ENV.SLEEP_SECS ?? 1);

export default function (): void {
  const res = http.get(`${BASE_URL}${PATH}`);
  check(res, {
    "request succeeded": (r) => r.status === 200,
  });

  console.info(`effective params — BASE_URL=${BASE_URL} PATH=${PATH} SLEEP_SECS=${SLEEP_SECS}`);
  sleep(SLEEP_SECS);
}
