/**
 * HTTP GET — the response object is more than the body
 *
 * What:  `http.get()` returns a Response object: status, headers, body,
 *        timings, error — everything a response IS. Load testing starts
 *        with reading responses properly; console logging and
 *        `--http-debug` are how you inspect them.
 * Why:   checks and thresholds are only as good as the fields you look at.
 *        Debugging a failing test = looking at status + error + body, not
 *        guessing.
 * Watch: run with `k6 run --http-debug http-requests/get.ts` to see full
 *        request/response dumps; note `res.url` after a redirect (k6
 *        follows 3xx by default — cap it with the `maxRedirects` option).
 * Course: lessons 40–45, 48 (APIs, HTTP, GET, debugging, response headers).
 */
import http from "k6/http";

import { BASE_URL } from "../lib/config.ts";

export default function (): void {
  const res = http.get(`${BASE_URL}/api/quotes`);

  // ── the Response object ──────────────────────────────────────────
  console.info(`status:  ${res.status}`); // 200 — always check this first
  console.info(`url:     ${res.url}`); // final URL — differs if redirected
  console.info(`body:    ${String(res.body).slice(0, 60)}…`); // payload
  console.info(`error:   ${res.error}`); // transport errors (DNS, timeout)
  console.info(`timing:  ${res.timings.duration}ms`); // feeds http_req_duration
  console.info(`content-type: ${res.headers["Content-Type"]}`); // response headers

  // Headers arrive in a plain object — capitalization varies by server,
  // k6 normalizes lookups, but printing them shows the real names:
  console.info(`headers: ${JSON.stringify(res.headers)}`);

  // A 404 is NOT a transport error: status speaks, error stays empty.
  const missing = http.get(`${BASE_URL}/does-not-exist`);
  console.info(`404 check — status: ${missing.status}, error: "${missing.error}"`);
}
