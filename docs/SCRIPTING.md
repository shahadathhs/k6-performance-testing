# How a k6 Script Works

A k6 script looks like an ordinary TypeScript module — yet nothing in the file
ever calls `default()` or reads `options`. Those exports sit at the top level,
apparently disconnected, and k6 just… uses them. This document explains that
implicit contract, the execution lifecycle, and the mental model behind it.

## 1. The Script Contract: Exports k6 Looks For

k6 does not run your file top-to-bottom like a program. It **evaluates it as a
module**, then inspects the module's **exports** for well-known names:

| Export          | Required | Picked up by           | Purpose                                                   |
| --------------- | -------- | ---------------------- | --------------------------------------------------------- |
| `default`       | yes      | the VU scheduler       | The VU code — runs once **per iteration**                 |
| `options`       | no       | the test configuration | VUs, duration, stages, scenarios, thresholds, tags, …     |
| `setup`         | no       | the test lifecycle     | Runs **once per test** before VUs; returns shared data    |
| `teardown`      | no       | the test lifecycle     | Runs **once per test** after all VUs finish               |
| `handleSummary` | no       | the reporting stage    | Customizes the end-of-test report (JSON/HTML/file output) |

So `export const options` is "unused" **by your own code — on purpose**. It is
consumed by k6's runtime, which reads the module's exports after evaluating
your file. Think of it as an API you implement, not code you call.

## 2. Anatomy of a Script

Every region annotated with when it runs:

```ts
// ── Init code: evaluated ONCE PER VU, before any traffic ─────────────
import http from "k6/http";
import { check, sleep } from "k6";
import type { Options } from "k6/options";

const BASE_URL = __ENV.BASE_URL ?? "https://example.com"; // config read once

// Picked up by k6's test configurator — never called by your code
export const options: Options = {
  vus: 10,
  duration: "30s",
  thresholds: { http_req_duration: ["p(95)<500"] },
};

// ── Runs ONCE PER TEST, before all VUs ───────────────────────────────
export function setup() {
  const res = http.post(`${BASE_URL}/api/token`, JSON.stringify({ user: "k6" }));
  return { token: res.json("token") }; // handed to every VU below
}

// ── Runs ONCE PER ITERATION, per VU — the actual load ────────────────
export default function (data: ReturnType<typeof setup>) {
  const res = http.get(`${BASE_URL}/api/items`, {
    headers: { Authorization: `Bearer ${data.token}` },
  });
  check(res, { "status is 200": (r) => r.status === 200 });
  sleep(1); // think time — pacing is YOUR job, k6 adds none
}

// ── Runs ONCE PER TEST, after all VUs finish ─────────────────────────
export function teardown(data: ReturnType<typeof setup>) {
  // cleanup: delete test data, release sessions…
}
```

## 3. Execution Order (Lifecycle)

```
k6 run script.ts
│
1. LOAD       k6 transpiles the file (TS → JS) and validates the exports
│
2. INIT       the whole file is evaluated once per VU as VUs are allocated
│             (init code + exports — options/setup/teardown merely defined)
│
3. SETUP      setup() runs ONCE — its return value is broadcast to all VUs
│
4. ITERATE    the scheduler runs default() over and over, per VU,
│             for as long as the executor dictates (vus/duration/stages/…)
│
5. TEARDOWN   teardown() runs ONCE with the same setup data
│
6. REPORT     metrics are aggregated, thresholds evaluated,
│             summary printed (or handleSummary takes over), exit code set
```

## 4. The `default` Function

- It must be the **default export** — that is the name k6 looks up.
- It runs **once per iteration**; one VU running for 30s might execute it
  hundreds of times. Keep it lean.
- **There is no implicit think time**: k6 calls `default()` again the instant
  it returns. Without `sleep()`, one VU hammers the target as fast as it can.
- **Its return value is ignored.**
- **Each VU is an isolated JS runtime with its own copy of your module.** A
  module-level counter is _not_ a global counter — VU 3 cannot see VU 7's
  variables. Cross-VU state simply does not exist (by design; sharing state
  would falsify results).

## 5. The `options` Export

- Type it with `Options` from `k6/options` for autocomplete and safety.
- Holds the whole test plan: executors (`vus`/`duration`, `stages`,
  `scenarios`), `thresholds`, `tags`, `timeout`, `hosts`, TLS options, …
- It is read **in the init phase**, before any traffic — changing it at
  runtime does nothing.
- **Precedence** when the same option is set in several places:

  ```
  CLI flags  >  env vars (K6_*)  >  exported options  >  k6 defaults
  ```

  ```sh
  k6 run script.ts                      # uses options.vus = 10
  K6_VUS=2 k6 run script.ts             # env overrides the file
  k6 run --vus 5 script.ts              # flag overrides everything
  ```

## 6. `setup()` and `teardown()`

- Run **once per test**, not per VU — the only places for test-wide work:
  authenticate, seed data, validate the environment, clean up afterwards.
- `setup()`'s return value is passed as the argument to `default(data)` and
  `teardown(data)` — the sanctioned way to share data with every iteration
  (e.g. a login token) without re-doing the work per iteration.
- They are optional; omit both for simple scenarios.

## 7. `handleSummary()`

The end-of-test summary is itself customizable. Export `handleSummary(data)`
and you control what is reported and where it goes — the terminal, a JSON
file, an HTML file, or a remote service:

```ts
export function handleSummary(data: unknown) {
  return {
    stdout: JSON.stringify(data, null, 2), // full metric data, pretty-printed
  };
}
```

Omit it and k6 prints its standard compact summary instead.

## 8. Where Code Runs — Rules of Thumb

| Code                        | Belongs in        | Why                                   |
| --------------------------- | ----------------- | ------------------------------------- |
| Imports, config, `open()`   | init (top level)  | Evaluated once per VU, before traffic |
| Once-per-test data          | `setup()`         | Shared result, executed a single time |
| Requests, checks, thinktime | `default()`       | The actual load — runs per iteration  |
| Cleanup                     | `teardown()`      | Once, after everything                |
| Report shaping              | `handleSummary()` | Once, at reporting time               |

**Common pitfalls**

- Calling `open()` inside `default()` — it is init-only; k6 errors out.
- Expecting module-level state to aggregate across VUs — it can't (see §4).
- Doing expensive work (auth, parsing big files) in `default()` — it repeats
  every iteration; hoist it to init or `setup()`.
- Editing `options` at runtime hoping it takes effect — it's already read.
- Forgetting `sleep()` and wondering why one VU generates hundreds of req/s.

## 9. The Mental Model

k6 is a Go process that spawns one **JS runtime per VU**, each evaluating its
own copy of your module. A **scheduler** (driven by `options`) decides when
each VU runs its next iteration of `default()`. Every request a VU makes is
asynchronously fed into a **metrics pipeline**; at the end, k6 aggregates
those samples, evaluates **thresholds**, and sets the **exit code**. Your
script is not the program — it is the configuration _and_ the payload of a
load-generation engine.
