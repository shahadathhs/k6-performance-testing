/**
 * FLAG-DRIVEN LOAD — no options in the file; the CLI decides
 *
 * What:  this script deliberately ships NO vus/duration/iterations —
 *        the load profile comes entirely from CLI flags at run time.
 * Why:   the same journey often needs different shapes: a 1-VU smoke
 *        pass, a 30s burst, a 100-iteration soak of the flow. Options
 *        in the file are a DEFAULT; flags override them (precedence:
 *        CLI flags > K6_* env vars > script options — docs/SCRIPTING.md
 *        §5). A flag-driven script is the reusable end of that chain.
 * Try:
 *        k6 run cli/load-flags.ts                        # 1 VU, 1 iteration
 *        k6 run -u 5 -d 10s cli/load-flags.ts            # 5 VUs for 10s
 *        k6 run -u 5 -i 10 cli/load-flags.ts             # 10 iterations shared by 5 VUs
 *        k6 run -s 10s:10 -s 20s:10 -s 5s:0 cli/load-flags.ts   # ramp 0→10→10→0
 */
import { sleep } from "k6";
import http from "k6/http";

import { BASE_URL } from "../lib/config.ts";

export default function (): void {
  http.get(`${BASE_URL}/`);
  sleep(1);
  http.get(`${BASE_URL}/api/quotes`);
  sleep(1);
}
