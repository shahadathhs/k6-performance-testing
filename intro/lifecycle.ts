/**
 * LIFECYCLE — init → setup → VU (iterations) → teardown, live
 *
 * What:  a runnable proof of the execution model (see docs/SCRIPTING.md):
 *        init code runs once per VU, setup() once per test, the default
 *        function once per iteration, teardown() once at the end. setup()'s
 *        return value is handed to every default(data) and teardown(data).
 * Why:   believing the order is different from seeing it: run this file
 *        and read the log lines — setup blocks ALL VUs until it returns,
 *        and its data is available to every iteration afterwards.
 * Watch: the console order. With vus=2 you'll see the init stage logged
 *        TWICE (once per VU), setup ONCE, then interleaved VU lines, then
 *        exactly one teardown at the end.
 */
import { sleep } from "k6";
import http from "k6/http";
import type { Options } from "k6/options";

import { BASE_URL } from "../lib/config.ts";

export const options: Options = {
  vus: 2,
  duration: "6s",
};

// ── INIT stage — runs once per VU (watch for multiple log lines) ──────
console.info("-- init stage --");

// ── SETUP stage — runs ONCE per test, BEFORE any VU starts iterating ──
export function setup() {
  console.info("-- setup stage --");
  // deliberately slow so you can see VUs WAIT for setup to finish
  sleep(3);
  const data = { token: "from-setup", foo: "bar" };
  return data; // broadcast to every VU's default(data) and to teardown
}

// ── VU stage — runs once per ITERATION, per VU ─────────────────────────
export default function (data: ReturnType<typeof setup>): void {
  console.info(`-- VU stage (VU ${__VU}, got token: ${data.token}) --`);
  http.get(`${BASE_URL}/ready`);
  sleep(1);
}

// ── TEARDOWN stage — runs ONCE after ALL VUs finish ────────────────────
export function teardown(data: ReturnType<typeof setup>): void {
  console.info(`-- teardown stage (token still here: ${data.token}) --`);
}
